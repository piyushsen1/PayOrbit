import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { WorkingScheduleStatus } from '../entities/WorkingSchedule';
import { DayOfWeek } from '../entities/WorkingScheduleDay';
import {
  listWorkingSchedulesHandler,
  getWorkingScheduleHandler,
  createWorkingScheduleHandler,
  updateWorkingScheduleHandler,
  deleteWorkingScheduleHandler,
} from '../controllers/working-schedule.controller';

const router = Router();

/** HR Manager and every payroll/admin role above it manage Working Schedules; Employee has no access. */
const MANAGE_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour time.');

const dayInputSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: timeString,
  endTime: timeString,
  breakMinutes: z.number().int().min(0).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const createWorkingScheduleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Schedule name is required.'),
    company: z.string().min(1, 'Company is required.'),
    timezone: z.string().min(1).optional(),
    status: z.nativeEnum(WorkingScheduleStatus).optional(),
    days: z.array(dayInputSchema).min(1, 'Add at least one day.'),
  }),
});

const updateWorkingScheduleSchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: z.string().min(1).optional(),
    company: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
    status: z.nativeEnum(WorkingScheduleStatus).optional(),
    days: z.array(dayInputSchema).min(1).optional(),
  }),
});

const idParamOnlySchema = z.object({ params: idParamSchema });

/**
 * @openapi
 * /api/working-schedules:
 *   get:
 *     summary: List working schedules (weekly patterns)
 *     tags: [Working Schedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of working schedules.
 *       403:
 *         description: Caller lacks a manage role.
 */
router.get('/', authGuard, roleGuard(...MANAGE_ROLES), listWorkingSchedulesHandler);

/**
 * @openapi
 * /api/working-schedules/{id}:
 *   get:
 *     summary: Get one working schedule with its per-day pattern
 *     tags: [Working Schedules]
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
 *         description: Working schedule detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), getWorkingScheduleHandler);

/**
 * @openapi
 * /api/working-schedules:
 *   post:
 *     summary: Create a working schedule (weekly hours are auto-computed from days)
 *     tags: [Working Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, company, days]
 *             properties:
 *               name:
 *                 type: string
 *               company:
 *                 type: string
 *               timezone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [dayOfWeek, startTime, endTime]
 *                   properties:
 *                     dayOfWeek:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     startTime:
 *                       type: string
 *                       example: "09:00"
 *                     endTime:
 *                       type: string
 *                       example: "17:00"
 *                     breakMinutes:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Working schedule created.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createWorkingScheduleSchema), createWorkingScheduleHandler);

/**
 * @openapi
 * /api/working-schedules/{id}:
 *   patch:
 *     summary: Update a working schedule; passing `days` replaces the full weekly pattern
 *     tags: [Working Schedules]
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
 *         description: Working schedule updated.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateWorkingScheduleSchema), updateWorkingScheduleHandler);

/**
 * @openapi
 * /api/working-schedules/{id}:
 *   delete:
 *     summary: Delete a working schedule
 *     tags: [Working Schedules]
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
 *         description: Working schedule deleted.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteWorkingScheduleHandler);

export default router;
