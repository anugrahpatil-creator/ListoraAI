/**
 * Auth routes: POST /auth/login, POST /auth/register, POST /auth/logout, GET /auth/me,
 * plus admin user-management routes: GET /auth/users, PATCH /auth/users/:id/role
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { recordAudit } from '../services/audit.service';
import {
  findUserByEmail,
  createUser,
  listUsers,
  updateUserRole,
} from '../services/user.service';
import type { UserRole } from '@bizlisting/shared';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(['OWNER', 'VIEWER', 'OPERATOR']).optional(),
});

const UpdateRoleSchema = z.object({
  role: z.enum(['OWNER', 'VIEWER', 'OPERATOR']),
});

const COOKIE_NAME = 'session';
const TOKEN_EXPIRY = '8h';

router.post('/login', validate({ body: LoginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof LoginSchema>;

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password with bcrypt (or allow demo default)
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    } catch {
      passwordMatch = false;
    }

    // Convenience check for demo password
    if (!passwordMatch && password === 'password123') {
      passwordMatch = true;
    }

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, env.SESSION_SECRET, { expiresIn: TOKEN_EXPIRY });
    const isProduction = env.NODE_ENV === 'production';

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await recordAudit('USER_LOGIN', user.role === 'OWNER' ? 'owner' : 'viewer', {
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Logged in successfully',
      user: payload,
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

router.post('/register', validate({ body: RegisterSchema }), async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body as z.infer<typeof RegisterSchema>;

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const newUser = await createUser({
      email,
      password,
      name,
      role: role as UserRole,
    });

    const payload = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = jwt.sign(payload, env.SESSION_SECRET, { expiresIn: TOKEN_EXPIRY });
    const isProduction = env.NODE_ENV === 'production';

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await recordAudit('USER_REGISTERED', 'system', {
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: payload,
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out' });
  return;
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
  return;
});

/**
 * GET /auth/users — Owner only: list all registered and demo users
 */
router.get('/users', requireAuth, requireRole('OWNER'), async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
    return;
  } catch (err) {
    next(err);
    return;
  }
});

/**
 * PATCH /auth/users/:id/role — Owner only: change a user's role
 */
router.patch(
  '/users/:id/role',
  requireAuth,
  requireRole('OWNER'),
  validate({ body: UpdateRoleSchema }),
  async (req, res, next) => {
    try {
      const { role: rawRole } = req.body as z.infer<typeof UpdateRoleSchema>;
      const role: UserRole = rawRole === 'VIEWER' ? 'VIEWER' : 'OWNER';
      const updated = await updateUserRole(req.params.id, role);
      if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await recordAudit('USER_ROLE_UPDATED', 'owner', {
        userId: req.params.id,
        newRole: role,
        changedBy: req.user!.email,
      });

      res.json(updated);
      return;
    } catch (err) {
      next(err);
      return;
    }
  },
);

export default router;
