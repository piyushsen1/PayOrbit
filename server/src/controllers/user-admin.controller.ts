import { Request, Response, NextFunction } from 'express';
import * as userAdminService from '../services/user-admin.service';
import { parsePagination } from '../utils/pagination';
import { UserRole } from '../entities/User';

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const role = typeof req.query.role === 'string' ? (req.query.role as UserRole) : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await userAdminService.listUsersForAdmin({ role }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userAdminService.createUserForAdmin(req.body);
    res.success(result, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userAdminService.updateUserForAdmin(req.params.id, req.body);
    res.success(user);
  } catch (err) {
    next(err);
  }
}
