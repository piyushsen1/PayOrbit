import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';

/**
 * Generic Zod validation middleware. Pass a schema shaped like
 * `z.object({ body: ..., query: ..., params: ... })` — only the keys you
 * include are validated, and the parsed (coerced/defaulted) values are
 * written back onto `req` so handlers see clean data.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => `${e.path.join('.') || '(body)'}: ${e.message}`).join('; ');
        return next(new AppError(ErrorCodes.VALIDATION_ERROR, message, 422));
      }
      next(err);
    }
  };
}
