import { Router } from 'express';
import { applyAllApprovedProposals, applyProposal, getUpdateResults } from '../services/update.service';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';

const router = Router();

const ApplySchema = z.object({
  proposalId: z.string().min(1).optional(),
});

/** POST /api/v1/updates — apply approved proposals (OWNER only) */
router.post('/', requireRole('OWNER'), validate({ body: ApplySchema }), async (req, res, next) => {
  try {
    const { proposalId } = req.body as z.infer<typeof ApplySchema>;

    if (proposalId) {
      const result = await applyProposal(proposalId);
      res.json(result);
      return;
    }

    const results = await applyAllApprovedProposals();
    res.json(results);
    return;
  } catch (err) {
    next(err);
    return;
  }
});


/** GET /api/v1/updates — list update results */
router.get('/', async (_req, res, next) => {
  try {
    const results = await getUpdateResults();
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
