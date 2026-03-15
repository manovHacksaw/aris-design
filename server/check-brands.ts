
import { prisma } from './src/lib/prisma';

async function checkData() {
    try {
        const apps = await prisma.brandApplication.findMany();
        console.log('Applications:', apps.length);

        for (const app of apps) {
            console.log(`App: ${app.brandName} (${app.status}) - ID: ${app.id}`);
            console.log(`   GST: '${app.gstNumber}'`);
            console.log(`   BrandID: ${app.brandId}`);
            const brand = await prisma.brand.findUnique({ where: { name: app.brandName } });
            if (brand) {
                console.log(`  -> Brand with same name ALREADY EXISTS: ${brand.name} (ID: ${brand.id})`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
