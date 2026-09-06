import { AppDataSource } from '../config/data-source';
import { Contract } from '../entities/Contract';
import { Employee } from '../entities/Employee';
import { WorkingSchedule } from '../entities/WorkingSchedule';
import { SalaryStructure } from '../entities/SalaryStructure';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const contractRepository = () => AppDataSource.getRepository(Contract);
const employeeRepository = () => AppDataSource.getRepository(Employee);
const workingScheduleRepository = () => AppDataSource.getRepository(WorkingSchedule);
const salaryStructureRepository = () => AppDataSource.getRepository(SalaryStructure);

export type ContractStatus = 'running' | 'expired';

export interface ContractInput {
  employeeId: string;
  startDate: string;
  endDate?: string | null;
  wagePerMonth: number;
  workingScheduleId?: string | null;
  salaryStructureId?: string | null;
  notes?: string;
}

/** Mirrors the client mock's `isPastDate`/`getContractStatus`: no end date, or an end date not yet past, is Running. */
export function computeContractStatus(endDate: string | null): ContractStatus {
  if (!endDate) return 'running';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(endDate) < today ? 'expired' : 'running';
}

function withStatus(contract: Contract) {
  return { ...contract, status: computeContractStatus(contract.endDate) };
}

async function nextContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await contractRepository()
    .createQueryBuilder('contract')
    .where('contract.contract_number LIKE :pattern', { pattern: `CON/${year}/%` })
    .getCount();
  return `CON/${year}/${String(count + 1).padStart(4, '0')}`;
}

/** Enforces "only one Running contract per employee per period." */
async function assertNoRunningConflict(employeeId: string, endDate: string | null, excludeId?: string) {
  if (computeContractStatus(endDate) !== 'running') return;

  const existing = await contractRepository().find({ where: { employeeId } });
  const conflict = existing.some((c) => c.id !== excludeId && computeContractStatus(c.endDate) === 'running');
  if (conflict) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'This employee already has a running contract. Set an end date on that one before making this one running.',
      422
    );
  }
}

export async function listContracts(
  filter?: { employeeId?: string; search?: string; status?: ContractStatus },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = contractRepository()
    .createQueryBuilder('contract')
    .leftJoin('contract.employee', 'employee')
    .orderBy('contract.startDate', 'DESC')
    .skip(pagination.skip)
    .take(pagination.take);

  if (filter?.employeeId) {
    qb.andWhere('contract.employee_id = :employeeId', { employeeId: filter.employeeId });
  }
  if (filter?.search) {
    qb.andWhere('employee.full_name ILIKE :search', { search: `%${filter.search}%` });
  }
  // Mirrors computeContractStatus: no end date, or an end date not yet past, is Running.
  if (filter?.status === 'running') {
    qb.andWhere('(contract.end_date IS NULL OR contract.end_date >= CURRENT_DATE)');
  } else if (filter?.status === 'expired') {
    qb.andWhere('contract.end_date < CURRENT_DATE');
  }

  const [contracts, total] = await qb.getManyAndCount();
  return { items: contracts.map(withStatus), meta: buildPaginationMeta(pagination, total) };
}

export async function getContract(id: string) {
  const contract = await contractRepository().findOne({ where: { id } });
  if (!contract) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Contract not found.', 404);
  }
  return withStatus(contract);
}

export async function createContract(input: ContractInput) {
  const employee = await employeeRepository().findOne({ where: { id: input.employeeId } });
  if (!employee) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Selected employee does not exist.', 404);
  }
  if (input.workingScheduleId) {
    const schedule = await workingScheduleRepository().findOne({ where: { id: input.workingScheduleId } });
    if (!schedule) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected working schedule does not exist.', 404);
  }
  if (input.salaryStructureId) {
    const structure = await salaryStructureRepository().findOne({ where: { id: input.salaryStructureId } });
    if (!structure) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected salary structure does not exist.', 404);
  }

  const endDate = input.endDate ?? null;
  await assertNoRunningConflict(input.employeeId, endDate);

  const repo = contractRepository();
  const contract = repo.create({
    contractNumber: await nextContractNumber(),
    employeeId: input.employeeId,
    department: employee.department,
    jobPosition: employee.jobPosition,
    startDate: input.startDate,
    endDate,
    wagePerMonth: input.wagePerMonth.toString(),
    workingScheduleId: input.workingScheduleId ?? null,
    salaryStructureId: input.salaryStructureId ?? null,
    notes: input.notes ?? '',
  });
  const saved = await repo.save(contract);
  return withStatus(saved);
}

export async function updateContract(
  id: string,
  input: Partial<Omit<ContractInput, 'employeeId'>>
) {
  const repo = contractRepository();
  const contract = await repo.findOne({ where: { id } });
  if (!contract) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Contract not found.', 404);
  }

  if (input.workingScheduleId !== undefined && input.workingScheduleId) {
    const schedule = await workingScheduleRepository().findOne({ where: { id: input.workingScheduleId } });
    if (!schedule) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected working schedule does not exist.', 404);
  }
  if (input.salaryStructureId !== undefined && input.salaryStructureId) {
    const structure = await salaryStructureRepository().findOne({ where: { id: input.salaryStructureId } });
    if (!structure) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected salary structure does not exist.', 404);
  }

  const nextEndDate = input.endDate !== undefined ? input.endDate : contract.endDate;
  await assertNoRunningConflict(contract.employeeId, nextEndDate, id);

  if (input.startDate !== undefined) contract.startDate = input.startDate;
  if (input.endDate !== undefined) contract.endDate = input.endDate;
  if (input.wagePerMonth !== undefined) contract.wagePerMonth = input.wagePerMonth.toString();
  if (input.workingScheduleId !== undefined) contract.workingScheduleId = input.workingScheduleId;
  if (input.salaryStructureId !== undefined) contract.salaryStructureId = input.salaryStructureId;
  if (input.notes !== undefined) contract.notes = input.notes;

  const saved = await repo.save(contract);
  return withStatus(saved);
}

export async function deleteContract(id: string) {
  const repo = contractRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Contract not found.', 404);
  }
}
