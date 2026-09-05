import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { UserRole } from '../entities/User';

export interface AuthPayload {
  sub: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/** Verifies the Bearer JWT and attaches the decoded payload as `req.user`. */
export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Missing or malformed Authorization header.', 401));
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    next(new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token.', 401));
  }
}
