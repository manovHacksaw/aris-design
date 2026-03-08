import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const [
      activityLogs,
      notifications,
      tokenLogs,
      submissionStats,
      users,
      brands,
      brandSubs,
      followers
    ] = await Promise.all([
      prisma.activityLog.count(),
      prisma.notification.count(),
      prisma.tokenActivityLog.count(),
      prisma.submissionStats.count(),
      prisma.user.count(),
      prisma.brand.count(),
      prisma.brandSubscription.count(),
      prisma.userFollowers.count(),
    ]);

    console.log('📊 Remaining data in database:\n');
    console.log(`   Activity Logs: ${activityLogs}`);
    console.log(`   Notifications: ${notifications}`);
    console.log(`   Token Activity Logs: ${tokenLogs}`);
    console.log(`   Submission Stats: ${submissionStats}`);
    console.log(`   Users: ${users}`);
    console.log(`   Brands: ${brands}`);
    console.log(`   Brand Subscriptions: ${brandSubs}`);
    console.log(`   User Followers: ${followers}\n`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
