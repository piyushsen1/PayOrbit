import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listPayslipsHandler,
  getPayslipHandler,
  getPayslipPdfHandler,
  markPayslipPaidHandler,
} from '../controllers/payslip.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Payroll User has create/read/update on Payslips; HR Payroll Manager/Admin add delete (not exposed here — payslips are only removed via their pay run). */
const READ_WRITE_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const listQuerySchema = z.object({
  query: z.object({
    employeeId: z.string().uuid().optional(),
    payRunId: z.string().uuid().optional(),
    ...paginationQuerySchema,
  }),
});

/**
 * @openapi
 * /api/payslips:
 *   get:
 *     summary: List payslips across pay runs, optionally filtered by employee or pay run
 *     tags: [Payslips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: payRunId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of payslips.
 *       403:
 *         description: Caller lacks payroll access.
 */
router.get('/', authGuard, roleGuard(...READ_WRITE_ROLES), validate(listQuerySchema), listPayslipsHandler);

/**
 * @openapi
 * /api/payslips/{id}:
 *   get:
 *     summary: Get one payslip with its rule-by-rule lines
 *     tags: [Payslips]
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
 *         description: Payslip detail.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), getPayslipHandler);

/**
 * @openapi
 * /api/payslips/{id}/pdf:
 *   get:
 *     summary: Download this payslip as a PDF
 *     tags: [Payslips]
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
 *         description: PDF file.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 */
router.get('/:id/pdf', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), getPayslipPdfHandler);

/**
 * @openapi
 * /api/payslips/{id}/mark-paid:
 *   post:
 *     summary: Mark one validated payslip as paid, independent of its pay run's own bulk mark-paid action
 *     tags: [Payslips]
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
 *         description: Payslip marked paid.
 *       403:
 *         description: Caller lacks payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Only a validated payslip can be marked paid.
 */
router.post('/:id/mark-paid', authGuard, roleGuard(...READ_WRITE_ROLES), validate(idParamOnlySchema), markPayslipPaidHandler);

export default router;
