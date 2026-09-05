import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import {
  listContractsHandler,
  getContractHandler,
  createContractHandler,
  updateContractHandler,
  deleteContractHandler,
} from '../controllers/contract.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it have full CRUD on Contracts. */
const MANAGE_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const listQuerySchema = z.object({
  query: z.object({ employeeId: z.string().uuid().optional() }),
});

const createContractSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid('Select an employee.'),
    startDate: z.string().date('Enter a valid start date.'),
    endDate: z.string().date().nullable().optional(),
    wagePerMonth: z.number().positive('Enter a valid wage per month.'),
    workingScheduleId: z.string().uuid().nullable().optional(),
    salaryStructureId: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
  }),
});

const updateContractSchema = z.object({
  params: idParamSchema,
  body: z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().nullable().optional(),
    wagePerMonth: z.number().positive().optional(),
    workingScheduleId: z.string().uuid().nullable().optional(),
    salaryStructureId: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
  }),
});

/**
 * @openapi
 * /api/contracts:
 *   get:
 *     summary: List contracts (with derived Running/Expired status), optionally filtered by employee
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of contracts.
 *       403:
 *         description: Caller lacks HR/payroll access.
 */
router.get('/', authGuard, roleGuard(...MANAGE_ROLES), validate(listQuerySchema), listContractsHandler);

/**
 * @openapi
 * /api/contracts/{id}:
 *   get:
 *     summary: Get one contract
 *     tags: [Contracts]
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
 *         description: Contract detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), getContractHandler);

/**
 * @openapi
 * /api/contracts:
 *   post:
 *     summary: Create a contract (contract number auto-generated; department/jobPosition snapshotted from the employee)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, startDate, wagePerMonth]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               wagePerMonth:
 *                 type: number
 *               workingScheduleId:
 *                 type: string
 *                 format: uuid
 *               salaryStructureId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contract created.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Selected employee, working schedule, or salary structure does not exist.
 *       422:
 *         description: Validation error, or the employee already has a running contract.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createContractSchema), createContractHandler);

/**
 * @openapi
 * /api/contracts/{id}:
 *   patch:
 *     summary: Update a contract (employee cannot be changed once created)
 *     tags: [Contracts]
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
 *         description: Contract updated.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 *       422:
 *         description: Validation error, or the employee already has a running contract.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateContractSchema), updateContractHandler);

/**
 * @openapi
 * /api/contracts/{id}:
 *   delete:
 *     summary: Delete a contract
 *     tags: [Contracts]
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
 *         description: Contract deleted.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteContractHandler);

export default router;
