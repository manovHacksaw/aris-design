import { RewardsService } from '../services/rewardsService.js';

const EVENT_ID = 'c6a3dae4-292c-49ee-afff-8316018ce418'; // test2 event

async function main() {
    console.log('=== Processing Rewards for test2 Event ===\n');

    try {
        const result = await RewardsService.processEventRewards(EVENT_ID);

        console.log('✅ Rewards processed successfully!\n');
        console.log('Results:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error('❌ Error processing rewards:', error.message);
        console.error('Full error:', error);
    }
}

main().catch(console.error);
