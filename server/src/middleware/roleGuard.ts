import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { UserRole } from '../entities/User';

/**
 * Factory: `roleGuard(UserRole.ADMIN)` only lets admins through. Must run
 * after `authGuard`, which populates `req.user`.
 */
export function roleGuard(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(ErrorCodes.FORBIDDEN, 'You do not have permission to perform this action.', 403));
    }
    next();
  };
}
