import * as fs from 'fs';
import * as path from 'path';

const eventsDir = path.join(__dirname, '../src/services/events');
const rewardsDir = path.join(__dirname, '../src/services/rewards');

const eventFiles = ['EventValidationService.ts', 'EventQueryService.ts', 'EventMutationService.ts', 'EventLifecycleService.ts', 'EventRankingService.ts'];
const rewardFiles = ['RewardsPoolService.ts', 'RewardsDistributionService.ts', 'RewardsClaimService.ts', 'RewardsRefundService.ts'];

function cleanupFile(filePath: string, fileName: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove self imports
  const className = fileName.replace('.ts', '');
  const selfImportRx = new RegExp(`import\\s*{\\s*${className}\\s*}\\s*from\\s*['"]\\./${className}(\\.js)?['"];?\\n?`, 'g');
  content = content.replace(selfImportRx, '');

  // Remove imports of deleted files
  content = content.replace(/import\s*{\s*EventService\s*}\s*from\s*['"]\.\/eventService(\.js)?['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*RewardsService\s*}\s*from\s*['"]\.\/rewardsService(\.js)?['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*EventService\s*}\s*from\s*['"]\.\.\/eventService(\.js)?['"];?\n?/g, '');
  content = content.replace(/import\s*{\s*RewardsService\s*}\s*from\s*['"]\.\.\/rewardsService(\.js)?['"];?\n?/g, '');

  // Fix joined imports (e.g. };import)
  content = content.replace(/};\s*import/g, '};\nimport');

  // Remove any redundant/duplicate imports of the new services within the same group
  // Actually, we want them to import each other, just not themselves.
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Cleaned up ${fileName}`);
}

eventFiles.forEach(f => {
  const p = path.join(eventsDir, f);
  if (fs.existsSync(p)) cleanupFile(p, f);
});

rewardFiles.forEach(f => {
  const p = path.join(rewardsDir, f);
  if (fs.existsSync(p)) cleanupFile(p, f);
});
