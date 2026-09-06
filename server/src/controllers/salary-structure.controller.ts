import { Request, Response, NextFunction } from 'express';
import * as salaryStructureService from '../services/salary-structure.service';
import { parsePagination } from '../utils/pagination';

export async function listSalaryStructuresHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await salaryStructureService.listSalaryStructures({ search }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getSalaryStructureHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const structure = await salaryStructureService.getSalaryStructure(req.params.id);
    res.success(structure);
  } catch (err) {
    next(err);
  }
}

export async function createSalaryStructureHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const structure = await salaryStructureService.createSalaryStructure(req.body);
    res.success(structure, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateSalaryStructureHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const structure = await salaryStructureService.updateSalaryStructure(req.params.id, req.body);
    res.success(structure);
  } catch (err) {
    next(err);
  }
}

export async function deleteSalaryStructureHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await salaryStructureService.deleteSalaryStructure(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}
