import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Response {
      /** Sends `{ data }`, or `{ data, meta }` when `meta` is given (e.g. pagination) — the one success shape every route should use. */
      success: <T>(data: T, statusCode?: number, meta?: object) => Response;
    }
  }
}

export function responseFormatter(req: Request, res: Response, next: NextFunction) {
  res.success = function success<T>(data: T, statusCode = 200, meta?: object) {
    return this.status(statusCode).json(meta ? { data, meta } : { data });
  };
  next();
}
