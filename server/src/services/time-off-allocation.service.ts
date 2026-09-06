import { AppDataSource } from '../config/data-source';
import { TimeOffAllocation, TimeOffAllocationStatus } from '../entities/TimeOffAllocation';
import { TimeOffRequest, TimeOffRequestStatus } from '../entities/TimeOffRequest';
import { Employee } from '../entities/Employee';
import { TimeOffType } from '../entities/TimeOffType';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const allocationRepository = () => AppDataSource.getRepository(TimeOffAllocation);
const requestRepository = () => AppDataSource.getRepository(TimeOffRequest);
const employeeRepository = () => AppDataSource.getRepository(Employee);
const timeOffTypeRepository = () => AppDataSource.getRepository(TimeOffType);

export interface TimeOffAllocationInput {
  employeeId: string;
  timeOffTypeId: string;
  allocated: number;
  validFrom?: string | null;
  validTo?: string | null;
  description?: string | null;
}

/**
 * Sum of durations from approved Requests linked to this allocation. Derived,
 * not stored — see entity doc comment. `excludeRequestId` lets a request being
 * approved/edited check the balance without counting its own (not-yet-committed) row.
 */
export async function computeTaken(allocationId: string, excludeRequestId?: string): Promise<number> {
  const qb = requestRepository()
    .createQueryBuilder('request')
    .select('COALESCE(SUM(request.duration), 0)', 'sum')
    .where('request.allocation_id = :allocationId', { allocationId })
    .andWhere('request.status = :status', { status: TimeOffRequestStatus.APPROVED });
  if (excludeRequestId) {
    qb.andWhere('request.id != :excludeRequestId', { excludeRequestId });
  }
  const result = await qb.getRawOne<{ sum: string }>();
  return Number(result?.sum ?? 0);
}

async function withBalance(allocation: TimeOffAllocation) {
  const taken = await computeTaken(allocation.id);
  const allocated = Number(allocation.allocated);
  return { ...allocation, taken, remaining: Number((allocated - taken).toFixed(2)) };
}

/** One grouped-SUM query for every allocation on the page, instead of one query per row. */
async function computeTakenBatch(allocationIds: string[]): Promise<Map<string, number>> {
  if (allocationIds.length === 0) return new Map();
  const rows = await requestRepository()
    .createQueryBuilder('request')
    .select('request.allocation_id', 'allocationId')
    .addSelect('COALESCE(SUM(request.duration), 0)', 'sum')
    .where('request.allocation_id IN (:...allocationIds)', { allocationIds })
    .andWhere('request.status = :status', { status: TimeOffRequestStatus.APPROVED })
    .groupBy('request.allocation_id')
    .getRawMany<{ allocationId: string; sum: string }>();
  return new Map(rows.map((r) => [r.allocationId, Number(r.sum)]));
}

function withBalanceBatch(allocation: TimeOffAllocation, takenMap: Map<string, number>) {
  const taken = takenMap.get(allocation.id) ?? 0;
  const allocated = Number(allocation.allocated);
  return { ...allocation, taken, remaining: Number((allocated - taken).toFixed(2)) };
}

export async function listAllocations(
  filter?: { employeeId?: string; status?: TimeOffAllocationStatus; search?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = allocationRepository()
    .createQueryBuilder('allocation')
    .leftJoinAndSelect('allocation.employee', 'employee')
    .leftJoinAndSelect('allocation.timeOffType', 'timeOffType')
    .orderBy('allocation.createdAt', 'DESC')
    .skip(pagination.skip)
    .take(pagination.take);

  if (filter?.employeeId) qb.andWhere('allocation.employee_id = :employeeId', { employeeId: filter.employeeId });
  if (filter?.status) qb.andWhere('allocation.status = :status', { status: filter.status });
  if (filter?.search) {
    qb.andWhere('(employee.full_name ILIKE :search OR timeOffType.name ILIKE :search)', {
      search: `%${filter.search}%`,
    });
  }

  const [allocations, total] = await qb.getManyAndCount();
  const takenMap = await computeTakenBatch(allocations.map((a) => a.id));
  const items = allocations.map((a) => withBalanceBatch(a, takenMap));
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getAllocation(id: string) {
  const allocation = await allocationRepository().findOne({ where: { id }, relations: ['employee', 'timeOffType'] });
  if (!allocation) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Time off allocation not found.', 404);
  }
  return withBalance(allocation);
}

/** Raw entity, no relations/balance — used internally by the Request service to check availability. */
export async function getAllocationEntity(id: string) {
  return allocationRepository().findOne({ where: { id } });
}

export async function listApprovedAllocationsForEmployeeAndType(employeeId: string, timeOffTypeId: string) {
  return allocationRepository().find({
    where: { employeeId, timeOffTypeId, status: TimeOffAllocationStatus.APPROVED },
    order: { validFrom: 'ASC' },
  });
}

export async function createAllocation(input: TimeOffAllocationInput) {
  const employee = await employeeRepository().findOne({ where: { id: input.employeeId } });
  if (!employee) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected employee does not exist.', 404);
  const type = await timeOffTypeRepository().findOne({ where: { id: input.timeOffTypeId } });
  if (!type) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected time off type does not exist.', 404);

  const repo = allocationRepository();
  const allocation = repo.create({
    employeeId: input.employeeId,
    timeOffTypeId: input.timeOffTypeId,
    allocated: input.allocated.toString(),
    validFrom: input.validFrom ?? null,
    validTo: input.validTo ?? null,
    description: input.description ?? null,
  });
  const saved = await repo.save(allocation);
  return withBalance(saved);
}

export async function updateAllocation(id: string, input: Partial<Omit<TimeOffAllocationInput, 'employeeId' | 'timeOffTypeId'>>) {
  const repo = allocationRepository();
  const allocation = await repo.findOne({ where: { id } });
  if (!allocation) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off allocation not found.', 404);

  if (input.allocated !== undefined) allocation.allocated = input.allocated.toString();
  if (input.validFrom !== undefined) allocation.validFrom = input.validFrom;
  if (input.validTo !== undefined) allocation.validTo = input.validTo;
  if (input.description !== undefined) allocation.description = input.description;

  const saved = await repo.save(allocation);
  return withBalance(saved);
}

export async function deleteAllocation(id: string) {
  const repo = allocationRepository();
  const result = await repo.delete(id);
  if (!result.affected) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off allocation not found.', 404);
}

async function setAllocationDecision(id: string, status: TimeOffAllocationStatus, approverId: string) {
  const repo = allocationRepository();
  const allocation = await repo.findOne({ where: { id } });
  if (!allocation) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off allocation not found.', 404);
  if (allocation.status !== TimeOffAllocationStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'This allocation has already been decided.', 422);
  }
  allocation.status = status;
  allocation.approverId = approverId;
  const saved = await repo.save(allocation);
  return withBalance(saved);
}

export function approveAllocation(id: string, approverId: string) {
  return setAllocationDecision(id, TimeOffAllocationStatus.APPROVED, approverId);
}

export function refuseAllocation(id: string, approverId: string) {
  return setAllocationDecision(id, TimeOffAllocationStatus.REFUSED, approverId);
}
