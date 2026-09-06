import { AppDataSource } from '../config/data-source';
import { TimeOffRequest, TimeOffRequestStatus } from '../entities/TimeOffRequest';
import { Employee } from '../entities/Employee';
import { TimeOffType } from '../entities/TimeOffType';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { computeTaken, listApprovedAllocationsForEmployeeAndType, getAllocationEntity } from './time-off-allocation.service';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const requestRepository = () => AppDataSource.getRepository(TimeOffRequest);
const employeeRepository = () => AppDataSource.getRepository(Employee);
const timeOffTypeRepository = () => AppDataSource.getRepository(TimeOffType);

export interface TimeOffRequestInput {
  employeeId: string;
  timeOffTypeId: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason?: string | null;
}

/** Finds the earliest approved allocation for this employee/type with enough remaining balance for `duration`. */
async function resolveAllocation(employeeId: string, timeOffTypeId: string, duration: number, excludeRequestId?: string) {
  const allocations = await listApprovedAllocationsForEmployeeAndType(employeeId, timeOffTypeId);
  for (const allocation of allocations) {
    const taken = await computeTaken(allocation.id, excludeRequestId);
    const remaining = Number(allocation.allocated) - taken;
    if (remaining >= duration) return allocation;
  }
  return null;
}

export async function listRequests(
  filter?: { employeeId?: string; status?: TimeOffRequestStatus; search?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = requestRepository()
    .createQueryBuilder('request')
    .leftJoinAndSelect('request.employee', 'employee')
    .leftJoinAndSelect('request.timeOffType', 'timeOffType')
    .orderBy('request.createdAt', 'DESC')
    .skip(pagination.skip)
    .take(pagination.take);

  if (filter?.employeeId) qb.andWhere('request.employee_id = :employeeId', { employeeId: filter.employeeId });
  if (filter?.status) qb.andWhere('request.status = :status', { status: filter.status });
  if (filter?.search) qb.andWhere('employee.full_name ILIKE :search', { search: `%${filter.search}%` });

  const [items, total] = await qb.getManyAndCount();
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getRequest(id: string) {
  const request = await requestRepository().findOne({ where: { id }, relations: ['employee', 'timeOffType', 'allocation'] });
  if (!request) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off request not found.', 404);
  return request;
}

export async function createRequest(input: TimeOffRequestInput) {
  const employee = await employeeRepository().findOne({ where: { id: input.employeeId } });
  if (!employee) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected employee does not exist.', 404);
  const type = await timeOffTypeRepository().findOne({ where: { id: input.timeOffTypeId } });
  if (!type) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected time off type does not exist.', 404);
  if (input.endDate < input.startDate) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'End date cannot be before start date.', 422);
  }

  let allocationId: string | null = null;
  if (type.allocationRequired) {
    const allocation = await resolveAllocation(input.employeeId, input.timeOffTypeId, input.duration);
    if (!allocation) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'No approved leave balance covers this request — check the employee has an approved allocation with enough remaining days.',
        422
      );
    }
    allocationId = allocation.id;
  }

  const repo = requestRepository();
  const request = repo.create({
    employeeId: input.employeeId,
    timeOffTypeId: input.timeOffTypeId,
    allocationId,
    startDate: input.startDate,
    endDate: input.endDate,
    duration: input.duration.toString(),
    reason: input.reason ?? null,
  });
  return repo.save(request);
}

export async function updateRequest(id: string, input: Partial<Omit<TimeOffRequestInput, 'employeeId'>>) {
  const repo = requestRepository();
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off request not found.', 404);
  if (request.status !== TimeOffRequestStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only pending requests can be edited.', 422);
  }

  const timeOffTypeId = input.timeOffTypeId ?? request.timeOffTypeId;
  const duration = input.duration ?? Number(request.duration);
  const startDate = input.startDate ?? request.startDate;
  const endDate = input.endDate ?? request.endDate;
  if (endDate < startDate) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'End date cannot be before start date.', 422);
  }

  const type = await timeOffTypeRepository().findOne({ where: { id: timeOffTypeId } });
  if (!type) throw new AppError(ErrorCodes.NOT_FOUND, 'Selected time off type does not exist.', 404);

  let allocationId: string | null = request.allocationId;
  if (type.allocationRequired) {
    const allocation = await resolveAllocation(request.employeeId, timeOffTypeId, duration, id);
    if (!allocation) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No approved leave balance covers this request.', 422);
    }
    allocationId = allocation.id;
  } else {
    allocationId = null;
  }

  request.timeOffTypeId = timeOffTypeId;
  request.allocationId = allocationId;
  request.startDate = startDate;
  request.endDate = endDate;
  request.duration = duration.toString();
  if (input.reason !== undefined) request.reason = input.reason;

  return repo.save(request);
}

export async function deleteRequest(id: string) {
  const repo = requestRepository();
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off request not found.', 404);
  if (request.status !== TimeOffRequestStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only pending requests can be cancelled.', 422);
  }
  await repo.delete(id);
}

async function setRequestDecision(id: string, status: TimeOffRequestStatus, approverId: string) {
  const repo = requestRepository();
  const request = await repo.findOne({ where: { id } });
  if (!request) throw new AppError(ErrorCodes.NOT_FOUND, 'Time off request not found.', 404);
  if (request.status !== TimeOffRequestStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'This request has already been decided.', 422);
  }

  if (status === TimeOffRequestStatus.APPROVED && request.allocationId) {
    const allocation = await getAllocationEntity(request.allocationId);
    if (!allocation) throw new AppError(ErrorCodes.NOT_FOUND, 'Linked allocation no longer exists.', 404);
    const taken = await computeTaken(allocation.id, id);
    const remaining = Number(allocation.allocated) - taken;
    if (remaining < Number(request.duration)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Approving this would exceed the allocation\'s remaining balance — it may have been drawn down by other approvals since this request was made.',
        422
      );
    }
  }

  request.status = status;
  request.approverId = approverId;
  return repo.save(request);
}

export function approveRequest(id: string, approverId: string) {
  return setRequestDecision(id, TimeOffRequestStatus.APPROVED, approverId);
}

export function refuseRequest(id: string, approverId: string) {
  return setRequestDecision(id, TimeOffRequestStatus.REFUSED, approverId);
}
