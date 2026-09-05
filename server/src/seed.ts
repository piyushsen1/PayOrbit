import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { AppDataSource } from './config/data-source';
import { User, UserRole } from './entities/User';

const SALT_ROUNDS = 10;
const USERS_TO_SEED = 10;
const SEED_PASSWORD = 'Password123!';

/**
 * Idempotent-ish dev seed: run against a fresh, migrated database. Goes
 * through the real repository (not raw SQL) so entity hooks/validation stay
 * in effect, same as request-time writes.
 */
async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  const admin = userRepository.create({
    email: 'admin@example.com',
    passwordHash,
    role: UserRole.ADMIN,
  });

  const users = Array.from({ length: USERS_TO_SEED }, () =>
    userRepository.create({
      email: faker.internet.email().toLowerCase(),
      passwordHash,
      role: UserRole.USER,
    })
  );

  await userRepository.save([admin, ...users]);

  console.log(`Seeded ${users.length + 1} users (including 1 admin).`);
  console.log(`All seeded accounts use the password: ${SEED_PASSWORD}`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
