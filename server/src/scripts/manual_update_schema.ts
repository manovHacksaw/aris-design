
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting manual schema update...');

    try {
        // 1. Add leaderboardPool to events table
        console.log('Adding "leaderboardPool" column to "events" table...');
        await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='leaderboardPool') THEN 
          ALTER TABLE "events" ADD COLUMN "leaderboardPool" DOUBLE PRECISION; 
          RAISE NOTICE 'Column "leaderboardPool" added to "events"';
        ELSE
          RAISE NOTICE 'Column "leaderboardPool" already exists in "events"';
        END IF; 
      END $$;
    `);

        // 2. Add leaderboardPoolUsdc to event_rewards_pools table
        console.log('Adding "leaderboardPoolUsdc" column to "event_rewards_pools" table...');
        await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_rewards_pools' AND column_name='leaderboardPoolUsdc') THEN 
          ALTER TABLE "event_rewards_pools" ADD COLUMN "leaderboardPoolUsdc" DOUBLE PRECISION DEFAULT 0; 
          RAISE NOTICE 'Column "leaderboardPoolUsdc" added to "event_rewards_pools"';
        ELSE
          RAISE NOTICE 'Column "leaderboardPoolUsdc" already exists in "event_rewards_pools"';
        END IF; 
      END $$;
    `);

        console.log('Schema update completed successfully.');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
