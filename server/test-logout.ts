import { AuthService } from './src/services/authService';
import { prisma } from './src/lib/prisma';
import { generateToken } from './src/utils/jwt';

async function testLogout() {
    console.log('🧪 Testing Logout Flow...');

    // 1. Create a dummy user and session
    const user = await prisma.user.create({
        data: {
            email: 'test-logout@example.com',
            walletAddress: '0x1234567890123456789012345678901234567890',
        }
    });

    const session = await prisma.userSession.create({
        data: {
            userId: user.id,
            expiredAt: new Date(Date.now() + 100000),
            isActive: true
        }
    });

    console.log('✅ Created user and active session:', session.id);

    // 2. Logout (invalidate session)
    await AuthService.logout(session.id);
    console.log('✅ Called logout()');

    // 3. Verify session is inactive
    const updatedSession = await prisma.userSession.findUnique({
        where: { id: session.id }
    });

    if (!updatedSession?.isActive) {
        console.log('✅ Session is correctly marked as inactive');
    } else {
        console.error('❌ Session is still active!');
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
}

testLogout()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
