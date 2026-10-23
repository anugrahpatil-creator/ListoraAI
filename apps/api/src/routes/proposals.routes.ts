/**
 * Proposals routes.
 *
 * Route order matters: /analyze and /create must be registered BEFORE /:id
 * to prevent Express from matching "analyze" or "create" as an :id parameter.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  getProposals,
  getProposalById,
  approveProposal,
  rejectProposal,
  createProposal,
  CreateProposalSchema,
} from '../services/proposal.service';
import { runAgent } from '../agent/agent';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// --- Collection endpoints (must come before /:id routes) ---

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const proposals = await getProposals({ status: status as string | undefined });
    res.json(proposals);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/proposals/analyze
 * Triggers the AI agent to investigate mismatches and create proposals.
 * MUST be registered before /:id routes.
 */
router.post('/analyze', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mismatchIds, useStrongModel } = req.body as {
      mismatchIds?: string[];
      useStrongModel?: boolean;
    };
    const result = await runAgent({ mismatchIds, useStrongModel });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/proposals
 * Creates a new proposal (agent or owner action).
 */
router.post(
  '/',
  requireRole('OWNER'),
  validate({ body: CreateProposalSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await createProposal(req.body, req.user!.email);
      res.status(201).json(proposal);
    } catch (err) {
      next(err);
    }
  },
);

// --- Individual proposal endpoints ---

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proposal = await getProposalById(req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    res.json(proposal);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await approveProposal(req.params.id, req.user!.email);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await rejectProposal(req.params.id, req.user!.email);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
