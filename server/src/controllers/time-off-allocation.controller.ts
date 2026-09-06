import { Request, Response, NextFunction } from 'express';
import * as allocationService from '../services/time-off-allocation.service';
import { getLinkedEmployeeId } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { UserRole } from '../entities/User';
import { parsePagination } from '../utils/pagination';
import { TimeOffAllocationStatus } from '../entities/TimeOffAllocation';

const HR_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

export async function listAllocationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const isHr = !!req.user && HR_ROLES.includes(req.user.role);
    const queryEmployeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    const employeeId = isHr ? queryEmployeeId : await getLinkedEmployeeId(req.user!.sub);
    const status = typeof req.query.status === 'string' ? (req.query.status as TimeOffAllocationStatus) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await allocationService.listAllocations({ employeeId, status, search }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getAllocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.getAllocation(req.params.id);
    res.success(allocation);
  } catch (err) {
    next(err);
  }
}

export async function createAllocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.createAllocation(req.body);
    res.success(allocation, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateAllocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.updateAllocation(req.params.id, req.body);
    res.success(allocation);
  } catch (err) {
    next(err);
  }
}

export async function deleteAllocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await allocationService.deleteAllocation(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}

export async function approveAllocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const allocation = await allocationService.approveAllocation(req.params.id, req.user.sub);
    res.success(allocation);
  } catch (err) {
    next(err);
  }
}

export async function refuseAllocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const allocation = await allocationService.refuseAllocation(req.params.id, req.user.sub);
    res.success(allocation);
  } catch (err) {
    next(err);
  }
}
