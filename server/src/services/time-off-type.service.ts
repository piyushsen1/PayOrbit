import { AppDataSource } from '../config/data-source';
import { TimeOffType, TimeOffTypeStatus, TimeOffUnit } from '../entities/TimeOffType';
import { UserRole } from '../entities/User';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const timeOffTypeRepository = () => AppDataSource.getRepository(TimeOffType);

export interface TimeOffTypeInput {
  name: string;
  unit: TimeOffUnit;
  allocationRequired?: boolean;
  approvalRole: UserRole;
  affectsPayroll?: boolean;
  color?: string | null;
  status?: TimeOffTypeStatus;
  notes?: string | null;
}

export async function listTimeOffTypes(pagination: PaginationParams = parsePagination({})) {
  const [items, total] = await timeOffTypeRepository().findAndCount({
    order: { name: 'ASC' },
    skip: pagination.skip,
    take: pagination.take,
  });
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getTimeOffType(id: string) {
  const type = await timeOffTypeRepository().findOne({ where: { id } });
  if (!type) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Time off type not found.', 404);
  }
  return type;
}

export async function createTimeOffType(input: TimeOffTypeInput) {
  const repo = timeOffTypeRepository();
  const type = repo.create({
    name: input.name,
    unit: input.unit,
    allocationRequired: input.allocationRequired ?? true,
    approvalRole: input.approvalRole,
    affectsPayroll: input.affectsPayroll ?? true,
    color: input.color ?? null,
    status: input.status ?? TimeOffTypeStatus.ACTIVE,
    notes: input.notes ?? null,
  });
  return repo.save(type);
}

export async function updateTimeOffType(id: string, input: Partial<TimeOffTypeInput>) {
  const repo = timeOffTypeRepository();
  const type = await repo.findOne({ where: { id } });
  if (!type) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Time off type not found.', 404);
  }

  if (input.name !== undefined) type.name = input.name;
  if (input.unit !== undefined) type.unit = input.unit;
  if (input.allocationRequired !== undefined) type.allocationRequired = input.allocationRequired;
  if (input.approvalRole !== undefined) type.approvalRole = input.approvalRole;
  if (input.affectsPayroll !== undefined) type.affectsPayroll = input.affectsPayroll;
  if (input.color !== undefined) type.color = input.color;
  if (input.status !== undefined) type.status = input.status;
  if (input.notes !== undefined) type.notes = input.notes;

  return repo.save(type);
}

export async function deleteTimeOffType(id: string) {
  const repo = timeOffTypeRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Time off type not found.', 404);
  }
}
