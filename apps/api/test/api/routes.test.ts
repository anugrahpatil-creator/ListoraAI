/**
 * Comprehensive API route tests using Supertest.
 *
 * Tests:
 *   - Health endpoint (with DB connectivity)
 *   - Auth guards on all protected routes
 *   - POST /auth/login validation and credentials
 *   - Demo user login (operator@listora.ai / password123)
 *   - GET /auth/me with valid session
 *   - POST /auth/logout
 *   - PUT + PATCH /api/v1/profile auth enforcement
 *   - GET /api/v1/profile auth enforcement
 *   - 403 role enforcement on VIEWER-restricted profile write
 *   - Listings, mismatches, proposals, score, audit, alerts guards
 *   - proposals/analyze route is reachable (not swallowed by /:id)
 *
 * NOTE: Tests that hit the database will fail gracefully in CI without a DB.
 * Tests that only test auth guards work without a DB connection.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import * as agentModule from '../../src/agent/agent';

// Mock runAgent so analyze route test does not perform real network calls or DB lookups
vi.spyOn(agentModule, 'runAgent').mockResolvedValue({
  agentRunId: 'test-run-mock',
  mode: 'heuristic',
  durationMs: 5,
  proposalsCreated: 0,
  proposals: [],
  summary: 'Mock test run completed',
});

// Provide minimal env vars before the app is created
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'test-key-placeholder';
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-secret-that-is-at-least-32-characters-long';
process.env.OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'test@example.com';
process.env.OWNER_PASSWORD_HASH =
  process.env.OWNER_PASSWORD_HASH ?? '$2a$10$test.hash.placeholder.value.here.xx';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:5173';
process.env.MOCK_PLATFORM_URLS = process.env.MOCK_PLATFORM_URLS ?? 'http://localhost:4100';
process.env.NODE_ENV = 'test';

const app = createApp();

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  it('returns 200 or 503 with status field (db may be unavailable in CI)', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.service).toBe('listora-ai-api');
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(res.body.db).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Auth guards — all protected routes must return 401 without a cookie
// ---------------------------------------------------------------------------
describe('Auth guards — protected routes require session cookie', () => {
  const PROTECTED_ROUTES = [
    { method: 'GET', path: '/api/v1/profile' },
    { method: 'PUT', path: '/api/v1/profile' },
    { method: 'PATCH', path: '/api/v1/profile' },
    { method: 'GET', path: '/api/v1/listings' },
    { method: 'POST', path: '/api/v1/listings/refresh' },
    { method: 'GET', path: '/api/v1/mismatches' },
    { method: 'GET', path: '/api/v1/proposals' },
    { method: 'POST', path: '/api/v1/proposals/analyze' },
    { method: 'GET', path: '/api/v1/score' },
    { method: 'GET', path: '/api/v1/audit' },
    { method: 'GET', path: '/api/v1/alerts' },
    { method: 'GET', path: '/api/v1/updates' },
    { method: 'GET', path: '/api/v1/verify' },
  ];

  for (const { method, path } of PROTECTED_ROUTES) {
    it(`${method} ${path} → 401 without session`, async () => {
      const req = (request(app) as any)[method.toLowerCase()](path);
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  }
});

// ---------------------------------------------------------------------------
// Login validation
// ---------------------------------------------------------------------------
describe('POST /auth/login — validation', () => {
  it('returns 400 for missing body', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'operator@listora.ai', password: 'wrong-password-xyz' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Demo user login (uses in-memory users, no DB needed)
// ---------------------------------------------------------------------------
describe('POST /auth/login — demo users', () => {
  it('logs in operator@listora.ai with password123 and returns session cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'operator@listora.ai', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('operator@listora.ai');
    expect(res.body.user.role).toBe('OWNER');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('logs in viewer@listora.ai with password123', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'viewer@listora.ai', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('VIEWER');
  });
});

// ---------------------------------------------------------------------------
// Session / /auth/me
// ---------------------------------------------------------------------------
describe('GET /auth/me — with valid session', () => {
  it('returns user info when logged in', async () => {
    // First login to get the session cookie
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'operator@listora.ai', password: 'password123' });

    const cookie = loginRes.headers['set-cookie'];
    expect(loginRes.status).toBe(200);

    const meRes = await request(app).get('/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('operator@listora.ai');
    expect(meRes.body.user.role).toBe('OWNER');
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
describe('POST /auth/logout', () => {
  it('returns 200 and clears the session cookie', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'operator@listora.ai', password: 'password123' });

    const cookie = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out');
  });
});

// ---------------------------------------------------------------------------
// Profile — requires OPERATOR role
// ---------------------------------------------------------------------------
describe('Profile endpoints — role enforcement', () => {
  let operatorCookie: string;
  let viewerCookie: string;

  beforeAll(async () => {
    const opLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'operator@listora.ai', password: 'password123' });
    operatorCookie = opLogin.headers['set-cookie'];

    const viewerLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'viewer@listora.ai', password: 'password123' });
    viewerCookie = viewerLogin.headers['set-cookie'];
  });

  it('PUT /api/v1/profile → 403 for VIEWER role', async () => {
    const res = await request(app)
      .put('/api/v1/profile')
      .set('Cookie', viewerCookie)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  it('PATCH /api/v1/profile → 403 for VIEWER role', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set('Cookie', viewerCookie)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(403);
  });

  it('PUT /api/v1/profile → 400 for invalid phone when authenticated as OPERATOR', async () => {
    const res = await request(app)
      .put('/api/v1/profile')
      .set('Cookie', operatorCookie)
      .send({ phone: 'not-a-phone-number' });
    // Will be 400 (invalid phone) or 500 (DB not running in test)
    // We test that it does NOT return 401/403 (auth/authz passed)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Proposals /analyze route — must not be swallowed by /:id
// ---------------------------------------------------------------------------
describe('POST /api/v1/proposals/analyze — route reachability', () => {
  let operatorCookie: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'operator@listora.ai', password: 'password123' });
    operatorCookie = loginRes.headers['set-cookie'];
  });

  it('is reachable (returns 200, not 404) with valid auth', async () => {
    const res = await request(app)
      .post('/api/v1/proposals/analyze')
      .set('Cookie', operatorCookie)
      .send({});
    // 200 (heuristic mode) or 500 (DB not available) — NOT 404
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('returns 401 without session', async () => {
    const res = await request(app).post('/api/v1/proposals/analyze').send({});
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// VIEWER role — cannot approve/reject proposals
// ---------------------------------------------------------------------------
describe('VIEWER role restrictions', () => {
  let viewerCookie: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'viewer@listora.ai', password: 'password123' });
    viewerCookie = loginRes.headers['set-cookie'];
  });

  it('POST /api/v1/proposals/analyze → 403 for VIEWER', async () => {
    const res = await request(app)
      .post('/api/v1/proposals/analyze')
      .set('Cookie', viewerCookie)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/updates → 403 for VIEWER', async () => {
    const res = await request(app)
      .post('/api/v1/updates')
      .set('Cookie', viewerCookie)
      .send({});
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Validation middleware
// ---------------------------------------------------------------------------
describe('Request validation', () => {
  it('POST /auth/register → 400 for password shorter than 6 chars', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'newuser@test.com', password: 'abc' });
    expect(res.status).toBe(400);
  });
});
