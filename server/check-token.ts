
import { prisma } from './src/lib/prisma';

async function checkToken() {
    const token = '77a8f067-a654-4dfd-b8f5-4ea25bfaafef';
    console.log('Checking token:', token);

    try {
        const brand = await prisma.brand.findUnique({
            where: { claimToken: token },
            include: {
                application: true,
                owner: true
            }
        });

        if (brand) {
            console.log('Brand found:', brand.name);
            console.log('ID:', brand.id);
            console.log('Claim Token:', brand.claimToken);
            console.log('Expiry:', brand.claimTokenExpiry);
            console.log('Owner:', brand.ownerId);
            console.log('Is Active:', brand.isActive);
        } else {
            console.log('Brand NOT found with this token');

            // Check if brand exists by name "Test"
            const testBrand = await prisma.brand.findUnique({ where: { name: 'Test' } });
            if (testBrand) {
                console.log('Brand "Test" exists with token:', testBrand.claimToken);
                console.log('Owner ID:', testBrand.ownerId);
                console.log('Is Active:', testBrand.isActive);
                console.log('Linked App ID:', testBrand.applicationId);

                if (testBrand.applicationId) {
                    console.log('Linked App ID (from Brand):', testBrand.applicationId);
                    const app = await prisma.brandApplication.findUnique({ where: { id: testBrand.applicationId } });
                    console.log('Linked App Status:', app?.status);
                }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkToken();
