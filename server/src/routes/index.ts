import logger from '../lib/logger';
import { Router } from 'express';
import userRoutes from './users/userRoutes';
import authRoutes from './auth/authRoutes';

import phoneRoutes from './users/phoneRoutes';
import brandApplicationRoutes from './brands/brandApplicationRoutes';
import brandClaimRoutes from './brands/brandClaimRoutes';
import brandRoutes from './brands/brandRoutes';
import adminRoutes from './admin/adminRoutes';
import searchRoutes from './discovery/searchRoutes';
import eventRoutes from './events/eventRoutes';
import leaderboardRoutes from './discovery/leaderboardRoutes';
import notificationRoutes from './social/notificationRoutes';
import analyticsRoutes from './analytics/analyticsRoutes';
import subscriptionRoutes from './social/subscriptionRoutes';
import aiRoutes from './ai/aiRoutes';
import xpRoutes from './xp/xpRoutes';
import brandXpRoutes from './brands/brandXpRoutes';
import rewardsRoutes from './rewards/rewardsRoutes';
import debugRoutes from './debug/debugRoutes.js';
import exploreRoutes from './discovery/exploreRoutes.js';
import draftRoutes from './drafts/draftRoutes.js';
import feedRoutes from './feed/feedRoutes.js';

const router = Router();

// Health check route
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
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

