/**
 * Authentication and Role-based Authorization middleware.
 * Verifies HttpOnly JWT session cookie and enforces role permissions (OPERATOR, VIEWER).
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '@bizlisting/shared';

export interface SessionPayload {
  id?: string;
  email: string;
  name?: string | null;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.session;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.SESSION_SECRET) as SessionPayload;
    const rawRole = (payload.role as string)?.toUpperCase();
    const normalizedRole: UserRole = rawRole === 'VIEWER' ? 'VIEWER' : 'OWNER';

    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: normalizedRole,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

/**
 * Enforces role-based access control.
 * Mandatory 2-role system: OWNER (full authorized access) and VIEWER (read-only).
 *
 * Example: router.post('/approve', requireAuth, requireRole('OWNER'), handler);
 */
export function requireRole(...allowedRoles: (UserRole | 'OPERATOR' | 'ADMIN')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const currentRole: UserRole = req.user.role === 'VIEWER' ? 'VIEWER' : 'OWNER';

    // Allow OWNER if allowedRoles includes OWNER or legacy OPERATOR/ADMIN
    const isAllowed =
      allowedRoles.includes(currentRole) ||
      (currentRole === 'OWNER' && allowedRoles.some((r) => r === 'OPERATOR' || r === 'ADMIN' || r === 'OWNER'));

    if (!isAllowed) {
      res.status(403).json({
        error: `Forbidden: role '${currentRole}' has read-only permissions and cannot perform this operation.`,
        requiredRoles: allowedRoles,
        currentRole: currentRole,
      });
      return;
    }

    next();
  };
}
