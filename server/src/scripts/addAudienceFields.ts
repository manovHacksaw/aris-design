import { prisma } from '../lib/prisma.js';

async function addAudienceFields() {
    console.log('Adding preferredGender and ageGroup columns to events table...');

    try {
        // Check if columns already exist
        const checkColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name IN ('preferredGender', 'ageGroup');
    ` as { column_name: string }[];

        const existingColumns = checkColumns.map(c => c.column_name);

        if (!existingColumns.includes('preferredGender')) {
            await prisma.$executeRaw`ALTER TABLE "events" ADD COLUMN "preferredGender" TEXT DEFAULT 'All'`;
            console.log('✓ Added preferredGender column');
        } else {
            console.log('- preferredGender column already exists');
        }

        if (!existingColumns.includes('ageGroup')) {
            await prisma.$executeRaw`ALTER TABLE "events" ADD COLUMN "ageGroup" TEXT DEFAULT 'All Ages'`;
            console.log('✓ Added ageGroup column');
        } else {
            console.log('- ageGroup column already exists');
        }

        console.log('\n✅ Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

addAudienceFields();
