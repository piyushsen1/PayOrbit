import { ILike } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { SalaryStructure } from '../entities/SalaryStructure';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const salaryStructureRepository = () => AppDataSource.getRepository(SalaryStructure);

export async function listSalaryStructures(
  filter?: { search?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const [structures, total] = await salaryStructureRepository().findAndCount({
    where: filter?.search ? { name: ILike(`%${filter.search}%`) } : {},
    relations: ['rules'],
    order: { name: 'ASC' },
    skip: pagination.skip,
    take: pagination.take,
  });
  const items = structures.map(({ rules, ...rest }) => ({ ...rest, rulesCount: rules.length }));
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getSalaryStructure(id: string) {
  const structure = await salaryStructureRepository().findOne({
    where: { id },
    relations: ['rules'],
    order: { rules: { sequence: 'ASC' } },
  });
  if (!structure) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Salary structure not found.', 404);
  }
  return structure;
}

export async function createSalaryStructure(input: { name: string; active?: boolean }) {
  const repo = salaryStructureRepository();
  const structure = repo.create({ name: input.name, active: input.active ?? true });
  return repo.save(structure);
}

export async function updateSalaryStructure(id: string, input: { name?: string; active?: boolean }) {
  const repo = salaryStructureRepository();
  const structure = await repo.findOne({ where: { id } });
  if (!structure) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Salary structure not found.', 404);
  }
  if (input.name !== undefined) structure.name = input.name;
  if (input.active !== undefined) structure.active = input.active;
  return repo.save(structure);
}

export async function deleteSalaryStructure(id: string) {
  const repo = salaryStructureRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Salary structure not found.', 404);
  }
}
