import { Router } from 'express';
import { verifyProposal, verifyAllUpdatedProposals, getVerifications } from '../services/verify.service';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';

const router = Router();

const VerifySchema = z.object({
  proposalId: z.string().min(1).optional(),
});

// POST /api/v1/verify (OWNER only)
router.post('/', requireRole('OWNER'), validate({ body: VerifySchema }), async (req, res, next) => {
  try {
    const { proposalId } = req.body as z.infer<typeof VerifySchema>;

    if (proposalId) {
      const result = await verifyProposal(proposalId);
      res.json(result);
      return;
    }

    const results = await verifyAllUpdatedProposals();
    res.json(results);
    return;
  } catch (err) {
    next(err);
    return;
  }
});


router.get('/', async (_req, res, next) => {
  try {
    const verifications = await getVerifications();
    res.json(verifications);
  } catch (err) {
    next(err);
  }
});

export default router;
