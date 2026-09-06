import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/data-source';
import { User, UserRole, UserStatus } from '../entities/User';
import { Employee } from '../entities/Employee';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { toPublicUser } from './auth.service';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const SALT_ROUNDS = 10;

const userRepository = () => AppDataSource.getRepository(User);
const employeeRepository = () => AppDataSource.getRepository(Employee);

/** Admin-created accounts get no password field in the UI (invitations are a later
 * enhancement) — generate one now and return it once so the admin can hand it off. */
function generateTemporaryPassword() {
  return randomBytes(9).toString('base64url');
}

export async function listUsersForAdmin(
  filter?: { role?: UserRole; search?: string },
  pagination: PaginationParams = parsePagination({})
) {
  const qb = userRepository()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.employee', 'employee')
    .orderBy('user.createdAt', 'DESC')
    .skip(pagination.skip)
    .take(pagination.take);

  if (filter?.role) {
    qb.andWhere('user.role = :role', { role: filter.role });
  }
  if (filter?.search) {
    qb.andWhere('(user.email ILIKE :search OR employee.full_name ILIKE :search)', { search: `%${filter.search}%` });
  }

  const [users, total] = await qb.getManyAndCount();
  return { items: users.map(toPublicUser), meta: buildPaginationMeta(pagination, total) };
}

export async function createUserForAdmin(input: {
  employeeId: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
}) {
  const employee = await employeeRepository().findOne({ where: { id: input.employeeId } });
  if (!employee) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Selected employee does not exist.', 404);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

  const repo = userRepository();
  const user = repo.create({
    email: input.email,
    passwordHash,
    role: input.role,
    status: input.status ?? UserStatus.ACTIVE,
    employeeId: employee.id,
  });
  await repo.save(user);
  user.employee = employee;

  return { user: toPublicUser(user), temporaryPassword };
}

export async function updateUserForAdmin(
  id: string,
  input: { employeeId?: string; email?: string; role?: UserRole; status?: UserStatus }
) {
  const repo = userRepository();
  const user = await repo.findOne({ where: { id }, relations: ['employee'] });
  if (!user) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'User not found.', 404);
  }

  if (input.employeeId) {
    const employee = await employeeRepository().findOne({ where: { id: input.employeeId } });
    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Selected employee does not exist.', 404);
    }
    user.employeeId = employee.id;
    user.employee = employee;
  }
  if (input.email) user.email = input.email;
  if (input.role) user.role = input.role;
  if (input.status) user.status = input.status;

  await repo.save(user);
  return toPublicUser(user);
}
