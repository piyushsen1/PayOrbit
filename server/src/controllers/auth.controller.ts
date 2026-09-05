import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.signup(email, password);
    res.success(result, 201);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.success(result, 200);
  } catch (err) {
    next(err);
  }
}
