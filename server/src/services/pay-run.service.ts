import { AppDataSource } from '../config/data-source';
import { PayRun, PayRunStatus } from '../entities/PayRun';
import { Payslip, PayslipStatus } from '../entities/Payslip';
import { PayslipLine } from '../entities/PayslipLine';
import { SalaryStructure } from '../entities/SalaryStructure';
import { SalaryRule, SalaryRuleCategory, SalaryRuleComputationMethod } from '../entities/SalaryRule';
import { Employee } from '../entities/Employee';
import { Contract } from '../entities/Contract';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';

const payRunRepository = () => AppDataSource.getRepository(PayRun);
const payslipRepository = () => AppDataSource.getRepository(Payslip);
const payslipLineRepository = () => AppDataSource.getRepository(PayslipLine);
const salaryStructureRepository = () => AppDataSource.getRepository(SalaryStructure);
const employeeRepository = () => AppDataSource.getRepository(Employee);
const contractRepository = () => AppDataSource.getRepository(Contract);
const attendanceRepository = () => AppDataSource.getRepository(Attendance);

export interface CreatePayRunInput {
  name: string;
  salaryStructureId: string;
  periodStart: string;
  periodEnd: string;
  employeeIds: string[];
}

function withCounts(payRun: PayRun) {
  const { payslips, ...rest } = payRun;
  return {
    ...rest,
    employeeCount: payslips.length,
    warningCount: payslips.filter((p) => !!p.warning).length,
  };
}

/** The contract overlapping the period whose start is latest — i.e. the most-recently-effective one for this period. */
async function resolveApplicableContract(employeeId: string, periodStart: string, periodEnd: string) {
  const contracts = await contractRepository()
    .createQueryBuilder('contract')
    .where('contract.employee_id = :employeeId', { employeeId })
    .andWhere('contract.start_date <= :periodEnd', { periodEnd })
    .andWhere('(contract.end_date IS NULL OR contract.end_date >= :periodStart)', { periodStart })
    .orderBy('contract.start_date', 'DESC')
    .getMany();
  return contracts[0] ?? null;
}

export async function listPayRuns() {
  const payRuns = await payRunRepository().find({ relations: ['payslips'], order: { periodStart: 'DESC' } });
  return payRuns.map(withCounts);
}

export async function getPayRun(id: string) {
  const payRun = await payRunRepository().findOne({
    where: { id },
    relations: ['payslips', 'payslips.employee', 'salaryStructure'],
  });
  if (!payRun) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
  return withCounts(payRun);
}

export async function createPayRun(input: CreatePayRunInput) {
  if (input.periodEnd < input.periodStart) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Period end cannot be before period start.', 422);
  }
  if (input.employeeIds.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Select at least one employee.', 422);
  }
  const structure = await salaryStructureRepository().findOne({ where: { id: input.salaryStructureId } });
  if (!structure) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected salary structure does not exist.', 404);

  const employees = await employeeRepository().find({ where: input.employeeIds.map((id) => ({ id })) });
  if (employees.length !== input.employeeIds.length) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'One or more selected employees do not exist.', 404);
  }

  const payRunRepo = payRunRepository();
  const payRun = await payRunRepo.save(
    payRunRepo.create({
      name: input.name,
      salaryStructureId: input.salaryStructureId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    })
  );

  const payslipRepo = payslipRepository();
  const payslips = await Promise.all(
    employees.map(async (employee) => {
      const contract = await resolveApplicableContract(employee.id, input.periodStart, input.periodEnd);
      return payslipRepo.create({
        payRunId: payRun.id,
        employeeId: employee.id,
        contractId: contract?.id ?? null,
      });
    })
  );
  await payslipRepo.save(payslips);

  return getPayRun(payRun.id);
}

export async function deletePayRun(id: string) {
  const result = await payRunRepository().delete(id);
  if (!result.affected) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
}

interface RuleEvaluation {
  rule: SalaryRule;
  amount: number;
  warning?: string;
}

function evaluateRule(rule: SalaryRule, wagePerMonth: number): RuleEvaluation {
  switch (rule.computationMethod) {
    case SalaryRuleComputationMethod.FIXED:
      return { rule, amount: Number(rule.value ?? 0) };
    case SalaryRuleComputationMethod.PERCENTAGE:
      return { rule, amount: Number(((wagePerMonth * Number(rule.value ?? 0)) / 100).toFixed(2)) };
    case SalaryRuleComputationMethod.FORMULA:
      return {
        rule,
        amount: 0,
        warning: `Formula-based rule "${rule.name}" is not supported yet — treated as 0.`,
      };
  }
}

/** Recomputes one payslip's lines/totals in place from its resolved contract + the pay run's salary structure rules. */
async function computeOnePayslip(payslip: Payslip, rules: SalaryRule[], periodStart: string, periodEnd: string) {
  const warnings: string[] = [];

  if (!payslip.contractId) {
    payslip.workedDays = '0';
    payslip.basic = '0';
    payslip.grossTotal = '0';
    payslip.netTotal = '0';
    payslip.warning = 'No active contract found for this employee covering this period.';
    await payslipLineRepository().delete({ payslipId: payslip.id });
    return payslip;
  }

  const contract = await contractRepository().findOne({ where: { id: payslip.contractId } });
  if (!contract) {
    payslip.warning = 'The contract linked to this payslip no longer exists.';
    payslip.workedDays = '0';
    payslip.basic = '0';
    payslip.grossTotal = '0';
    payslip.netTotal = '0';
    await payslipLineRepository().delete({ payslipId: payslip.id });
    return payslip;
  }

  const workedDays = await attendanceRepository().count({
    where: {
      employeeId: payslip.employeeId,
      status: AttendanceStatus.PRESENT,
    },
  });
  const workedDaysInPeriod = await attendanceRepository()
    .createQueryBuilder('attendance')
    .where('attendance.employee_id = :employeeId', { employeeId: payslip.employeeId })
    .andWhere('attendance.status = :status', { status: AttendanceStatus.PRESENT })
    .andWhere('attendance.date BETWEEN :periodStart AND :periodEnd', { periodStart, periodEnd })
    .getCount();
  void workedDays;
  if (workedDaysInPeriod === 0) {
    warnings.push('No attendance records found for this period.');
  }

  const wagePerMonth = Number(contract.wagePerMonth);
  const evaluations = rules.map((rule) => evaluateRule(rule, wagePerMonth));
  evaluations.forEach((e) => e.warning && warnings.push(e.warning));

  const sum = (category: SalaryRuleCategory) =>
    evaluations.filter((e) => e.rule.category === category).reduce((acc, e) => acc + e.amount, 0);

  const basicTotal = sum(SalaryRuleCategory.BASIC);
  const allowanceTotal = sum(SalaryRuleCategory.ALLOWANCE);
  const deductionTotal = sum(SalaryRuleCategory.DEDUCTION);
  const grossExtra = sum(SalaryRuleCategory.GROSS);
  const netExtra = sum(SalaryRuleCategory.NET);
  const gross = basicTotal + allowanceTotal + grossExtra;
  const net = gross - deductionTotal + netExtra;

  await payslipLineRepository().delete({ payslipId: payslip.id });
  const lines = evaluations.map((e) =>
    payslipLineRepository().create({
      payslipId: payslip.id,
      salaryRuleId: e.rule.id,
      name: e.rule.name,
      code: e.rule.code,
      category: e.rule.category,
      sequence: e.rule.sequence,
      amount: e.amount.toString(),
    })
  );
  await payslipLineRepository().save(lines);

  payslip.workedDays = workedDaysInPeriod.toString();
  payslip.basic = basicTotal.toFixed(2);
  payslip.grossTotal = gross.toFixed(2);
  payslip.netTotal = net.toFixed(2);
  payslip.warning = warnings.length ? warnings.join(' ') : null;

  return payslip;
}

export async function computePayRun(id: string) {
  const payRun = await payRunRepository().findOne({ where: { id }, relations: ['payslips'] });
  if (!payRun) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
  if (payRun.status !== PayRunStatus.DRAFT) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only draft pay runs can be (re)computed.', 422);
  }

  const structure = await salaryStructureRepository().findOne({ where: { id: payRun.salaryStructureId } });
  if (!structure) throw new AppError(ErrorCodes.NOT_FOUND, 'Salary structure not found.', 404);
  const rules = await AppDataSource.getRepository(SalaryRule).find({
    where: { salaryStructureId: structure.id },
    order: { sequence: 'ASC' },
  });

  const payslipRepo = payslipRepository();
  for (const payslip of payRun.payslips) {
    await computeOnePayslip(payslip, rules, payRun.periodStart, payRun.periodEnd);
    await payslipRepo.save(payslip);
  }

  return getPayRun(id);
}

export async function validatePayRun(id: string) {
  const payRun = await payRunRepository().findOne({ where: { id }, relations: ['payslips'] });
  if (!payRun) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
  if (payRun.status !== PayRunStatus.DRAFT) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only draft pay runs can be validated.', 422);
  }
  if (payRun.payslips.some((p) => p.basic === null)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Compute all payslips before validating.', 422);
  }

  payRun.status = PayRunStatus.VALIDATED;
  await payRunRepository().save(payRun);
  await payslipRepository().update({ payRunId: id }, { status: PayslipStatus.VALIDATED });

  return getPayRun(id);
}

export async function markPayRunPaid(id: string) {
  const payRun = await payRunRepository().findOne({ where: { id } });
  if (!payRun) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
  if (payRun.status !== PayRunStatus.VALIDATED) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only validated pay runs can be marked paid.', 422);
  }

  payRun.status = PayRunStatus.PAID;
  await payRunRepository().save(payRun);
  await payslipRepository().update({ payRunId: id }, { status: PayslipStatus.PAID });

  return getPayRun(id);
}
