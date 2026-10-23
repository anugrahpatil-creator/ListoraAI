import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getAllPlatformConnections,
  getPlatformConnection,
  updatePlatformConnection,
  testPlatformConnection,
  type ConnectPayload,
} from '../services/platform.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/v1/platforms — Public or authenticated to read connection statuses
router.get('/', async (_req, res, next) => {
  try {
    const platforms = getAllPlatformConnections();
    res.json(platforms);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/platforms/:id — Get a single platform
router.get('/:id', async (req, res, next) => {
  try {
    const platform = getPlatformConnection(req.params.id);
    if (!platform) {
      throw new AppError(404, `Platform not found: ${req.params.id}`);
    }
    res.json(platform);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platforms/:id/connect — Configure/connect a platform (OWNER only)
router.post('/:id/connect', requireAuth, requireRole('OWNER'), async (req, res, next) => {
  try {
    const payload = req.body as ConnectPayload;
    const result = await updatePlatformConnection(req.params.id, payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platforms/:id/test — Probe connection health
router.post('/:id/test', requireAuth, async (req, res, next) => {
  try {
    const result = await testPlatformConnection(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/platforms/:id/disconnect — Disconnect a platform (OWNER only)
router.post('/:id/disconnect', requireAuth, requireRole('OWNER'), async (req, res, next) => {
  try {
    const result = await updatePlatformConnection(req.params.id, { mode: 'DISCONNECT' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
