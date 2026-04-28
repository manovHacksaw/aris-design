import logger from '../lib/logger.js';
import { Router } from 'express';
import userRoutes from './users/userRoutes.js';
import authRoutes from './auth/authRoutes.js';

import phoneRoutes from './users/phoneRoutes.js';
import brandApplicationRoutes from './brands/brandApplicationRoutes.js';
import brandClaimRoutes from './brands/brandClaimRoutes.js';
import brandRoutes from './brands/brandRoutes.js';
import adminRoutes from './admin/adminRoutes.js';
import searchRoutes from './discovery/searchRoutes.js';
import eventRoutes from './events/eventRoutes.js';
import leaderboardRoutes from './discovery/leaderboardRoutes.js';
import notificationRoutes from './social/notificationRoutes.js';
import analyticsRoutes from './analytics/analyticsRoutes.js';
import subscriptionRoutes from './social/subscriptionRoutes.js';
import aiRoutes from './ai/aiRoutes.js';
import xpRoutes from './xp/xpRoutes.js';
import brandXpRoutes from './brands/brandXpRoutes.js';
import rewardsRoutes from './rewards/rewardsRoutes.js';
import debugRoutes from './debug/debugRoutes.js';
import exploreRoutes from './discovery/exploreRoutes.js';
import draftRoutes from './drafts/draftRoutes.js';
import feedRoutes from './feed/feedRoutes.js';

const router = Router();

// Health check route
router.get('/health', async (_req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Health check failed:');
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// API info route
router.get('/', (_req, res) => {
  res.json({
    message: 'ARIS Server API',
    version: '1.0.0',
  });
});

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Search routes
router.use('/search', searchRoutes);

// Phone routes
router.use('/phone', phoneRoutes);

// Brand Application routes
router.use('/brand-application', brandApplicationRoutes);

// Brand Claim routes (public - these must come before authenticated brand routes)
router.use('/brand-claim', brandClaimRoutes);

// Authenticated Brand routes
router.use('/brands', brandRoutes);

// Event routes
router.use('/events', eventRoutes);

// Leaderboard routes
router.use('/leaderboard', leaderboardRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Subscription routes
router.use('/subscriptions', subscriptionRoutes);

// AI routes
router.use('/ai', aiRoutes);

// XP routes
router.use('/xp', xpRoutes);

// Brand XP routes
router.use('/brand-xp', brandXpRoutes);

// Rewards routes
router.use('/rewards', rewardsRoutes);

// Explore routes
router.use('/explore', exploreRoutes);

// Draft routes
router.use('/drafts', draftRoutes);

// Feed routes
router.use('/feed', feedRoutes);

// Admin routes
logger.info('Mounting admin routes at /admin');
router.use('/admin', adminRoutes);

// Debug routes (only in development)
if (process.env.NODE_ENV === 'development') {
  logger.info('Mounting debug routes at /debug (development only)');
  router.use('/debug', debugRoutes);
}

export default router;

