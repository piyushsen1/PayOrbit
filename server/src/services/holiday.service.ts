import { AppDataSource } from '../config/data-source';
import { Holiday } from '../entities/Holiday';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const holidayRepository = () => AppDataSource.getRepository(Holiday);

export interface HolidayInput {
  name: string;
  date: string;
  recurring?: boolean;
  notes?: string | null;
}

export async function listHolidays(
  filter?: { year?: number; search?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = holidayRepository().createQueryBuilder('holiday').orderBy('holiday.date', 'ASC');
  if (filter?.year) {
    qb.andWhere('(EXTRACT(YEAR FROM holiday.date) = :year OR holiday.recurring = true)', { year: filter.year });
  }
  if (filter?.search) {
    qb.andWhere('holiday.name ILIKE :search', { search: `%${filter.search}%` });
  }
  qb.skip(pagination.skip).take(pagination.take);
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getHoliday(id: string) {
  const holiday = await holidayRepository().findOne({ where: { id } });
  if (!holiday) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Holiday not found.', 404);
  }
  return holiday;
}

export async function createHoliday(input: HolidayInput) {
  const repo = holidayRepository();
  const holiday = repo.create({
    name: input.name,
    date: input.date,
    recurring: input.recurring ?? false,
    notes: input.notes ?? null,
  });
  return repo.save(holiday);
}

export async function updateHoliday(id: string, input: Partial<HolidayInput>) {
  const repo = holidayRepository();
  const holiday = await repo.findOne({ where: { id } });
  if (!holiday) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Holiday not found.', 404);
  }

  if (input.name !== undefined) holiday.name = input.name;
  if (input.date !== undefined) holiday.date = input.date;
  if (input.recurring !== undefined) holiday.recurring = input.recurring;
  if (input.notes !== undefined) holiday.notes = input.notes;

  return repo.save(holiday);
}

export async function deleteHoliday(id: string) {
  const repo = holidayRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Holiday not found.', 404);
  }
}
