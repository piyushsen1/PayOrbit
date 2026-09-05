import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { getDashboardHandler } from '../controllers/dashboard.controller';

const router = Router();

/** Shows salary figures, so gated the same as Payruns/Payslips — HR Payroll User and above. */
const READ_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const querySchema = z.object({
  query: z.object({
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    department: z.string().min(1).optional(),
    company: z.string().min(1).optional(),
  }),
});

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     summary: Payroll dashboard — KPIs, charts, and panels aggregated read-only from Employee/Contract/Attendance/Time Off/Payroll data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Defaults to the start of the current month.
 *       - in: query
 *         name: periodEnd
 *         schema:
 *           type: string
 *           format: date
 *         description: Defaults to the end of the current month.
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard payload — { kpis, charts, panels, warningCount }.
 *       403:
 *         description: Caller lacks payroll access.
 */
router.get('/', authGuard, roleGuard(...READ_ROLES), validate(querySchema), getDashboardHandler);

export default router;
