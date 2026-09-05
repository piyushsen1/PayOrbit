import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { canAccessOwnRecord } from '../middleware/canAccessOwnRecord';
import { UserRole } from '../entities/User';
import { AppDataSource } from '../config/data-source';
import { TimeOffAllocation } from '../entities/TimeOffAllocation';
import { User } from '../entities/User';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listAllocationsHandler,
  getAllocationHandler,
  createAllocationHandler,
  updateAllocationHandler,
  deleteAllocationHandler,
  approveAllocationHandler,
  refuseAllocationHandler,
} from '../controllers/time-off-allocation.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it manage Time Off (incl. approve/refuse). */
const HR_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const listQuerySchema = z.object({
  query: z.object({ employeeId: z.string().uuid().optional(), ...paginationQuerySchema }),
});

const createAllocationSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Select an employee.'),
    timeOffTypeId: z.string().uuid('Select a time off type.'),
    allocated: z.number().positive('Enter a valid allocated amount.'),
    validFrom: z.string().date().nullable().optional(),
    validTo: z.string().date().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
});

const updateAllocationSchema = z.object({
  params: idParamSchema,
  body: z.object({
    allocated: z.number().positive().optional(),
    validFrom: z.string().date().nullable().optional(),
    validTo: z.string().date().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
});

async function resolveAllocationOwnerUserId(allocationId: string): Promise<string | null> {
  const allocation = await AppDataSource.getRepository(TimeOffAllocation).findOne({ where: { id: allocationId } });
  if (!allocation) return null;
  const owner = await AppDataSource.getRepository(User).findOne({ where: { employeeId: allocation.employeeId } });
  return owner?.id ?? null;
}

/**
 * @openapi
 * /api/time-off-allocations:
 *   get:
 *     summary: List time off allocations (with derived taken/remaining). HR roles see everyone (optional employeeId filter); Employee sees only their own.
 *     tags: [Time Off Allocations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of allocations.
 */
router.get('/', authGuard, validate(listQuerySchema), listAllocationsHandler);

/**
 * @openapi
 * /api/time-off-allocations/{id}:
 *   get:
 *     summary: Get one allocation (owner or HR roles)
 *     tags: [Time Off Allocations]
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
 *         description: Allocation detail.
 *       403:
 *         description: Not the allocation's owner and not an HR/payroll role.
 *       404:
 *         description: Not found.
 */
router.get(
  '/:id',
  authGuard,
  validate(idParamOnlySchema),
  canAccessOwnRecord((req) => resolveAllocationOwnerUserId(req.params.id), HR_ROLES),
  getAllocationHandler
);

/**
 * @openapi
 * /api/time-off-allocations:
 *   post:
 *     summary: Grant a leave balance (HR Manager and above) — pending until approved
 *     tags: [Time Off Allocations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, timeOffTypeId, allocated]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               timeOffTypeId:
 *                 type: string
 *                 format: uuid
 *               allocated:
 *                 type: number
 *               validFrom:
 *                 type: string
 *                 format: date
 *               validTo:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Allocation created (pending).
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Selected employee or time off type does not exist.
 */
router.post('/', authGuard, roleGuard(...HR_ROLES), validate(createAllocationSchema), createAllocationHandler);

/**
 * @openapi
 * /api/time-off-allocations/{id}:
 *   patch:
 *     summary: Update a pending allocation (HR Manager and above)
 *     tags: [Time Off Allocations]
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
 *         description: Allocation updated.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...HR_ROLES), validate(updateAllocationSchema), updateAllocationHandler);

/**
 * @openapi
 * /api/time-off-allocations/{id}:
 *   delete:
 *     summary: Delete an allocation (HR Manager and above)
 *     tags: [Time Off Allocations]
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
 *         description: Allocation deleted.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...HR_ROLES), validate(idParamOnlySchema), deleteAllocationHandler);

/**
 * @openapi
 * /api/time-off-allocations/{id}/approve:
 *   post:
 *     summary: Approve a pending allocation — this is what makes its balance available (HR Manager and above)
 *     tags: [Time Off Allocations]
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
 *         description: Allocation approved.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Already decided.
 */
router.post('/:id/approve', authGuard, roleGuard(...HR_ROLES), validate(idParamOnlySchema), approveAllocationHandler);

/**
 * @openapi
 * /api/time-off-allocations/{id}/refuse:
 *   post:
 *     summary: Refuse a pending allocation (HR Manager and above)
 *     tags: [Time Off Allocations]
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
 *         description: Allocation refused.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Already decided.
 */
router.post('/:id/refuse', authGuard, roleGuard(...HR_ROLES), validate(idParamOnlySchema), refuseAllocationHandler);

export default router;
