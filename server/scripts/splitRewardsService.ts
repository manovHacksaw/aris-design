import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';

const sourceFile = ts.createSourceFile(
  'rewardsService.ts',
  fs.readFileSync(path.join(__dirname, '../src/services/rewardsService.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true
);

const serviceGroups: Record<string, string[]> = {
  RewardsPoolService: ['calculatePoolRequirements', 'createPoolRecord', 'getPoolInfo', 'completePool', 'cancelPool', 'getPoolStats'],
  RewardsDistributionService: ['processEventRewards', 'calculateDistribution'],
  RewardsClaimService: ['claimPendingRewards', 'getUserClaims', 'getUserClaimableRewards', 'getUserClaimHistory', 'confirmClaim', 'confirmAllUserClaims', 'syncClaimsWithOnChain'],
  RewardsRefundService: ['getBrandRefundableBalance', 'getBrandRefundHistory', 'prepareRefundClaim']
};

let importsAndGlobals = '';
let classStart = -1;

ts.forEachChild(sourceFile, node => {
  if (ts.isClassDeclaration(node) && node.name?.text === 'RewardsService') {
    classStart = node.getStart();
    importsAndGlobals = sourceFile.getFullText().substring(0, classStart);
  }
});

importsAndGlobals = `import { RewardsPoolService } from './RewardsPoolService.js';\nimport { RewardsDistributionService } from './RewardsDistributionService.js';\nimport { RewardsClaimService } from './RewardsClaimService.js';\nimport { RewardsRefundService } from './RewardsRefundService.js';\n` + importsAndGlobals;

for (const [className, methods] of Object.entries(serviceGroups)) {
  let fileContent = importsAndGlobals;
  fileContent += `export class ${className} {\n`;

  ts.forEachChild(sourceFile, node => {
    if (ts.isClassDeclaration(node) && node.name?.text === 'RewardsService') {
      node.members.forEach(member => {
        const text = member.getFullText(sourceFile);
        let include = false;
        if (ts.isMethodDeclaration(member)) {
          const name = member.name.getText(sourceFile);
          if (methods.includes(name)) include = true;
          // check if methods array didn't match perfectly, grab helper functions just in case.
        }
        if (include) {
          // Replace 'this.' with 'Class.' to maintain cross-refs
          let modifiedText = text
            .replace(/this\.calculatePoolRequirements/g, 'RewardsPoolService.calculatePoolRequirements')
            .replace(/this\.createPoolRecord/g, 'RewardsPoolService.createPoolRecord')
            .replace(/this\.getPoolInfo/g, 'RewardsPoolService.getPoolInfo')
            .replace(/this\.processEventRewards/g, 'RewardsDistributionService.processEventRewards')
            .replace(/this\.getUserClaims/g, 'RewardsClaimService.getUserClaims')
            .replace(/private static/g, 'static');
          
          fileContent += modifiedText + '\n';
        }
      });
    }
  });

  fileContent += `}\n`;
  
  fs.writeFileSync(path.join(__dirname, `../src/services/rewards/${className}.ts`), fileContent);
  console.log(`Wrote ${className}.ts`);
}
