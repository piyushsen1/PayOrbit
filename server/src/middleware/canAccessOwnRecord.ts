import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { UserRole } from '../entities/User';

type OwnerIdResolver = (req: Request) => string | null | undefined | Promise<string | null | undefined>;

/**
 * Generic "is this the record's owner, or does this role bypass ownership"
 * guard. Write it once here, reuse for every future module instead of
 * reimplementing the same check per controller.
 *
 * `getOwnerId` resolves the owning user's id for the record being accessed —
 * often just `(req) => req.params.userId`, or an async DB lookup when the
 * owner id isn't in the URL (e.g. a post's `authorId`).
 *
 * Must run after `authGuard`.
 *
 * @example
 * router.get('/orders/:id', authGuard, canAccessOwnRecord(async (req) => {
 *   const order = await orderRepository.findOneBy({ id: req.params.id });
 *   return order?.ownerId;
 * }), getOrderHandler);
 */
export function canAccessOwnRecord(getOwnerId: OwnerIdResolver, elevatedRoles: UserRole[] = [UserRole.ADMIN]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401));
    }

    if (elevatedRoles.includes(req.user.role)) {
      return next();
    }

    const ownerId = await getOwnerId(req);
    if (ownerId && ownerId === req.user.sub) {
      return next();
    }

    return next(new AppError(ErrorCodes.FORBIDDEN, 'You do not have permission to access this record.', 403));
  };
}
