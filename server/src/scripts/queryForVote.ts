import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const [proposals, users] = await Promise.all([
  p.proposal.findMany({
    where: { eventId: '128d25c8-35c4-429d-a0e8-39159d718c8a' },
    select: { id: true, title: true, voteCount: true },
  }),
  p.user.findMany({
    where: { role: 'USER', walletAddress: { not: null } },
    select: { id: true, username: true, walletAddress: true },
    take: 25,
  }),
]);

console.log('PROPOSALS:', JSON.stringify(proposals, null, 2));
console.log('\nUSERS:', JSON.stringify(users, null, 2));
await p.$disconnect();
