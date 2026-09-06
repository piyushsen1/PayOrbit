import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listHolidaysHandler,
  getHolidayHandler,
  createHolidayHandler,
  updateHolidayHandler,
  deleteHolidayHandler,
} from '../controllers/holiday.controller';

const router = Router();

/** HR Manager and every payroll/admin role above it manage the holiday calendar. Reading it is open to every role — everyone sees company holidays. */
const MANAGE_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });
const listQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().optional(),
    search: z.string().trim().min(1).optional(),
    ...paginationQuerySchema,
  }),
});

const createHolidaySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Holiday name is required.'),
    date: z.string().date('Enter a valid date.'),
    recurring: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  }),
});

const updateHolidaySchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: z.string().min(1).optional(),
    date: z.string().date().optional(),
    recurring: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  }),
});

/**
 * @openapi
 * /api/holidays:
 *   get:
 *     summary: List company holidays, optionally filtered by year (recurring holidays always included) — open to every role
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive partial match against the holiday's name.
 *     responses:
 *       200:
 *         description: List of holidays.
 */
router.get('/', authGuard, validate(listQuerySchema), listHolidaysHandler);

/**
 * @openapi
 * /api/holidays/{id}:
 *   get:
 *     summary: Get one holiday — open to every role
 *     tags: [Holidays]
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
 *         description: Holiday detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, validate(idParamOnlySchema), getHolidayHandler);

/**
 * @openapi
 * /api/holidays:
 *   post:
 *     summary: Create a company holiday (HR Manager and above)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date]
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               recurring:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Holiday created.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createHolidaySchema), createHolidayHandler);

/**
 * @openapi
 * /api/holidays/{id}:
 *   patch:
 *     summary: Update a company holiday (HR Manager and above)
 *     tags: [Holidays]
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
 *         description: Holiday updated.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateHolidaySchema), updateHolidayHandler);

/**
 * @openapi
 * /api/holidays/{id}:
 *   delete:
 *     summary: Delete a company holiday (HR Manager and above)
 *     tags: [Holidays]
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
 *         description: Holiday deleted.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteHolidayHandler);

export default router;
