/**
 * Express application factory.
 * Registers all middleware and routes in the order specified by ARCHITECTURE.md §4.1.
 */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';

// Route imports
import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import profileRouter from './routes/profile.routes';
import listingsRouter from './routes/listings.routes';
import mismatchesRouter from './routes/mismatches.routes';
import proposalsRouter from './routes/proposals.routes';
import updatesRouter from './routes/updates.routes';
import verifyRouter from './routes/verify.routes';
import scoreRouter from './routes/score.routes';
import auditRouter from './routes/audit.routes';
import alertsRouter from './routes/alerts.routes';
import platformRouter from './routes/platform.routes';
import ratingsRouter from './routes/ratings.routes';
import reputationRouter from './routes/reputation.routes';


export function createApp() {
  const app = express();

  // --- Middleware ---
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());

  // --- Public routes ---
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/api/v1/ratings', ratingsRouter);

  // --- Protected routes (require authentication) ---
  app.use('/api/v1/profile', requireAuth, profileRouter);
  app.use('/api/v1/listings', requireAuth, listingsRouter);
  app.use('/api/v1/mismatches', requireAuth, mismatchesRouter);
  app.use('/api/v1/proposals', requireAuth, proposalsRouter);
  app.use('/api/v1/updates', requireAuth, updatesRouter);
  app.use('/api/v1/verify', requireAuth, verifyRouter);
  app.use('/api/v1/score', requireAuth, scoreRouter);
  app.use('/api/v1/audit', requireAuth, auditRouter);
  app.use('/api/v1/alerts', requireAuth, alertsRouter);
  app.use('/api/v1/platforms', requireAuth, platformRouter);
  app.use('/api/v1/reputation', reputationRouter);

  // --- Centralized error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
