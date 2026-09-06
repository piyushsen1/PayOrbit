import { AppDataSource } from '../config/data-source';
import { PayRun, PayRunStatus } from '../entities/PayRun';
import { Payslip, PayslipStatus, PayslipWarningType } from '../entities/Payslip';
import { PayslipLine } from '../entities/PayslipLine';
import { SalaryStructure } from '../entities/SalaryStructure';
import { SalaryRule, SalaryRuleCategory, SalaryRuleComputationMethod } from '../entities/SalaryRule';
import { Employee } from '../entities/Employee';
import { Contract } from '../entities/Contract';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { generatePayslipPdf } from '../utils/payslip-pdf';
import { isEmailConfigured, sendPayslipEmail } from './email.service';
import { evaluateFormula, type FormulaContext } from '../utils/formula-evaluator';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

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
    .orderBy('contract.startDate', 'DESC')
    .getMany();
  return contracts[0] ?? null;
}

export async function listPayRuns(
  filter?: { search?: string; status?: PayRunStatus },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = payRunRepository()
    .createQueryBuilder('payRun')
    .leftJoinAndSelect('payRun.payslips', 'payslips')
    .orderBy('payRun.periodStart', 'DESC')
    .skip(pagination.skip)
    .take(pagination.take);

  if (filter?.status) qb.andWhere('payRun.status = :status', { status: filter.status });
  if (filter?.search) qb.andWhere('payRun.name ILIKE :search', { search: `%${filter.search}%` });

  const [payRuns, total] = await qb.getManyAndCount();
  return { items: payRuns.map(withCounts), meta: buildPaginationMeta(pagination, total) };
}

export async function getPayRun(id: string) {
  const payRun = await payRunRepository().findOne({
    where: { id },
    relations: ['payslips', 'payslips.employee', 'salaryStructure'],
  });
  if (!payRun) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
  return payRun;
}

export async function createPayRun(input: CreatePayRunInput) {
  if (input.periodEnd < input.periodStart) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Period end cannot be before period start.', 422);
  }
  if (input.employeeIds.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Select at least one employee.', 422);
  }
  const uniqueEmployeeIds = new Set(input.employeeIds);
  if (uniqueEmployeeIds.size !== input.employeeIds.length) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Each employee can only be selected once for a pay run.', 422);
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

interface Warning {
  type: PayslipWarningType;
  message: string;
}

interface RuleEvaluation {
  rule: SalaryRule;
  amount: number;
  warning?: Warning;
}

function evaluateRule(rule: SalaryRule, wagePerMonth: number, ctx: FormulaContext): RuleEvaluation {
  switch (rule.computationMethod) {
    case SalaryRuleComputationMethod.FIXED:
      return { rule, amount: Number(rule.value ?? 0) };
    case SalaryRuleComputationMethod.PERCENTAGE:
      return { rule, amount: Number(((wagePerMonth * Number(rule.value ?? 0)) / 100).toFixed(2)) };
    case SalaryRuleComputationMethod.FORMULA:
      try {
        const amount = evaluateFormula(rule.formula ?? '', ctx);
        if (!Number.isFinite(amount)) throw new Error('formula did not evaluate to a finite number');
        return { rule, amount: Number(amount.toFixed(2)) };
      } catch (err) {
        return {
          rule,
          amount: 0,
          warning: {
            type: PayslipWarningType.FORMULA_ERROR,
            message: `Formula for rule "${rule.name}" could not be evaluated (${
              err instanceof Error ? err.message : 'unknown error'
            }) — treated as 0.`,
          },
        };
      }
  }
}

/** Applies the accumulated warnings to a payslip: joined text in `warning`, discrete codes in `warningTypes`. */
function applyWarnings(payslip: Payslip, warnings: Warning[]) {
  payslip.warning = warnings.length ? warnings.map((w) => w.message).join(' ') : null;
  payslip.warningTypes = warnings.length ? warnings.map((w) => w.type) : null;
}

/** Recomputes one payslip's lines/totals in place from its resolved contract + the pay run's salary structure rules. */
async function computeOnePayslip(payslip: Payslip, rules: SalaryRule[], periodStart: string, periodEnd: string) {
  const warnings: Warning[] = [];

  const employee = await employeeRepository().findOne({ where: { id: payslip.employeeId } });
  if (!employee?.bankAccountNumber) {
    warnings.push({ type: PayslipWarningType.MISSING_BANK_DETAILS, message: 'Missing bank details for this employee.' });
  }

  if (!payslip.contractId) {
    payslip.workedDays = '0';
    payslip.basic = '0';
    payslip.grossTotal = '0';
    payslip.netTotal = '0';
    warnings.unshift({
      type: PayslipWarningType.NO_ACTIVE_CONTRACT,
      message: 'No active contract found for this employee covering this period.',
    });
    applyWarnings(payslip, warnings);
    await payslipLineRepository().delete({ payslipId: payslip.id });
    return payslip;
  }

  const contract = await contractRepository().findOne({ where: { id: payslip.contractId } });
  if (!contract) {
    warnings.unshift({
      type: PayslipWarningType.CONTRACT_DELETED,
      message: 'The contract linked to this payslip no longer exists.',
    });
    applyWarnings(payslip, warnings);
    payslip.workedDays = '0';
    payslip.basic = '0';
    payslip.grossTotal = '0';
    payslip.netTotal = '0';
    await payslipLineRepository().delete({ payslipId: payslip.id });
    return payslip;
  }

  const workedDaysInPeriod = await attendanceRepository()
    .createQueryBuilder('attendance')
    .where('attendance.employee_id = :employeeId', { employeeId: payslip.employeeId })
    .andWhere('attendance.status IN (:...statuses)', { statuses: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] })
    .andWhere('attendance.date BETWEEN :periodStart AND :periodEnd', { periodStart, periodEnd })
    .getCount();
  if (workedDaysInPeriod === 0) {
    warnings.push({ type: PayslipWarningType.NO_ATTENDANCE, message: 'No attendance records found for this period.' });
  }

  const wagePerMonth = Number(contract.wagePerMonth);
  const ctx: FormulaContext = {
    categories: {},
    codes: {},
    variables: { wage: wagePerMonth, workedDays: workedDaysInPeriod },
  };
  const evaluations: RuleEvaluation[] = [];
  for (const rule of rules) {
    const evaluation = evaluateRule(rule, wagePerMonth, ctx);
    evaluations.push(evaluation);
    ctx.codes[rule.code] = evaluation.amount;
    ctx.categories[rule.category] = (ctx.categories[rule.category] ?? 0) + evaluation.amount;
  }
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
  applyWarnings(payslip, warnings);

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

/** Emails each payslip's PDF to its employee's work email. Fails fast if SMTP isn't configured, before sending any. */
export async function sendPayslipsForPayRun(id: string) {
  if (!isEmailConfigured()) {
    throw new AppError(
      ErrorCodes.EMAIL_NOT_CONFIGURED,
      'Email sending is not configured (SMTP_HOST is unset) — set SMTP_* env vars to enable bulk payslip emails.',
      422
    );
  }

  const payRun = await payRunRepository().findOne({
    where: { id },
    relations: ['payslips', 'payslips.employee', 'payslips.lines', 'payslips.contract'],
  });
  if (!payRun) throw new AppError(ErrorCodes.NOT_FOUND, 'Pay run not found.', 404);
  if (payRun.payslips.some((p) => p.basic === null)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Compute all payslips before sending them.', 422);
  }

  let sent = 0;
  const failures: Array<{ employeeId: string; error: string }> = [];
  for (const payslip of payRun.payslips) {
    const employee = payslip.employee;
    try {
      const pdf = await generatePayslipPdf({ ...payslip, payRun });
      await sendPayslipEmail(
        employee.workEmail,
        `Payslip — ${payRun.name}`,
        `Hi ${employee.fullName}, your payslip for ${payRun.name} is attached.`,
        pdf,
        `payslip-${payRun.name.replace(/\s+/g, '-')}-${employee.fullName.replace(/\s+/g, '-')}.pdf`
      );
      sent += 1;
    } catch (err) {
      failures.push({ employeeId: employee.id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return { sent, failed: failures.length, failures };
}
