import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanEvents() {
  try {
    console.log('🧹 Starting event cleanup...\n');

    // Step 1: Delete notifications related to events
    console.log('1️⃣  Deleting event-related notifications...');
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        metadata: {
          path: ['eventId'],
          not: null,
        },
      },
    });
    console.log(`   ✅ Deleted ${deletedNotifications.count} notifications\n`);

    // Step 2: Get count of events before deletion
    const eventCount = await prisma.event.count();
    console.log(`📊 Found ${eventCount} events to delete\n`);

    if (eventCount === 0) {
      console.log('✨ No events found. Database is already clean!\n');
      return;
    }

    // Step 3: Get counts of related data (for reporting)
    const [proposalCount, submissionCount, voteCount, activityLogCount, analyticsCount, snapshotCount] = await Promise.all([
      prisma.proposal.count(),
      prisma.submission.count(),
      prisma.vote.count(),
      prisma.activityLog.count({ where: { eventId: { not: null } } }),
      prisma.eventAnalytics.count(),
      prisma.leaderboardSnapshot.count(),
    ]);

    console.log('📋 Related data to be cleaned:');
    console.log(`   - Proposals: ${proposalCount}`);
    console.log(`   - Submissions: ${submissionCount}`);
    console.log(`   - Votes: ${voteCount}`);
    console.log(`   - Activity Logs: ${activityLogCount}`);
    console.log(`   - Event Analytics: ${analyticsCount}`);
    console.log(`   - Leaderboard Snapshots: ${snapshotCount}\n`);

    // Step 4: Delete all events (cascade will handle related data)
    console.log('2️⃣  Deleting all events (cascade delete will clean related data)...');
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEvents.count} events\n`);

    // Step 5: Reset brand event counters
    console.log('3️⃣  Resetting brand event counters...');
    const updatedBrands = await prisma.brand.updateMany({
      data: {
        eventsCreated: 0,
      },
    });
    console.log(`   ✅ Reset counters for ${updatedBrands.count} brands\n`);

    // Step 6: Verify cleanup
    console.log('4️⃣  Verifying cleanup...');
    const [
      remainingEvents,
      remainingProposals,
      remainingSubmissions,
      remainingVotes,
      remainingAnalytics,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.proposal.count(),
      prisma.submission.count(),
      prisma.vote.count(),
      prisma.eventAnalytics.count(),
    ]);

    if (
      remainingEvents === 0 &&
      remainingProposals === 0 &&
      remainingSubmissions === 0 &&
      remainingVotes === 0 &&
      remainingAnalytics === 0
    ) {
      console.log('   ✅ All event data successfully cleaned!\n');
    } else {
      console.warn('   ⚠️  Some data may remain:');
      console.warn(`      Events: ${remainingEvents}`);
      console.warn(`      Proposals: ${remainingProposals}`);
      console.warn(`      Submissions: ${remainingSubmissions}`);
      console.warn(`      Votes: ${remainingVotes}`);
      console.warn(`      Analytics: ${remainingAnalytics}\n`);
    }

    console.log('✨ Event cleanup completed successfully!\n');
    console.log('🎉 You can now create fresh events with proper data.\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanEvents()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
