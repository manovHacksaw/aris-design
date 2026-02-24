import { PrismaClient, MilestoneCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Milestone thresholds (must match your actual milestone configuration)
const MILESTONE_THRESHOLDS = {
    VOTES_CAST: [10, 25, 50, 100, 250, 500, 1000],
    POSTS_CREATED: [5, 10, 25, 50, 100],
    TOP_VOTES: [3, 10, 25, 50, 100],
    LOGIN_STREAK: [3, 7, 15, 30, 60, 90, 180, 365],
    EVENTS_JOINED: [5, 10, 25, 50, 100],
};

// XP rewards per milestone level (must match your actual XP rewards)
const MILESTONE_XP = {
    VOTES_CAST: [50, 100, 150, 200, 300, 500, 1000],
    POSTS_CREATED: [50, 100, 150, 200, 300],
    TOP_VOTES: [100, 150, 200, 300, 500],
    LOGIN_STREAK: [50, 100, 150, 200, 300, 500, 750, 1000],
    EVENTS_JOINED: [50, 100, 150, 200, 300],
};

async function recalculateUserXP() {
    console.log('🔄 Recalculating user XP based on current achievements...\n');

    try {
        const users = await prisma.user.findMany({
            include: {
                xpMilestonesClaimed: true,
                loginStreak: true,
            }
        });

        console.log(`📍 Found ${users.length} users to process\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                // Calculate which milestones SHOULD be claimed based on current stats
                const shouldBeClaimed: { category: MilestoneCategory; threshold: number; xp: number }[] = [];

                // Votes Cast milestones
                MILESTONE_THRESHOLDS.VOTES_CAST.forEach((threshold, index) => {
                    if (user.totalVotes >= threshold) {
                        shouldBeClaimed.push({
                            category: MilestoneCategory.VOTES_CAST,
                            threshold,
                            xp: MILESTONE_XP.VOTES_CAST[index]
                        });
                    }
                });

                // Posts Created milestones
                MILESTONE_THRESHOLDS.POSTS_CREATED.forEach((threshold, index) => {
                    if (user.totalSubmissions >= threshold) {
                        shouldBeClaimed.push({
                            category: MilestoneCategory.POSTS_CREATED,
                            threshold,
                            xp: MILESTONE_XP.POSTS_CREATED[index]
                        });
                    }
                });

                // Events Joined milestones - skip this category as it's not in the enum
                // MILESTONE_THRESHOLDS.EVENTS_JOINED.forEach((threshold, index) => {
                //   if (user.totalEventsParticipated >= threshold) {
                //     shouldBeClaimed.push({
                //       category: MilestoneCategory.EVENTS_JOINED,
                //       threshold,
                //       xp: MILESTONE_XP.EVENTS_JOINED[index]
                //     });
                //   }
                // });

                // Login Streak milestones (keep existing if they have a streak)
                if (user.loginStreak) {
                    MILESTONE_THRESHOLDS.LOGIN_STREAK.forEach((threshold, index) => {
                        if (user.loginStreak!.longestStreak >= threshold) {
                            shouldBeClaimed.push({
                                category: MilestoneCategory.LOGIN_STREAK,
                                threshold,
                                xp: MILESTONE_XP.LOGIN_STREAK[index]
                            });
                        }
                    });
                }

                // Calculate total XP from valid milestones
                const validXP = shouldBeClaimed.reduce((sum, m) => sum + m.xp, 0);

                // Get currently claimed milestones
                const currentlyClaimed = user.xpMilestonesClaimed;

                // Find milestones that should be removed (claimed but no longer valid)
                const toRemove = currentlyClaimed.filter(claimed => {
                    return !shouldBeClaimed.some(should =>
                        should.category === claimed.category && should.threshold === claimed.threshold
                    );
                });

                // Find milestones that should be added (valid but not claimed)
                const toAdd = shouldBeClaimed.filter(should => {
                    return !currentlyClaimed.some(claimed =>
                        claimed.category === should.category && claimed.threshold === should.threshold
                    );
                });

                if (toRemove.length > 0 || toAdd.length > 0 || user.xp !== validXP) {
                    // Update in transaction
                    await prisma.$transaction(async (tx) => {
                        // Remove invalid milestones
                        if (toRemove.length > 0) {
                            await tx.xpMilestoneClaimed.deleteMany({
                                where: {
                                    id: { in: toRemove.map(m => m.id) }
                                }
                            });
                        }

                        // Add missing valid milestones
                        for (const milestone of toAdd) {
                            await tx.xpMilestoneClaimed.create({
                                data: {
                                    userId: user.id,
                                    category: milestone.category,
                                    threshold: milestone.threshold,
                                    xpAwarded: milestone.xp
                                }
                            });
                        }

                        // Update user XP
                        await tx.user.update({
                            where: { id: user.id },
                            data: { xp: validXP }
                        });
                    });

                    console.log(`✅ ${user.displayName || user.email}: XP ${user.xp} → ${validXP} (removed: ${toRemove.length}, added: ${toAdd.length})`);
                } else {
                    console.log(`✓  ${user.displayName || user.email}: XP ${user.xp} (no changes needed)`);
                }

                successCount++;
            } catch (error: any) {
                console.error(`❌ Failed for user ${user.id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log('\n✨ XP recalculation completed!');
    } catch (error) {
        console.error('\n❌ Error during XP recalculation:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

recalculateUserXP()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
