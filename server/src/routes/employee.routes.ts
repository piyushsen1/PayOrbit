import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { EmployeeStatus, EmployeeType } from '../entities/Employee';
import {
  listEmployeesHandler,
  getEmployeeHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  deleteEmployeeHandler,
} from '../controllers/employee.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it have full CRUD on Employees. */
const MANAGE_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const employeeBodyBase = {
  fullName: z.string().min(1, 'Full name is required.'),
  workEmail: z.string().email('Enter a valid work email.'),
  jobPosition: z.string().min(1).nullable().optional(),
  department: z.string().min(1).nullable().optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  employeeType: z.nativeEnum(EmployeeType).optional(),
  managerId: z.string().uuid().nullable().optional(),
  workingScheduleId: z.string().uuid().nullable().optional(),
  workLocation: z.string().min(1).nullable().optional(),
  company: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  personalEmail: z.string().email().nullable().optional(),
  homeAddress: z.string().min(1).nullable().optional(),
  dateOfBirth: z.string().date().nullable().optional(),
  emergencyContactName: z.string().min(1).nullable().optional(),
  emergencyContactPhone: z.string().min(1).nullable().optional(),
  bankAccountNumber: z.string().min(1).nullable().optional(),
};

const createEmployeeSchema = z.object({
  body: z.object(employeeBodyBase),
});

const updateEmployeeSchema = z.object({
  params: idParamSchema,
  body: z.object({ ...employeeBodyBase, fullName: employeeBodyBase.fullName.optional(), workEmail: employeeBodyBase.workEmail.optional() }),
});

/**
 * @openapi
 * /api/employees:
 *   get:
 *     summary: List employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees.
 *       403:
 *         description: Caller lacks HR/payroll access.
 */
router.get('/', authGuard, roleGuard(...MANAGE_ROLES), listEmployeesHandler);

/**
 * @openapi
 * /api/employees/{id}:
 *   get:
 *     summary: Get one employee
 *     tags: [Employees]
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
 *         description: Employee detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), getEmployeeHandler);

/**
 * @openapi
 * /api/employees:
 *   post:
 *     summary: Create an employee record
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, workEmail]
 *             properties:
 *               fullName:
 *                 type: string
 *               workEmail:
 *                 type: string
 *                 format: email
 *               jobPosition:
 *                 type: string
 *               department:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               employeeType:
 *                 type: string
 *                 enum: [full_time, part_time, contract, intern]
 *               managerId:
 *                 type: string
 *                 format: uuid
 *               workingScheduleId:
 *                 type: string
 *                 format: uuid
 *               workLocation:
 *                 type: string
 *               company:
 *                 type: string
 *               phone:
 *                 type: string
 *               personalEmail:
 *                 type: string
 *                 format: email
 *               homeAddress:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee created.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Selected manager or working schedule does not exist.
 *       409:
 *         description: Work email already in use.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createEmployeeSchema), createEmployeeHandler);

/**
 * @openapi
 * /api/employees/{id}:
 *   patch:
 *     summary: Update an employee record
 *     tags: [Employees]
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
 *         description: Employee updated.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Employee, manager, or working schedule not found.
 *       422:
 *         description: Validation error.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateEmployeeSchema), updateEmployeeHandler);

/**
 * @openapi
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete an employee record
 *     tags: [Employees]
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
 *         description: Employee deleted.
 *       403:
 *         description: Caller lacks HR/payroll access.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteEmployeeHandler);

export default router;
