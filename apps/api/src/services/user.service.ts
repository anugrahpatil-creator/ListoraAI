/**
 * User service for Multi-user role-based management.
 * Provides user lookup, registration, role assignment, and demo fallback profiles.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import type { UserRole } from '@bizlisting/shared';
import { env } from '../config/env';

export interface UserSummary {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

// In-memory demo users for fast testing / prototype demo mode
const DEMO_USERS: Record<string, { id: string; email: string; name: string; role: UserRole; passwordHash: string }> = {
  'owner@listora.ai': {
    id: 'user-owner-demo',
    email: 'owner@listora.ai',
    name: 'Business Owner',
    role: 'OWNER',
    // Hash for 'password123'
    passwordHash: '$2a$10$w3qgQ68v1r/tHkJ2LwL1re7Q1EcvB/4vV/GjQW729hL9tZvxEGyve',
  },
  'operator@listora.ai': {
    id: 'user-owner-demo',
    email: 'operator@listora.ai',
    name: 'Business Owner',
    role: 'OWNER',
    // Hash for 'password123'
    passwordHash: '$2a$10$w3qgQ68v1r/tHkJ2LwL1re7Q1EcvB/4vV/GjQW729hL9tZvxEGyve',
  },
  'viewer@listora.ai': {
    id: 'user-viewer-demo',
    email: 'viewer@listora.ai',
    name: 'Viewer User',
    role: 'VIEWER',
    // Hash for 'password123'
    passwordHash: '$2a$10$w3qgQ68v1r/tHkJ2LwL1re7Q1EcvB/4vV/GjQW729hL9tZvxEGyve',
  },
};

export async function findUserByEmail(email: string) {
  const normalized = email.toLowerCase().trim();

  // 1. Check demo users first (instant lookup for testing & demo accounts)
  if (DEMO_USERS[normalized]) {
    return DEMO_USERS[normalized];
  }

  // 2. Check database if available
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        passwordHash: user.password,
      };
    }
  } catch {
    // Database might not be connected in local standalone mode
  }

  // 3. Fallback for OWNER_EMAIL from env
  if (env.OWNER_EMAIL && normalized === env.OWNER_EMAIL.toLowerCase().trim()) {
    return {
      id: 'owner-env-user',
      email: env.OWNER_EMAIL,
      name: 'Business Owner',
      role: 'OWNER' as UserRole,
      passwordHash: env.OWNER_PASSWORD_HASH,
    };
  }

  return null;
}


export async function createUser(data: {
  email: string;
  name?: string;
  password: string;
  role?: UserRole;
}) {
  const normalized = data.email.toLowerCase().trim();
  const role: UserRole = data.role === 'VIEWER' ? 'VIEWER' : 'OWNER';
  const hashedPassword = await bcrypt.hash(data.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: data.name?.trim() || null,
        password: hashedPassword,
        role: role as any,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: ((user.role as string)?.toUpperCase() === 'VIEWER' ? 'VIEWER' : 'OWNER') as UserRole,
      createdAt: user.createdAt.toISOString(),
    };
  } catch {
    // Fallback in-memory registration for environments without Postgres
    const id = `user-${Date.now()}`;
    const record = {
      id,
      email: normalized,
      name: data.name?.trim() || 'New User',
      role,
      passwordHash: hashedPassword,
    };
    DEMO_USERS[normalized] = record;
    return {
      id,
      email: normalized,
      name: record.name,
      role,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function listUsers(): Promise<UserSummary[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (users.length > 0) {
      return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as UserRole,
        createdAt: u.createdAt.toISOString(),
      }));
    }
  } catch {
    // Fallback to demo users
  }

  // Return demo accounts
  return Object.values(DEMO_USERS).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: new Date().toISOString(),
  }));
}

export async function updateUserRole(userId: string, role: UserRole): Promise<UserSummary | null> {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as UserRole,
      createdAt: updated.createdAt.toISOString(),
    };
  } catch {
    // Check in demo users
    for (const u of Object.values(DEMO_USERS)) {
      if (u.id === userId) {
        u.role = role;
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: new Date().toISOString(),
        };
      }
    }
    return null;
  }
}
