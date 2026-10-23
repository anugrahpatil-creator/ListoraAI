import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getProfile, updateProfile, ProfileUpdateSchema } from '../services/profile.service';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfile();
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// Handler shared by PUT and PATCH — partial update semantics
async function profileUpdateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await updateProfile(req.body, req.user!.email);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/profile — full or partial update (OWNER only)
router.put('/', requireRole('OWNER'), validate({ body: ProfileUpdateSchema }), profileUpdateHandler);

// PATCH /api/v1/profile — partial update alias (OWNER only)
router.patch('/', requireRole('OWNER'), validate({ body: ProfileUpdateSchema }), profileUpdateHandler);

export default router;
