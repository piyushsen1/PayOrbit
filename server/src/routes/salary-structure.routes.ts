import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listSalaryStructuresHandler,
  getSalaryStructureHandler,
  createSalaryStructureHandler,
  updateSalaryStructureHandler,
  deleteSalaryStructureHandler,
} from '../controllers/salary-structure.controller';

const router = Router();

/** HR Payroll User has read-only access; only HR Payroll Manager/Admin can create/edit/delete. */
const READ_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];
const MANAGE_ROLES = [UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });
const listQuerySchema = z.object({ query: z.object(paginationQuerySchema) });

const createSalaryStructureSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Structure name is required.'),
    active: z.boolean().optional(),
  }),
});

const updateSalaryStructureSchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: z.string().min(1).optional(),
    active: z.boolean().optional(),
  }),
});

/**
 * @openapi
 * /api/salary-structures:
 *   get:
 *     summary: List salary structures (with rule count)
 *     tags: [Salary Structures]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of salary structures.
 *       403:
 *         description: Caller lacks payroll access.
 */
router.get('/', authGuard, roleGuard(...READ_ROLES), validate(listQuerySchema), listSalaryStructuresHandler);

/**
 * @openapi
 * /api/salary-structures/{id}:
 *   get:
 *     summary: Get one salary structure with its ordered rules
 *     tags: [Salary Structures]
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
 *         description: Salary structure detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...READ_ROLES), validate(idParamOnlySchema), getSalaryStructureHandler);

/**
 * @openapi
 * /api/salary-structures:
 *   post:
 *     summary: Create a salary structure (HR Payroll Manager/Admin only)
 *     tags: [Salary Structures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Salary structure created.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createSalaryStructureSchema), createSalaryStructureHandler);

/**
 * @openapi
 * /api/salary-structures/{id}:
 *   patch:
 *     summary: Update a salary structure (HR Payroll Manager/Admin only)
 *     tags: [Salary Structures]
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
 *         description: Salary structure updated.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateSalaryStructureSchema), updateSalaryStructureHandler);

/**
 * @openapi
 * /api/salary-structures/{id}:
 *   delete:
 *     summary: Delete a salary structure (cascades its rules) — HR Payroll Manager/Admin only
 *     tags: [Salary Structures]
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
 *         description: Salary structure deleted.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteSalaryStructureHandler);

export default router;
