import { Request, Response, NextFunction } from 'express';
import * as contractService from '../services/contract.service';
import { parsePagination } from '../utils/pagination';

export async function listContractsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await contractService.listContracts({ employeeId }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getContractHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.getContract(req.params.id);
    res.success(contract);
  } catch (err) {
    next(err);
  }
}

export async function createContractHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.createContract(req.body);
    res.success(contract, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateContractHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contract = await contractService.updateContract(req.params.id, req.body);
    res.success(contract);
  } catch (err) {
    next(err);
  }
}

export async function deleteContractHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await contractService.deleteContract(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}
