import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { TimeOffTypeStatus, TimeOffUnit } from '../entities/TimeOffType';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listTimeOffTypesHandler,
  getTimeOffTypeHandler,
  createTimeOffTypeHandler,
  updateTimeOffTypeHandler,
  deleteTimeOffTypeHandler,
} from '../controllers/time-off-type.controller';

const router = Router();

/** HR Manager and every payroll/admin role above it manage the leave policy catalog; Employee has no access. */
const MANAGE_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];
/** Only these roles can ever be the designated approver for a leave type. */
const approvalRoleEnum = z.enum([UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN]);

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });
const listQuerySchema = z.object({ query: z.object(paginationQuerySchema) });

const createTimeOffTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Type name is required.'),
    unit: z.nativeEnum(TimeOffUnit),
    allocationRequired: z.boolean().optional(),
    approvalRole: approvalRoleEnum,
    affectsPayroll: z.boolean().optional(),
    color: z.string().min(1).optional(),
    status: z.nativeEnum(TimeOffTypeStatus).optional(),
    notes: z.string().optional(),
  }),
});

const updateTimeOffTypeSchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: z.string().min(1).optional(),
    unit: z.nativeEnum(TimeOffUnit).optional(),
    allocationRequired: z.boolean().optional(),
    approvalRole: approvalRoleEnum.optional(),
    affectsPayroll: z.boolean().optional(),
    color: z.string().min(1).optional(),
    status: z.nativeEnum(TimeOffTypeStatus).optional(),
    notes: z.string().optional(),
  }),
});

/**
 * @openapi
 * /api/time-off-types:
 *   get:
 *     summary: List time off types (leave policy catalog)
 *     tags: [Time Off Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of time off types.
 *       403:
 *         description: Caller lacks a manage role.
 */
router.get('/', authGuard, roleGuard(...MANAGE_ROLES), validate(listQuerySchema), listTimeOffTypesHandler);

/**
 * @openapi
 * /api/time-off-types/{id}:
 *   get:
 *     summary: Get one time off type
 *     tags: [Time Off Types]
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
 *         description: Time off type detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), getTimeOffTypeHandler);

/**
 * @openapi
 * /api/time-off-types:
 *   post:
 *     summary: Create a time off type
 *     tags: [Time Off Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit, approvalRole]
 *             properties:
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *                 enum: [days, hours]
 *               allocationRequired:
 *                 type: boolean
 *               approvalRole:
 *                 type: string
 *                 enum: [hr_manager, hr_payroll_user, hr_payroll_manager, admin]
 *               affectsPayroll:
 *                 type: boolean
 *               color:
 *                 type: string
 *                 example: "#3B82F6"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Time off type created.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createTimeOffTypeSchema), createTimeOffTypeHandler);

/**
 * @openapi
 * /api/time-off-types/{id}:
 *   patch:
 *     summary: Update a time off type
 *     tags: [Time Off Types]
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
 *         description: Time off type updated.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateTimeOffTypeSchema), updateTimeOffTypeHandler);

/**
 * @openapi
 * /api/time-off-types/{id}:
 *   delete:
 *     summary: Delete a time off type
 *     tags: [Time Off Types]
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
 *         description: Time off type deleted.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteTimeOffTypeHandler);

export default router;
