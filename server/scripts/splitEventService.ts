import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';

const sourceFile = ts.createSourceFile(
  'eventService.ts',
  fs.readFileSync(path.join(__dirname, '../src/services/eventService.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true
);

const serviceGroups: Record<string, string[]> = {
  EventValidationService: ['validateEventData', 'isValidStatusTransition', 'getLockedFields', 'parseDate', 'validateTimestamps'],
  EventQueryService: ['getEvents', 'getEventById', 'getActiveEvents', 'getEventsByBrand', 'getEventsVotedByUser', 'addImageUrls'],
  EventMutationService: ['createEvent', 'updateEvent', 'deleteEvent'],
  EventLifecycleService: ['updateEventStatus', 'publishEvent', 'transitionToCompleted', 'cancelEvent', 'stopEventEarly', 'autoTransitionEvent', 'updateBlockchainStatus', 'failBlockchainStatus'],
  EventRankingService: ['computeRankings']
};

let importsAndGlobals = '';
let classStart = -1;

ts.forEachChild(sourceFile, node => {
  if (ts.isClassDeclaration(node) && node.name?.text === 'EventService') {
    classStart = node.getStart();
    importsAndGlobals = sourceFile.getFullText().substring(0, classStart);
  }
});

importsAndGlobals = `import { EventValidationService } from './EventValidationService.js';\nimport { EventQueryService } from './EventQueryService.js';\nimport { EventLifecycleService } from './EventLifecycleService.js';\nimport { EventRankingService } from './EventRankingService.js';\n` + importsAndGlobals;

for (const [className, methods] of Object.entries(serviceGroups)) {
  let fileContent = importsAndGlobals;
  fileContent += `export class ${className} {\n`;

  ts.forEachChild(sourceFile, node => {
    if (ts.isClassDeclaration(node) && node.name?.text === 'EventService') {
      node.members.forEach(member => {
        const text = member.getFullText(sourceFile);
        let include = false;
        if (ts.isMethodDeclaration(member)) {
          const name = member.name.getText(sourceFile);
          if (methods.includes(name)) include = true;
        }
        if (include) {
          // Replace 'this.' with calls to the appropriate service class where necessary.
          let modifiedText = text
            .replace(/this\.parseDate/g, 'EventValidationService.parseDate')
            .replace(/this\.validateEventData/g, 'EventValidationService.validateEventData')
            .replace(/this\.validateTimestamps/g, 'EventValidationService.validateTimestamps')
            .replace(/this\.getLockedFields/g, 'EventValidationService.getLockedFields')
            .replace(/this\.isValidStatusTransition/g, 'EventValidationService.isValidStatusTransition')
            .replace(/this\.addImageUrls/g, 'EventQueryService.addImageUrls')
            .replace(/this\.computeRankings/g, 'EventRankingService.computeRankings')
            .replace(/this\.transitionToCompleted/g, 'EventLifecycleService.transitionToCompleted');
          
          fileContent += modifiedText + '\n';
        }
      });
    }
  });

  fileContent += `}\n`;
  
  fs.writeFileSync(path.join(__dirname, `../src/services/events/${className}.ts`), fileContent);
  console.log(`Wrote ${className}.ts`);
}
