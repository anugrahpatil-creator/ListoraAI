import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole } from '../../src/middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../src/db/prisma';
import { findUserByEmail, listUsers } from '../../src/services/user.service';

describe('Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async () => null);
    vi.spyOn(prisma.user, 'findMany').mockImplementation(async () => []);
  });

  it('allows access when user has the required role', () => {
    const middleware = requireRole('OWNER');
    const req = { user: { email: 'owner@listora.ai', role: 'OWNER' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects access with 403 when user lacks the required role', () => {
    const middleware = requireRole('OWNER');
    const req = { user: { email: 'viewer@listora.ai', role: 'VIEWER' } } as Request;
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("role 'VIEWER' has read-only permissions"),
      }),
    );
  });

  it('retrieves default demo accounts with respective roles', async () => {
    const owner = await findUserByEmail('owner@listora.ai');
    expect(owner).not.toBeNull();
    expect(owner?.role).toBe('OWNER');

    const viewer = await findUserByEmail('viewer@listora.ai');
    expect(viewer).not.toBeNull();
    expect(viewer?.role).toBe('VIEWER');
  });

  it('lists registered workspace users', async () => {
    const users = await listUsers();
    expect(users.length).toBeGreaterThanOrEqual(2);
    const roles = users.map((u) => u.role);
    expect(roles).toContain('OWNER');
    expect(roles).toContain('VIEWER');
    expect(roles).not.toContain('ADMIN');
  });
});
