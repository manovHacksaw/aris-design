import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAllContent() {
  try {
    console.log('🧹 Starting comprehensive content cleanup...\n');

    // Step 1: Delete all notifications
    console.log('1️⃣  Deleting all notifications...');
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Deleted ${deletedNotifications.count} notifications\n`);

    // Step 2: Delete all activity logs
    console.log('2️⃣  Deleting all activity logs...');
    const deletedActivityLogs = await prisma.activityLog.deleteMany({});
    console.log(`   ✅ Deleted ${deletedActivityLogs.count} activity logs\n`);

    // Step 3: Delete any orphaned submission stats
    console.log('3️⃣  Deleting any orphaned submission stats...');
    const deletedSubmissionStats = await prisma.submissionStats.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSubmissionStats.count} submission stats\n`);

    // Step 4: Delete all events and related data
    console.log('4️⃣  Deleting all events (cascade delete will handle related data)...');
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEvents.count} events\n`);

    // Step 5: Reset brand counters
    console.log('5️⃣  Resetting brand event counters...');
    const updatedBrands = await prisma.brand.updateMany({
      data: {
        eventsCreated: 0,
        artMinted: 0,
      },
    });
    console.log(`   ✅ Reset counters for ${updatedBrands.count} brands\n`);

    // Step 6: Reset user XP
    console.log('6️⃣  Resetting user XP...');
    const updatedUsers = await prisma.user.updateMany({
      data: {
        xp: 0,
      },
    });
    console.log(`   ✅ Reset XP for ${updatedUsers.count} users\n`);

    // Step 7: Verify cleanup
    console.log('7️⃣  Verifying cleanup...');
    const [
      remainingEvents,
      remainingProposals,
      remainingSubmissions,
      remainingVotes,
      remainingNotifications,
      remainingActivityLogs,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.proposal.count(),
      prisma.submission.count(),
      prisma.vote.count(),
      prisma.notification.count(),
      prisma.activityLog.count(),
    ]);

    console.log('\n📊 Remaining data:');
    console.log(`   Events: ${remainingEvents}`);
    console.log(`   Proposals: ${remainingProposals}`);
    console.log(`   Submissions: ${remainingSubmissions}`);
    console.log(`   Votes: ${remainingVotes}`);
    console.log(`   Notifications: ${remainingNotifications}`);
    console.log(`   Activity Logs: ${remainingActivityLogs}\n`);

    if (
      remainingEvents === 0 &&
      remainingProposals === 0 &&
      remainingSubmissions === 0 &&
      remainingVotes === 0 &&
      remainingNotifications === 0 &&
      remainingActivityLogs === 0
    ) {
      console.log('✨ All content successfully cleaned!\n');
    } else {
      console.warn('⚠️  Some data still remains\n');
    }

    console.log('🎉 Content cleanup completed!\n');
    console.log('You can now start fresh with new events and content.\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanAllContent()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
