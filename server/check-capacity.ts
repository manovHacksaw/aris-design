
import { prisma } from './src/lib/prisma.js';
const e = await prisma.event.findUnique({ where: { id: '40651bb4-feb0-461a-b58b-712a05b26784' } });
console.log('CAPACITY:', e?.capacity);
console.log('STATUS:', e?.status);
