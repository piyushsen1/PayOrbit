import { AppDataSource } from '../config/data-source';
import { Payslip, PayslipStatus } from '../entities/Payslip';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { generatePayslipPdf } from '../utils/payslip-pdf';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const payslipRepository = () => AppDataSource.getRepository(Payslip);

export async function listPayslips(
  filter?: { employeeId?: string; payRunId?: string; search?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = payslipRepository()
    .createQueryBuilder('payslip')
    .leftJoinAndSelect('payslip.employee', 'employee')
    .leftJoinAndSelect('payslip.payRun', 'payRun')
    .leftJoinAndSelect('payRun.salaryStructure', 'salaryStructure')
    .orderBy('payslip.createdAt', 'DESC')
    .skip(pagination.skip)
    .take(pagination.take);

  if (filter?.employeeId) qb.andWhere('payslip.employee_id = :employeeId', { employeeId: filter.employeeId });
  if (filter?.payRunId) qb.andWhere('payslip.pay_run_id = :payRunId', { payRunId: filter.payRunId });
  if (filter?.search) qb.andWhere('employee.full_name ILIKE :search', { search: `%${filter.search}%` });

  const [items, total] = await qb.getManyAndCount();
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getPayslip(id: string) {
  const payslip = await payslipRepository().findOne({
    where: { id },
    relations: ['employee', 'payRun', 'contract', 'lines'],
    order: { lines: { sequence: 'ASC' } },
  });
  if (!payslip) throw new AppError(ErrorCodes.NOT_FOUND, 'Payslip not found.', 404);
  return payslip;
}

export async function getPayslipPdf(id: string) {
  const payslip = await getPayslip(id);
  return generatePayslipPdf(payslip);
}

export async function markPayslipPaid(id: string) {
  const repo = payslipRepository();
  const payslip = await repo.findOne({ where: { id } });
  if (!payslip) throw new AppError(ErrorCodes.NOT_FOUND, 'Payslip not found.', 404);
  if (payslip.status !== PayslipStatus.VALIDATED) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only a validated payslip can be marked paid.', 422);
  }
  payslip.status = PayslipStatus.PAID;
  return repo.save(payslip);
}
