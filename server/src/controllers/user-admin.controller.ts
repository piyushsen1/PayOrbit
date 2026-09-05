import { Request, Response, NextFunction } from 'express';
import * as userAdminService from '../services/user-admin.service';

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userAdminService.listUsersForAdmin();
    res.success(users);
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
