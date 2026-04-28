import { MilestoneCategory } from '@prisma/client';
import { MilestoneConfig, LevelConfig } from '../types/xp';

export const REFERRAL_BASE_XP = 5;

export const USER_LEVEL_THRESHOLDS: LevelConfig[] = [
  { level: 1, xpRequired: 0, multiplier: 1.0 },
  { level: 2, xpRequired: 100, multiplier: 1.2 },
  { level: 3, xpRequired: 500, multiplier: 1.5 },
  { level: 4, xpRequired: 1000, multiplier: 2.0 },
  { level: 5, xpRequired: 2500, multiplier: 2.5 },
  { level: 6, xpRequired: 5000, multiplier: 3.0 },
  { level: 7, xpRequired: 10000, multiplier: 3.5 },
  { level: 8, xpRequired: 15000, multiplier: 4.0 },
];

export const MILESTONE_CONFIGS: Record<MilestoneCategory, MilestoneConfig[]> = {
  VOTES_CAST: [
    { threshold: 10, xp: 10 },
    { threshold: 25, xp: 20 },
    { threshold: 75, xp: 50 },
    { threshold: 200, xp: 100 },
    { threshold: 500, xp: 250 },
    { threshold: 1000, xp: 500 },
    { threshold: 2000, xp: 1000 },
  ],
  TOP_VOTES: [
    { threshold: 3, xp: 10 },
    { threshold: 10, xp: 20 },
    { threshold: 25, xp: 50 },
    { threshold: 50, xp: 100 },
    { threshold: 100, xp: 250 },
    { threshold: 200, xp: 500 },
    { threshold: 300, xp: 1000 },
  ],
  LOGIN_STREAK: [
    { threshold: 3, xp: 10 },
    { threshold: 7, xp: 20 },
    { threshold: 15, xp: 50 },
    { threshold: 30, xp: 100 },
    { threshold: 60, xp: 250 },
    { threshold: 100, xp: 500 },
    { threshold: 250, xp: 1000 },
  ],
  POSTS_CREATED: [
    { threshold: 5, xp: 10 },
    { threshold: 10, xp: 20 },
    { threshold: 15, xp: 50 },
    { threshold: 50, xp: 100 },
    { threshold: 100, xp: 250 },
    { threshold: 250, xp: 500 },
    { threshold: 500, xp: 1000 },
  ],
  VOTES_RECEIVED: [
    { threshold: 100, xp: 10 },
    { threshold: 200, xp: 20 },
    { threshold: 500, xp: 50 },
    { threshold: 1000, xp: 100 },
    { threshold: 2500, xp: 250 },
    { threshold: 5000, xp: 500 },
    { threshold: 10000, xp: 1000 },
  ],
  TOP_3_CONTENT: [
    { threshold: 2, xp: 10 },
    { threshold: 5, xp: 20 },
    { threshold: 10, xp: 50 },
    { threshold: 20, xp: 100 },
    { threshold: 40, xp: 250 },
    { threshold: 75, xp: 500 },
    { threshold: 100, xp: 1000 },
  ],
  REFERRAL: [
    { threshold: 5, xp: 10 },
    { threshold: 50, xp: 20 },
    { threshold: 125, xp: 50 },
    { threshold: 250, xp: 100 },
    { threshold: 500, xp: 250 },
    { threshold: 1250, xp: 500 },
    { threshold: 2500, xp: 1000 },
  ],
};
