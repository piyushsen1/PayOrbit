import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Response {
      /** Sends `{ data }` — the one success shape every route should use. */
      success: <T>(data: T, statusCode?: number) => Response;
    }
  }
}

export function responseFormatter(req: Request, res: Response, next: NextFunction) {
  res.success = function success<T>(data: T, statusCode = 200) {
    return this.status(statusCode).json({ data });
  };
  next();
}
