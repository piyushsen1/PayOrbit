import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { canAccessOwnRecord } from '../middleware/canAccessOwnRecord';
import { UserRole } from '../entities/User';
import { AppDataSource } from '../config/data-source';
import { TimeOffRequest } from '../entities/TimeOffRequest';
import { User } from '../entities/User';
import {
  listRequestsHandler,
  getRequestHandler,
  createRequestHandler,
  updateRequestHandler,
  deleteRequestHandler,
  approveRequestHandler,
  refuseRequestHandler,
} from '../controllers/time-off-request.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it approve/refuse Time Off. */
const HR_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const listQuerySchema = z.object({ query: z.object({ employeeId: z.string().uuid().optional() }) });

const createRequestSchema = z.object({
  body: z.object({
    // employeeId is optional in the request body: HR can specify it, an Employee's own account is used otherwise (see controller).
    employeeId: z.string().uuid().optional(),
    timeOffTypeId: z.string().uuid('Select a time off type.'),
    startDate: z.string().date('Enter a valid start date.'),
    endDate: z.string().date('Enter a valid end date.'),
    duration: z.number().positive('Enter a valid duration.'),
    reason: z.string().nullable().optional(),
  }),
});

const updateRequestSchema = z.object({
  params: idParamSchema,
  body: z.object({
    timeOffTypeId: z.string().uuid().optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    duration: z.number().positive().optional(),
    reason: z.string().nullable().optional(),
  }),
});

async function resolveRequestOwnerUserId(requestId: string): Promise<string | null> {
  const request = await AppDataSource.getRepository(TimeOffRequest).findOne({ where: { id: requestId } });
  if (!request) return null;
  const owner = await AppDataSource.getRepository(User).findOne({ where: { employeeId: request.employeeId } });
  return owner?.id ?? null;
}

const ownRecordGuard = canAccessOwnRecord((req) => resolveRequestOwnerUserId(req.params.id), HR_ROLES);

/**
 * @openapi
 * /api/time-off-requests:
 *   get:
 *     summary: List time off requests. HR roles see everyone (optional employeeId filter); Employee sees only their own.
 *     tags: [Time Off Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of requests.
 */
router.get('/', authGuard, validate(listQuerySchema), listRequestsHandler);

/**
 * @openapi
 * /api/time-off-requests/{id}:
 *   get:
 *     summary: Get one request (owner or HR roles)
 *     tags: [Time Off Requests]
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
 *         description: Request detail.
 *       403:
 *         description: Not the request's owner and not an HR/payroll role.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, validate(idParamOnlySchema), ownRecordGuard, getRequestHandler);

/**
 * @openapi
 * /api/time-off-requests:
 *   post:
 *     summary: Create a time off request. Employees create their own; HR roles may specify employeeId to create on someone's behalf.
 *     tags: [Time Off Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [timeOffTypeId, startDate, endDate, duration]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               timeOffTypeId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               duration:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request created (pending).
 *       404:
 *         description: Selected employee or time off type does not exist.
 *       422:
 *         description: Validation error, or no approved allocation covers this request.
 */
router.post('/', authGuard, validate(createRequestSchema), createRequestHandler);

/**
 * @openapi
 * /api/time-off-requests/{id}:
 *   patch:
 *     summary: Update a pending request (owner or HR roles)
 *     tags: [Time Off Requests]
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
 *         description: Request updated.
 *       403:
 *         description: Not the request's owner and not an HR/payroll role.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Only pending requests can be edited, or no approved allocation covers the change.
 */
router.patch('/:id', authGuard, validate(updateRequestSchema), ownRecordGuard, updateRequestHandler);

/**
 * @openapi
 * /api/time-off-requests/{id}:
 *   delete:
 *     summary: Delete/cancel a request (owner or HR roles)
 *     tags: [Time Off Requests]
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
 *         description: Request deleted.
 *       403:
 *         description: Not the request's owner and not an HR/payroll role.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, validate(idParamOnlySchema), ownRecordGuard, deleteRequestHandler);

/**
 * @openapi
 * /api/time-off-requests/{id}/approve:
 *   post:
 *     summary: Approve a pending request — deducts from the linked allocation (HR Manager and above)
 *     tags: [Time Off Requests]
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
 *         description: Request approved.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Already decided, or would exceed the allocation's remaining balance.
 */
router.post('/:id/approve', authGuard, roleGuard(...HR_ROLES), validate(idParamOnlySchema), approveRequestHandler);

/**
 * @openapi
 * /api/time-off-requests/{id}/refuse:
 *   post:
 *     summary: Refuse a pending request (HR Manager and above)
 *     tags: [Time Off Requests]
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
 *         description: Request refused.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Already decided.
 */
router.post('/:id/refuse', authGuard, roleGuard(...HR_ROLES), validate(idParamOnlySchema), refuseRequestHandler);

export default router;
