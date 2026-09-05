import dotenv from 'dotenv';

dotenv.config();

import { z } from 'zod';

/**
 * JWT_SECRET has no default on purpose: a boilerplate that silently falls
 * back to a hardcoded secret is a security hole waiting to ship to prod.
 * Fail loudly at startup instead.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET must be set (no default is provided on purpose)'),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('app_db'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
}

export const env = parsed.data;
