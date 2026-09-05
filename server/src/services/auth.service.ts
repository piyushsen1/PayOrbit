import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { User, UserRole } from '../entities/User';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '15m';

const userRepository = () => AppDataSource.getRepository(User);

function signToken(user: User) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function toPublicUser(user: User) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function signup(email: string, password: string) {
  const repo = userRepository();

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    throw new AppError(ErrorCodes.DUPLICATE_RESOURCE, 'An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = repo.create({ email, passwordHash, role: UserRole.EMPLOYEE });
  await repo.save(user);

  return { token: signToken(user), user: toPublicUser(user) };
}

/** Resolves the Employee id linked to a logged-in user's account — used by self-service flows (attendance check-in/out, own time-off records). */
export async function getLinkedEmployeeId(userId: string): Promise<string> {
  const user = await userRepository().findOne({ where: { id: userId } });
  if (!user?.employeeId) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Your account is not linked to an employee record.', 404);
  }
  return user.employeeId;
}

export async function login(email: string, password: string) {
  const repo = userRepository();

  const user = await repo.findOne({ where: { email } });
  if (!user) {
    throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password.', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password.', 401);
  }

  return { token: signToken(user), user: toPublicUser(user) };
}
