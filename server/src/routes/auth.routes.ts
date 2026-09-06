import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../entities/User';
import { signupHandler, loginHandler, getMeHandler } from '../controllers/auth.controller';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required.'),
  }),
});

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: Account created; returns a JWT and the public user record.
 *       409:
 *         description: Email already in use.
 *       422:
 *         description: Validation error.
 */
router.post('/signup', validate(signupSchema), signupHandler);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Authenticate and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Authenticated; returns a JWT and the public user record.
 *       401:
 *         description: Invalid credentials.
 */
router.post('/login', validate(loginSchema), loginHandler);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated user's identity
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current user's account (id, email, role, status, employeeId).
 *       401:
 *         description: Missing, malformed, or invalid token.
 */
router.get('/me', authGuard, getMeHandler);

/**
 * @openapi
 * /api/auth/admin-check:
 *   get:
 *     summary: Reference route demonstrating roleGuard (admin-only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Caller is an admin.
 *       401:
 *         description: Missing, malformed, or invalid token.
 *       403:
 *         description: Caller is authenticated but not an admin.
 */
router.get('/admin-check', authGuard, roleGuard(UserRole.ADMIN), (req: Request, res: Response) => {
  res.success({ ok: true });
});

export default router;
