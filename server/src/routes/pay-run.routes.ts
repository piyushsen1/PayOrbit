import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import {
  listPayRunsHandler,
  getPayRunHandler,
  createPayRunHandler,
  deletePayRunHandler,
  computePayRunHandler,
  validatePayRunHandler,
  markPayRunPaidHandler,
  sendPayslipsHandler,
} from '../controllers/pay-run.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Payroll User has create/read/update on Payruns; HR Payroll Manager/Admin add delete. */
const READ_WRITE_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];
const DELETE_ROLES = [UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const createPayRunSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required.'),
    salaryStructureId: z.string().uuid('Select a salary structure.'),
    periodStart: z.string().date('Enter a valid period start date.'),
    periodEnd: z.string().date('Enter a valid period end date.'),
    employeeIds: z.array(z.string().uuid()).min(1, 'Select at least one employee.'),
  }),
});

/**
 * @openapi
 * /api/pay-runs:
 *   get:
 *     summary: List pay runs (with employeeCount/warningCount)
 *     tags: [Pay Runs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pay runs.
 *       403:
 *         description: Caller lacks payroll access.
 */
router.get('/', authGuard, roleGuard(...READ_WRITE_ROLES), listPayRunsHandler);

/**
 * @openapi
 * /api/pay-runs/{id}:
 *   get:
 *     summary: Get one pay run with its payslips
 *     tags: [Pay Runs]
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
 *         description: Pay run detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), getPayRunHandler);

/**
 * @openapi
 * /api/pay-runs:
 *   post:
 *     summary: Create a pay run with its employee selection (generates one draft payslip per employee)
 *     tags: [Pay Runs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, salaryStructureId, periodStart, periodEnd, employeeIds]
 *             properties:
 *               name:
 *                 type: string
 *               salaryStructureId:
 *                 type: string
 *                 format: uuid
 *               periodStart:
 *                 type: string
 *                 format: date
 *               periodEnd:
 *                 type: string
 *                 format: date
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Pay run created.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Selected salary structure or an employee does not exist.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...READ_WRITE_ROLES), validate(createPayRunSchema), createPayRunHandler);

/**
 * @openapi
 * /api/pay-runs/{id}:
 *   delete:
 *     summary: Delete a pay run (cascades its payslips) — HR Payroll Manager/Admin only
 *     tags: [Pay Runs]
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
 *         description: Pay run deleted.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...DELETE_ROLES), validate(idParamOnlySchema), deletePayRunHandler);

/**
 * @openapi
 * /api/pay-runs/{id}/compute:
 *   post:
 *     summary: (Re)compute every payslip in this draft pay run from its applicable contract + the salary structure's rules
 *     tags: [Pay Runs]
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
 *         description: Pay run recomputed.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Only draft pay runs can be recomputed.
 */
router.post('/:id/compute', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), computePayRunHandler);

/**
 * @openapi
 * /api/pay-runs/{id}/validate:
 *   post:
 *     summary: Lock in a computed draft pay run — no further recomputation after this
 *     tags: [Pay Runs]
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
 *         description: Pay run validated.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Not draft, or not every payslip has been computed.
 */
router.post('/:id/validate', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), validatePayRunHandler);

/**
 * @openapi
 * /api/pay-runs/{id}/mark-paid:
 *   post:
 *     summary: Mark a validated pay run (and all its payslips) as paid
 *     tags: [Pay Runs]
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
 *         description: Pay run marked paid.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Only validated pay runs can be marked paid.
 */
router.post('/:id/mark-paid', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), markPayRunPaidHandler);

/**
 * @openapi
 * /api/pay-runs/{id}/send-payslips:
 *   post:
 *     summary: Bulk-email every payslip's PDF to its employee's work email
 *     tags: [Pay Runs]
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
 *         description: Send result — { sent, failed, failures[] }.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Email not configured, or not every payslip has been computed.
 */
router.post('/:id/send-payslips', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), sendPayslipsHandler);

export default router;
