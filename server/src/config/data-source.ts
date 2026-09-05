import 'reflect-metadata';
import path from 'path';
import { DataSource } from 'typeorm';
import { env } from './env';

/**
 * synchronize is always false: schema changes only ever happen through
 * `npm run migration:generate` + `npm run migration:run`. See server/CLAUDE.md
 * for the full "add an entity" workflow.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
      }),
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
});
