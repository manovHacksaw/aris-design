import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('\n✨ Database Cleanup Summary:\n');

  const events = await prisma.event.count();
  await new Promise(resolve => setTimeout(resolve, 100));

  const proposals = await prisma.proposal.count();
  await new Promise(resolve => setTimeout(resolve, 100));

  const submissions = await prisma.submission.count();
  await new Promise(resolve => setTimeout(resolve, 100));

  const votes = await prisma.vote.count();
  await new Promise(resolve => setTimeout(resolve, 100));

  const notifications = await prisma.notification.count();
  await new Promise(resolve => setTimeout(resolve, 100));

  const activityLogs = await prisma.activityLog.count();

  console.log('📊 Content tables:');
  console.log(`   Events: ${events}`);
  console.log(`   Proposals: ${proposals}`);
  console.log(`   Submissions: ${submissions}`);
  console.log(`   Votes: ${votes}`);
  console.log(`   Notifications: ${notifications}`);
  console.log(`   Activity Logs: ${activityLogs}\n`);

  if (events === 0 && proposals === 0 && submissions === 0 && votes === 0) {
    console.log('✅ All event-related content has been completely cleaned!\n');
    console.log('🎉 Your database is fresh and ready for new events!\n');
  } else {
    console.log('⚠️  Some content still exists\n');
  }

  await prisma.$disconnect();
}

verify();
