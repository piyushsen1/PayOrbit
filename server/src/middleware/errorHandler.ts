import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';

/** Postgres error codes we translate into our own error codes instead of leaking raw driver errors. */
const PG_UNIQUE_VIOLATION = '23505';

// Express only recognizes this as an error-handling middleware because it takes 4 arguments,
// even though req/next go unused here.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }

  if (err instanceof QueryFailedError) {
    const driverError = err.driverError as { code?: string } | undefined;
    if (driverError?.code === PG_UNIQUE_VIOLATION) {
      return res.status(409).json({
        error: { code: ErrorCodes.DUPLICATE_RESOURCE, message: 'A record with these details already exists.' },
      });
    }
    console.error(err);
    return res.status(500).json({
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'A database error occurred.' },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Something went wrong.' },
  });
}
