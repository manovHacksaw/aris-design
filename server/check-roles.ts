
import { prisma } from './src/lib/prisma.js';
const USERNAMES = ['manov', 'chocopie', 'snaps_of_manov', 'candyman'];
const users = await prisma.user.findMany({ where: { username: { in: USERNAMES } }, select: { username: true, role: true } });
console.log(users);
