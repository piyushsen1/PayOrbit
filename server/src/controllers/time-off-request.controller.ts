import { Request, Response, NextFunction } from 'express';
import * as requestService from '../services/time-off-request.service';
import { getLinkedEmployeeId } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { UserRole } from '../entities/User';
import { parsePagination } from '../utils/pagination';

const HR_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

export async function listRequestsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const isHr = !!req.user && HR_ROLES.includes(req.user.role);
    const queryEmployeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    const employeeId = isHr ? queryEmployeeId : await getLinkedEmployeeId(req.user!.sub);
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await requestService.listRequests({ employeeId }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.getRequest(req.params.id);
    res.success(request);
  } catch (err) {
    next(err);
  }
}

/** Employees create their own requests (per root CLAUDE.md); HR roles may create on anyone's behalf. */
export async function createRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const isHr = HR_ROLES.includes(req.user.role);
    const employeeId = isHr && req.body.employeeId ? req.body.employeeId : await getLinkedEmployeeId(req.user.sub);
    const request = await requestService.createRequest({ ...req.body, employeeId });
    res.success(request, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.updateRequest(req.params.id, req.body);
    res.success(request);
  } catch (err) {
    next(err);
  }
}

export async function deleteRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await requestService.deleteRequest(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}

export async function approveRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const request = await requestService.approveRequest(req.params.id, req.user.sub);
    res.success(request);
  } catch (err) {
    next(err);
  }
}

export async function refuseRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const request = await requestService.refuseRequest(req.params.id, req.user.sub);
    res.success(request);
  } catch (err) {
    next(err);
  }
}
