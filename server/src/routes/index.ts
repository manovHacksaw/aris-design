import { Router } from 'express';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';

import phoneRoutes from './phoneRoutes';
import brandApplicationRoutes from './brandApplicationRoutes';
import brandClaimRoutes from './brandClaimRoutes';
import brandRoutes from './brandRoutes';
import adminRoutes from './adminRoutes';
import searchRoutes from './searchRoutes';
import eventRoutes from './eventRoutes';
import leaderboardRoutes from './leaderboardRoutes';
import notificationRoutes from './notificationRoutes';
import analyticsRoutes from './analyticsRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import aiRoutes from './aiRoutes';
import xpRoutes from './xpRoutes';
import brandXpRoutes from './brandXpRoutes';
import rewardsRoutes from './rewardsRoutes';
import debugRoutes from './debugRoutes.js';
import exploreRoutes from './exploreRoutes.js';
import draftRoutes from './draftRoutes.js';

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

// Admin routes
console.log('Mounting admin routes at /admin');
router.use('/admin', adminRoutes);

// Debug routes (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Mounting debug routes at /debug (development only)');
  router.use('/debug', debugRoutes);
}

export default router;

