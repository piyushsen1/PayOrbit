import { ILike } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { SalaryRule, SalaryRuleCategory, SalaryRuleComputationMethod } from '../entities/SalaryRule';
import { SalaryStructure } from '../entities/SalaryStructure';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const salaryRuleRepository = () => AppDataSource.getRepository(SalaryRule);
const salaryStructureRepository = () => AppDataSource.getRepository(SalaryStructure);

export type SalaryRuleCategoryFilter = SalaryRuleCategory;

export interface SalaryRuleInput {
  name: string;
  code: string;
  category: SalaryRuleCategory;
  sequence: number;
  salaryStructureId: string;
  computationMethod: SalaryRuleComputationMethod;
  value?: number | null;
  formula?: string | null;
}

/** `value` is required for fixed/percentage; `formula` is required for formula — enforce so a rule can't be half-configured. */
function assertComputationInputValid(computationMethod: SalaryRuleComputationMethod, value?: number | null, formula?: string | null) {
  if (
    (computationMethod === SalaryRuleComputationMethod.FIXED || computationMethod === SalaryRuleComputationMethod.PERCENTAGE) &&
    (value === undefined || value === null)
  ) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, `A value is required for the "${computationMethod}" computation method.`, 422);
  }
  if (computationMethod === SalaryRuleComputationMethod.FORMULA && !formula) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'A formula is required for the "formula" computation method.', 422);
  }
}

export async function listSalaryRules(
  filter?: { salaryStructureId?: string; search?: string; category?: SalaryRuleCategory },
  pagination: PaginationParams = parsePagination({})
) {
  const where: Record<string, unknown> = {};
  if (filter?.salaryStructureId) where.salaryStructureId = filter.salaryStructureId;
  if (filter?.search) where.name = ILike(`%${filter.search}%`);
  if (filter?.category) where.category = filter.category;

  const [items, total] = await salaryRuleRepository().findAndCount({
    where,
    order: { sequence: 'ASC' },
    skip: pagination.skip,
    take: pagination.take,
  });
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getSalaryRule(id: string) {
  const rule = await salaryRuleRepository().findOne({ where: { id } });
  if (!rule) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Salary rule not found.', 404);
  }
  return rule;
}

export async function createSalaryRule(input: SalaryRuleInput) {
  const structure = await salaryStructureRepository().findOne({ where: { id: input.salaryStructureId } });
  if (!structure) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Selected salary structure does not exist.', 404);
  }
  assertComputationInputValid(input.computationMethod, input.value, input.formula);

  const repo = salaryRuleRepository();
  const rule = repo.create({
    name: input.name,
    code: input.code,
    category: input.category,
    sequence: input.sequence,
    salaryStructureId: input.salaryStructureId,
    computationMethod: input.computationMethod,
    value: input.value != null ? input.value.toString() : null,
    formula: input.formula ?? null,
  });
  return repo.save(rule);
}

export async function updateSalaryRule(id: string, input: Partial<SalaryRuleInput>) {
  const repo = salaryRuleRepository();
  const rule = await repo.findOne({ where: { id } });
  if (!rule) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Salary rule not found.', 404);
  }

  if (input.salaryStructureId !== undefined) {
    const structure = await salaryStructureRepository().findOne({ where: { id: input.salaryStructureId } });
    if (!structure) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Selected salary structure does not exist.', 404);
    }
    rule.salaryStructureId = input.salaryStructureId;
  }

  const computationMethod = input.computationMethod ?? rule.computationMethod;
  const value = input.value !== undefined ? input.value : rule.value != null ? Number(rule.value) : null;
  const formula = input.formula !== undefined ? input.formula : rule.formula;
  assertComputationInputValid(computationMethod, value, formula);

  if (input.name !== undefined) rule.name = input.name;
  if (input.code !== undefined) rule.code = input.code;
  if (input.category !== undefined) rule.category = input.category;
  if (input.sequence !== undefined) rule.sequence = input.sequence;
  rule.computationMethod = computationMethod;
  rule.value = value != null ? value.toString() : null;
  rule.formula = formula ?? null;

  return repo.save(rule);
}

export async function deleteSalaryRule(id: string) {
  const repo = salaryRuleRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Salary rule not found.', 404);
  }
}
