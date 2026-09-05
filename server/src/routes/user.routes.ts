import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole, UserStatus } from '../entities/User';
import { paginationQuerySchema } from '../utils/pagination';
import { listUsersHandler, createUserHandler, updateUserHandler } from '../controllers/user-admin.controller';

const router = Router();

const roleEnum = z.nativeEnum(UserRole);
const statusEnum = z.nativeEnum(UserStatus);
const listQuerySchema = z.object({ query: z.object({ role: roleEnum.optional(), ...paginationQuerySchema }) });

const createUserSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Select an employee.'),
    email: z.string().email('Enter a valid work email.'),
    role: roleEnum,
    status: statusEnum.optional(),
  }),
});

const updateUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    employeeId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
  }),
});

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List user accounts with their linked employee (admin-only User Management screen)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [employee, hr_manager, hr_payroll_user, hr_payroll_manager, admin]
 *     responses:
 *       200:
 *         description: List of user accounts.
 *       403:
 *         description: Caller is not an admin.
 */
router.get('/', authGuard, roleGuard(UserRole.ADMIN), validate(listQuerySchema), listUsersHandler);

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a user account linked to an employee and assign a role (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, email, role]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [employee, hr_manager, hr_payroll_user, hr_payroll_manager, admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: User created; returns the user and a one-time temporary password.
 *       403:
 *         description: Caller is not an admin.
 *       404:
 *         description: Selected employee does not exist.
 *       409:
 *         description: Email already in use.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(UserRole.ADMIN), validate(createUserSchema), createUserHandler);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user account's employee link, email, role, or status (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User updated.
 *       403:
 *         description: Caller is not an admin.
 *       404:
 *         description: User or selected employee not found.
 */
router.patch('/:id', authGuard, roleGuard(UserRole.ADMIN), validate(updateUserSchema), updateUserHandler);

export default router;
