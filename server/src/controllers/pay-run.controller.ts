import { Request, Response, NextFunction } from 'express';
import * as payRunService from '../services/pay-run.service';
import { parsePagination } from '../utils/pagination';
import { PayRunStatus } from '../entities/PayRun';

export async function listPayRunsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as PayRunStatus) : undefined;
    const { items, meta } = await payRunService.listPayRuns({ search, status }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getPayRunHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payRun = await payRunService.getPayRun(req.params.id);
    res.success(payRun);
  } catch (err) {
    next(err);
  }
}

export async function createPayRunHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payRun = await payRunService.createPayRun(req.body);
    res.success(payRun, 201);
  } catch (err) {
    next(err);
  }
}

export async function deletePayRunHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await payRunService.deletePayRun(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}

export async function computePayRunHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payRun = await payRunService.computePayRun(req.params.id);
    res.success(payRun);
  } catch (err) {
    next(err);
  }
}

export async function validatePayRunHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payRun = await payRunService.validatePayRun(req.params.id);
    res.success(payRun);
  } catch (err) {
    next(err);
  }
}

export async function markPayRunPaidHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payRun = await payRunService.markPayRunPaid(req.params.id);
    res.success(payRun);
  } catch (err) {
    next(err);
  }
}

export async function sendPayslipsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await payRunService.sendPayslipsForPayRun(req.params.id);
    res.success(result);
  } catch (err) {
    next(err);
  }
}
