import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getRatingsOverview,
  getReviews,
  getAIReputationInsights,
  runAIReputationAnalysis,
  generateAIResponseDraft,
  saveReviewResponse,
  publishReviewResponse,
  getReputationSettings,
  updateReputationSettings,
} from '../services/reputation.service';

const router = Router();

const TimeRangeQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d']).optional(),
});

const ReviewsQuerySchema = z.object({
  platform: z.string().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  maxRating: z.coerce.number().min(1).max(5).optional(),
  sentiment: z.enum(['ALL', 'POSITIVE', 'NEUTRAL', 'NEGATIVE']).optional(),
  responseStatus: z.enum(['ALL', 'UNANSWERED', 'ANSWERED', 'DRAFT', 'UNSUPPORTED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional(),
});

const SaveResponseSchema = z.object({
  responseText: z.string().min(2, 'Response text must be at least 2 characters'),
  approved: z.boolean().default(false),
});

const UpdateSettingsSchema = z.object({
  lowRatingThreshold: z.number().min(1).max(5).optional(),
  alertOnLowRating: z.boolean().optional(),
  alertOnUnanswered: z.boolean().optional(),
});

/**
 * GET /api/v1/reputation/overview
 * Returns cross-platform ratings summary, review-count-weighted overall rating,
 * platform comparison metrics, and historical trend snapshots.
 */
router.get(
  '/overview',
  requireAuth,
  validate({ query: TimeRangeQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { timeRange } = req.query as { timeRange?: '7d' | '30d' | '90d' };
      const overview = await getRatingsOverview(timeRange || '30d');
      res.json(overview);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/reputation/reviews
 * Returns filterable, searchable, sorted reviews with sentiment and response status.
 */
router.get(
  '/reviews',
  requireAuth,
  validate({ query: ReviewsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getReviews(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/reputation/insights
 * Returns AI-generated reputation insights. (Owner & Viewer can read)
 */
router.get('/insights', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const insights = await getAIReputationInsights();
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/reputation/insights/analyze
 * Triggers a fresh AI analysis of customer reviews. (Owner only)
 */
router.post(
  '/insights/analyze',
  requireAuth,
  requireRole('OWNER'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analysis = await runAIReputationAnalysis();
      res.json(analysis);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/reputation/reviews/:id/generate-response
 * Generates an AI review response draft tailored to sentiment guidelines. (Owner only)
 */
router.post(
  '/reviews/:id/generate-response',
  requireAuth,
  requireRole('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.user?.role === 'VIEWER' ? 'VIEWER' : 'OWNER';
      const result = await generateAIResponseDraft(req.params.id, actor);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/reputation/reviews/:id/response
 * Saves an edited response draft or marks it approved. (Owner only)
 */
router.put(
  '/reviews/:id/response',
  requireAuth,
  requireRole('OWNER'),
  validate({ body: SaveResponseSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { responseText, approved } = req.body;
      const updated = await saveReviewResponse(req.params.id, responseText, approved);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/reputation/reviews/:id/publish
 * Publishes an approved response if platform supports it, or returns manual copy notice. (Owner only)
 */
router.post(
  '/reviews/:id/publish',
  requireAuth,
  requireRole('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await publishReviewResponse(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/reputation/settings
 * Returns reputation alert settings and low-rating threshold. (Owner & Viewer)
 */
router.get('/settings', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getReputationSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/reputation/settings
 * Updates low-rating threshold and alert preferences. (Owner only)
 */
router.put(
  '/settings',
  requireAuth,
  requireRole('OWNER'),
  validate({ body: UpdateSettingsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await updateReputationSettings(req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
