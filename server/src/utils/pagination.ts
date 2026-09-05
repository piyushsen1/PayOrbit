import { z } from 'zod';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/** Add to any route's query zod schema alongside its own filter fields. */
export const paginationQuerySchema = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
};

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Defaults page 1 / limit 10 (max 100) and clamps out-of-range values — safe even if a caller skips query validation. */
export function parsePagination(query: { page?: number; limit?: number }): PaginationParams {
  const page = Math.max(1, Math.trunc(query.page ?? 1) || 1);
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  return { page: params.page, limit: params.limit, total, totalPages: Math.max(1, Math.ceil(total / params.limit)) };
}
