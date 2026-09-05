import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { canAccessOwnRecord } from '../middleware/canAccessOwnRecord';
import { UserRole } from '../entities/User';
import { AppDataSource } from '../config/data-source';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { User } from '../entities/User';
import {
  listAttendanceHandler,
  getAttendanceHandler,
  createAttendanceHandler,
  updateAttendanceHandler,
  deleteAttendanceHandler,
  checkInHandler,
  checkOutHandler,
} from '../controllers/attendance.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it have full CRUD on Attendance. */
const HR_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const listQuerySchema = z.object({
  query: z.object({
    employeeId: z.string().uuid().optional(),
    date: z.string().date().optional(),
  }),
});

const createAttendanceSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Select an employee.'),
    date: z.string().date('Enter a valid date.'),
    checkIn: z.string().datetime().nullable().optional(),
    checkOut: z.string().datetime().nullable().optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    notes: z.string().nullable().optional(),
  }),
});

const updateAttendanceSchema = z.object({
  params: idParamSchema,
  body: z.object({
    date: z.string().date().optional(),
    checkIn: z.string().datetime().nullable().optional(),
    checkOut: z.string().datetime().nullable().optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    notes: z.string().nullable().optional(),
  }),
});

/** Resolves the User id that owns a given attendance record's employee, for canAccessOwnRecord. */
async function resolveAttendanceOwnerUserId(attendanceId: string): Promise<string | null> {
  const attendance = await AppDataSource.getRepository(Attendance).findOne({ where: { id: attendanceId } });
  if (!attendance) return null;
  const owner = await AppDataSource.getRepository(User).findOne({ where: { employeeId: attendance.employeeId } });
  return owner?.id ?? null;
}

/**
 * @openapi
 * /api/attendance:
 *   get:
 *     summary: List attendance records. HR roles see everyone (optionally filtered by employeeId/date); Employee sees only their own.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of attendance records, with derived workedHours/overtime.
 */
router.get('/', authGuard, validate(listQuerySchema), listAttendanceHandler);

/**
 * @openapi
 * /api/attendance/check-in:
 *   post:
 *     summary: Self-service check-in for the logged-in user's linked employee record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance record for today, checked in.
 *       404:
 *         description: Account has no linked employee record.
 *       422:
 *         description: Already checked in/out for today.
 */
router.post('/check-in', authGuard, checkInHandler);

/**
 * @openapi
 * /api/attendance/check-out:
 *   post:
 *     summary: Self-service check-out for the logged-in user's linked employee record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance record for today, checked out.
 *       404:
 *         description: Account has no linked employee record.
 *       422:
 *         description: Not checked in, or already checked out, for today.
 */
router.post('/check-out', authGuard, checkOutHandler);

/**
 * @openapi
 * /api/attendance/{id}:
 *   get:
 *     summary: Get one attendance record (owner or HR roles)
 *     tags: [Attendance]
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
 *         description: Attendance record detail.
 *       403:
 *         description: Not the record's owner and not an HR/payroll role.
 *       404:
 *         description: Not found.
 */
router.get(
  '/:id',
  authGuard,
  validate(idParamOnlySchema),
  canAccessOwnRecord((req) => resolveAttendanceOwnerUserId(req.params.id), HR_ROLES),
  getAttendanceHandler
);

/**
 * @openapi
 * /api/attendance:
 *   post:
 *     summary: Manually create an attendance record (HR Manager and above)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, date]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *               checkIn:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               checkOut:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [present, absent]
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Attendance record created.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Selected employee does not exist.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...HR_ROLES), validate(createAttendanceSchema), createAttendanceHandler);

/**
 * @openapi
 * /api/attendance/{id}:
 *   patch:
 *     summary: Correct an attendance record (HR Manager and above)
 *     tags: [Attendance]
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
 *         description: Attendance record updated.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...HR_ROLES), validate(updateAttendanceSchema), updateAttendanceHandler);

/**
 * @openapi
 * /api/attendance/{id}:
 *   delete:
 *     summary: Delete an attendance record (HR Manager and above)
 *     tags: [Attendance]
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
 *         description: Attendance record deleted.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...HR_ROLES), validate(idParamOnlySchema), deleteAttendanceHandler);

export default router;
