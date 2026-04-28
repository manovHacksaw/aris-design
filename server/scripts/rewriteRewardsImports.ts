import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = [
  'src/controllers/rewardsController.ts',
  'src/services/events/EventLifecycleService.ts',
  'src/services/events/EventMutationService.ts',
  'src/services/events/EventQueryService.ts',
  'src/services/events/EventRankingService.ts',
  'src/services/events/EventValidationService.ts',
];

const methodsToService: Record<string, string> = {
  calculatePoolRequirements: 'RewardsPoolService',
  createPoolRecord: 'RewardsPoolService',
  getPoolInfo: 'RewardsPoolService',
  completePool: 'RewardsPoolService',
  cancelPool: 'RewardsPoolService',
  getPoolStats: 'RewardsPoolService',
  processEventRewards: 'RewardsDistributionService',
  calculateDistribution: 'RewardsDistributionService',
  claimPendingRewards: 'RewardsClaimService',
  getUserClaims: 'RewardsClaimService',
  getUserClaimableRewards: 'RewardsClaimService',
  getUserClaimHistory: 'RewardsClaimService',
  confirmClaim: 'RewardsClaimService',
  confirmAllUserClaims: 'RewardsClaimService',
  syncClaimsWithOnChain: 'RewardsClaimService',
  getBrandRefundableBalance: 'RewardsRefundService',
  getBrandRefundHistory: 'RewardsRefundService',
  prepareRefundClaim: 'RewardsRefundService'
};

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let importsNeeded = new Set<string>();
  
  for (const [method, service] of Object.entries(methodsToService)) {
    const rx = new RegExp(`RewardsService\\.${method}`, 'g');
    if (rx.test(content)) {
      importsNeeded.add(service);
      content = content.replace(rx, `${service}.${method}`);
    }
  }

  if (importsNeeded.size > 0) {
    // Remove old import
    content = content.replace(/import\s*{\s*RewardsService\s*}\s*from\s*['"]\.\.\/services\/rewardsService(\.js)?['"];?\n?/, '');
    content = content.replace(/import\s*{\s*RewardsService\s*}\s*from\s*['"]\.\.\/rewardsService(\.js)?['"];?\n?/, '');
    content = content.replace(/import\s*{\s*RewardsService\s*}\s*from\s*['"]\.\.\/\.\.\/services\/rewardsService(\.js)?['"];?\n?/, '');
    
    // Determine relative path based on the file depth
    const depth = file.split('/').length - 1;
    let rel = '';
    if (depth === 1) rel = './services/rewards/';
    else if (depth === 2) rel = '../services/rewards/';
    else if (depth === 3) rel = '../../services/rewards/';
    
    // For services/events/ files, their depth is 3. `src/services/events/File.ts`. So path to rewards is `../rewards/`
    if (file.includes('services/events')) {
      rel = '../rewards/';
    }
    
    let imports = '';
    for (const s of importsNeeded) {
      imports += `import { ${s} } from '${rel}${s}.js';\n`;
    }
    
    // Inject at the top of the file
    content = content.replace(/^(import.*(\n|$))+/m, match => match + imports);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
