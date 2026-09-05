import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { SalaryRuleCategory, SalaryRuleComputationMethod } from '../entities/SalaryRule';
import { paginationQuerySchema } from '../utils/pagination';
import {
  listSalaryRulesHandler,
  getSalaryRuleHandler,
  createSalaryRuleHandler,
  updateSalaryRuleHandler,
  deleteSalaryRuleHandler,
} from '../controllers/salary-rule.controller';

const router = Router();

/** HR Payroll User has read-only access; only HR Payroll Manager/Admin can create/edit/delete. */
const READ_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];
const MANAGE_ROLES = [UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

const idParamSchema = z.object({ id: z.string().uuid() });
const idParamOnlySchema = z.object({ params: idParamSchema });

const listQuerySchema = z.object({
  query: z.object({ salaryStructureId: z.string().uuid().optional(), ...paginationQuerySchema }),
});

const ruleBodyBase = {
  name: z.string().min(1, 'Rule name is required.'),
  code: z.string().min(1, 'Code is required.'),
  category: z.nativeEnum(SalaryRuleCategory),
  sequence: z.number().int(),
  salaryStructureId: z.string().uuid('Select a salary structure.'),
  computationMethod: z.nativeEnum(SalaryRuleComputationMethod),
  value: z.number().optional(),
  formula: z.string().min(1).optional(),
};

const createSalaryRuleSchema = z.object({
  body: z.object(ruleBodyBase),
});

const updateSalaryRuleSchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: ruleBodyBase.name.optional(),
    code: ruleBodyBase.code.optional(),
    category: ruleBodyBase.category.optional(),
    sequence: ruleBodyBase.sequence.optional(),
    salaryStructureId: ruleBodyBase.salaryStructureId.optional(),
    computationMethod: ruleBodyBase.computationMethod.optional(),
    value: ruleBodyBase.value,
    formula: ruleBodyBase.formula,
  }),
});

/**
 * @openapi
 * /api/salary-rules:
 *   get:
 *     summary: List salary rules, optionally filtered by structure
 *     tags: [Salary Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: salaryStructureId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of salary rules.
 *       403:
 *         description: Caller lacks payroll access.
 */
router.get('/', authGuard, roleGuard(...READ_ROLES), validate(listQuerySchema), listSalaryRulesHandler);

/**
 * @openapi
 * /api/salary-rules/{id}:
 *   get:
 *     summary: Get one salary rule
 *     tags: [Salary Rules]
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
 *         description: Salary rule detail.
 *       404:
 *         description: Not found.
 */
router.get('/:id', authGuard, roleGuard(...READ_ROLES), validate(idParamOnlySchema), getSalaryRuleHandler);

/**
 * @openapi
 * /api/salary-rules:
 *   post:
 *     summary: Create a salary rule within a structure (HR Payroll Manager/Admin only)
 *     tags: [Salary Rules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, category, sequence, salaryStructureId, computationMethod]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [basic, allowance, deduction, gross, net]
 *               sequence:
 *                 type: integer
 *               salaryStructureId:
 *                 type: string
 *                 format: uuid
 *               computationMethod:
 *                 type: string
 *                 enum: [fixed, percentage, formula]
 *               value:
 *                 type: number
 *                 description: Fixed amount, or percentage-of-wage number. Required for fixed/percentage.
 *               formula:
 *                 type: string
 *                 description: Required for the formula computation method.
 *     responses:
 *       201:
 *         description: Salary rule created.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       404:
 *         description: Selected salary structure does not exist.
 *       422:
 *         description: Validation error.
 */
router.post('/', authGuard, roleGuard(...MANAGE_ROLES), validate(createSalaryRuleSchema), createSalaryRuleHandler);

/**
 * @openapi
 * /api/salary-rules/{id}:
 *   patch:
 *     summary: Update a salary rule (HR Payroll Manager/Admin only)
 *     tags: [Salary Rules]
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
 *         description: Salary rule updated.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       404:
 *         description: Not found.
 */
router.patch('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(updateSalaryRuleSchema), updateSalaryRuleHandler);

/**
 * @openapi
 * /api/salary-rules/{id}:
 *   delete:
 *     summary: Delete a salary rule (HR Payroll Manager/Admin only)
 *     tags: [Salary Rules]
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
 *         description: Salary rule deleted.
 *       403:
 *         description: Caller is not HR Payroll Manager/Admin.
 *       404:
 *         description: Not found.
 */
router.delete('/:id', authGuard, roleGuard(...MANAGE_ROLES), validate(idParamOnlySchema), deleteSalaryRuleHandler);

export default router;
