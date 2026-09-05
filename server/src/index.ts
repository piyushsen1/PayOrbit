import 'reflect-metadata';
import { AppDataSource } from './config/data-source';
import { env } from './config/env';
import { createApp } from './app';

async function main() {
  await AppDataSource.initialize();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
    console.log(`Swagger docs at http://localhost:${env.PORT}/api-docs`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
