/**
 * Backfill script for the XP System
 *
 * Run after applying the XP system migration to initialize existing users:
 * 1. Generate referral codes for all users
 * 2. Initialize login streaks from session history
 * 3. Check and claim all eligible milestones based on existing activity
 * 4. Recalculate levels from final XP
 *
 * Usage: npx ts-node src/scripts/backfillXpSystem.ts
 */

import { prisma } from '../lib/prisma';
import { XpService } from '../services/xpService';
import { LoginStreakService } from '../services/loginStreakService';
import { ReferralService } from '../services/referralService';
import { MilestoneService } from '../services/milestoneService';

async function backfillXpSystem() {
  console.log('Starting XP system backfill...\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, referralCode: true },
  });

  console.log(`Found ${users.length} users to process\n`);

  let processed = 0;
  let errors = 0;

  for (const user of users) {
    try {
      console.log(`Processing user ${user.id} (${user.email})...`);

      // 1. Generate referral code if not exists
      if (!user.referralCode) {
        try {
          const code = await ReferralService.generateReferralCode(user.id);
          console.log(`  - Generated referral code: ${code}`);
        } catch (err) {
          console.log(`  - Referral code generation skipped: ${(err as Error).message}`);
        }
      } else {
        console.log(`  - Referral code already exists: ${user.referralCode}`);
      }

      // 2. Initialize login streak from session history
      try {
        const streakResult = await LoginStreakService.initializeFromSessionHistory(user.id);
        console.log(`  - Login streak initialized: ${streakResult.currentStreak} days (longest: ${streakResult.longestStreak})`);

        if (streakResult.newMilestonesClaimed.length > 0) {
          console.log(`  - Claimed ${streakResult.newMilestonesClaimed.length} login streak milestones`);
        }
      } catch (err) {
        console.log(`  - Login streak initialization failed: ${(err as Error).message}`);
      }

      // 3. Check and claim all eligible milestones
      try {
        const claimedMilestones = await MilestoneService.checkAllMilestones(user.id);
        if (claimedMilestones.length > 0) {
          console.log(`  - Claimed ${claimedMilestones.length} milestones:`);
          for (const m of claimedMilestones) {
            console.log(`    * ${m.category}: ${m.threshold} (+${m.xpAwarded} XP)`);
          }
        } else {
          console.log(`  - No new milestones to claim`);
        }
      } catch (err) {
        console.log(`  - Milestone check failed: ${(err as Error).message}`);
      }

      // 4. Recalculate level from final XP
      try {
        await XpService.recalculateUserLevel(user.id);
        const status = await XpService.getXpStatus(user.id);
        console.log(`  - Final XP: ${status.xp}, Level: ${status.level} (${status.multiplier}x multiplier)`);
      } catch (err) {
        console.log(`  - Level recalculation failed: ${(err as Error).message}`);
      }

      processed++;
      console.log(`  Done!\n`);
    } catch (error) {
      console.error(`  ERROR processing user ${user.id}: ${(error as Error).message}\n`);
      errors++;
    }
  }

  console.log('='.repeat(50));
  console.log(`Backfill complete!`);
  console.log(`  Processed: ${processed}/${users.length} users`);
  console.log(`  Errors: ${errors}`);
  console.log('='.repeat(50));
}

// Run the script
backfillXpSystem()
  .then(() => {
    console.log('\nBackfill finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nBackfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
