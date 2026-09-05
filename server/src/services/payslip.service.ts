import { AppDataSource } from '../config/data-source';
import { Payslip, PayslipStatus } from '../entities/Payslip';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { generatePayslipPdf } from '../utils/payslip-pdf';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const payslipRepository = () => AppDataSource.getRepository(Payslip);

export async function listPayslips(
  filter?: { employeeId?: string; payRunId?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const [items, total] = await payslipRepository().findAndCount({
    where: {
      ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter?.payRunId ? { payRunId: filter.payRunId } : {}),
    },
    relations: ['employee', 'payRun', 'payRun.salaryStructure'],
    order: { createdAt: 'DESC' },
    skip: pagination.skip,
    take: pagination.take,
  });
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
