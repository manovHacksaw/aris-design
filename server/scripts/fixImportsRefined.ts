import * as fs from 'fs';
import * as path from 'path';

const baseDir = path.join(__dirname, '../src/services');
const eventsDir = path.join(baseDir, 'events');
const rewardsDir = path.join(baseDir, 'rewards');

const eventSisters = ['EventValidationService', 'EventQueryService', 'EventMutationService', 'EventLifecycleService', 'EventRankingService'];
const rewardSisters = ['RewardsPoolService', 'RewardsDistributionService', 'RewardsClaimService', 'RewardsRefundService'];

function processDirectory(dir, sisters) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (!file.endsWith('.ts')) return;
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 1. Fix siblings: any 'Services/events/../SiblingService.js' -> './SiblingService.js'
        sisters.forEach(s => {
          const rx = new RegExp(`from '\\.\\./${s}\\.js'`, 'g');
          content = content.replace(rx, `from './${s}.js'`);
        });

        // 2. Ensure parent services are actually using '../'
        // This is mainly for notificationService, ipfsService, etc.
        // If they are currently using './', we need to move them to '../'
        // But only if they are NOT in the sisters list.
        const parentServiceMatch = /from '\.\/([a-zA-Z]+Service)\.js'/g;
        content = content.replace(parentServiceMatch, (match, serviceName) => {
            if (sisters.includes(serviceName)) {
                return match; // Keep it as ./
            } else {
                return `from '../${serviceName}.js'`;
            }
        });

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${file}`);
    });
}

processDirectory(eventsDir, eventSisters);
processDirectory(rewardsDir, rewardSisters);
