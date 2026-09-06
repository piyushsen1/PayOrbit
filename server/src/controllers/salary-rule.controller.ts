import { Request, Response, NextFunction } from 'express';
import * as salaryRuleService from '../services/salary-rule.service';
import { parsePagination } from '../utils/pagination';

export async function listSalaryRulesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const salaryStructureId = typeof req.query.salaryStructureId === 'string' ? req.query.salaryStructureId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? (req.query.category as salaryRuleService.SalaryRuleCategoryFilter) : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await salaryRuleService.listSalaryRules({ salaryStructureId, search, category }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getSalaryRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await salaryRuleService.getSalaryRule(req.params.id);
    res.success(rule);
  } catch (err) {
    next(err);
  }
}

export async function createSalaryRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await salaryRuleService.createSalaryRule(req.body);
    res.success(rule, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateSalaryRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await salaryRuleService.updateSalaryRule(req.params.id, req.body);
    res.success(rule);
  } catch (err) {
    next(err);
  }
}

export async function deleteSalaryRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await salaryRuleService.deleteSalaryRule(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}
