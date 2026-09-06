import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { EmployeeStatus, EmployeeType } from '../entities/Employee';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listEmployeesHandler,
  getEmployeeHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  deleteEmployeeHandler,
  getEmployeeFilterOptionsHandler,
} from '../controllers/employee.controller';

const router = Router();

/** Per root CLAUDE.md roles table: HR Manager and every payroll/admin role above it have full CRUD on Employees. */
const MANAGE_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

/** Only feeds the Payroll Dashboard's filter dropdowns — gated the same as the Dashboard itself. */
const DASHBOARD_READ_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });
const listQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().min(1).optional(),
    status: z.nativeEnum(EmployeeStatus).optional(),
    ...paginationQuerySchema,
  }),
});

const PHONE_REGEX = /^[0-9]{10}$/;
const NAME_HAS_LETTER_REGEX = /[^\d\s]/;

/** 10-digit numbers only for now — no country code or formatting characters. */
function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const phoneSchema = z
  .string()
  .refine(isValidPhone, 'Enter a valid 10-digit phone number.')
  .nullable()
  .optional();

const bankAccountSchema = z
  .string()
  .regex(/^[0-9]{9,18}$/, 'Bank account number must be 9-18 digits.')
  .nullable()
  .optional();

const nameSchema = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .refine((v) => NAME_HAS_LETTER_REGEX.test(v), `${label} can't be only numbers.`);

const dateOfBirthSchema = z
  .string()
  .date()
  .refine((dob) => new Date(dob) <= new Date(), 'Date of birth cannot be in the future.')
  .refine((dob) => calculateAge(dob) >= 15, 'Employee must be at least 15 years old.')
  .refine((dob) => calculateAge(dob) <= 100, 'Enter a realistic date of birth.')
  .nullable()
  .optional();

const employeeBodyBase = {
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required.')
    .max(100, 'Full name must be under 100 characters.')
    .refine((v) => NAME_HAS_LETTER_REGEX.test(v), "Full name can't be only numbers."),
  workEmail: z.string().trim().email('Enter a valid work email.'),
  jobPosition: z.string().min(1).nullable().optional(),
  department: z.string().min(1).nullable().optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  employeeType: z.nativeEnum(EmployeeType).optional(),
  managerId: z.string().uuid().nullable().optional(),
  workingScheduleId: z.string().uuid().nullable().optional(),
  workLocation: z.string().min(1).nullable().optional(),
  company: z.string().min(1).nullable().optional(),
  phone: phoneSchema,
  personalEmail: z.string().trim().email('Enter a valid personal email.').nullable().optional(),
  homeAddress: z.string().min(1).nullable().optional(),
  dateOfBirth: dateOfBirthSchema,
  emergencyContactName: nameSchema('Emergency contact name').nullable().optional(),
  emergencyContactPhone: phoneSchema,
  bankAccountNumber: bankAccountSchema,
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive partial match on full name.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Page of employees, with a `meta` pagination block.
 *       403:
 *         description: Caller lacks HR/payroll access.
 */
router.get('/', authGuard, roleGuard(...MANAGE_ROLES), validate(listQuerySchema), listEmployeesHandler);

/**
 * @openapi
 * /api/employees/filter-options:
 *   get:
 *     summary: Distinct department/company values across all employees (feeds the Payroll Dashboard's filter dropdowns)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ departments: string[], companies: string[] } — both alphabetically sorted, non-null values only."
 *       403:
 *         description: Caller lacks payroll access.
 */
// Registered before /:id so the literal path isn't swallowed by the uuid param route.
router.get('/filter-options', authGuard, roleGuard(...DASHBOARD_READ_ROLES), getEmployeeFilterOptionsHandler);

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
