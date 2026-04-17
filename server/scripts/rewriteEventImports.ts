import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = [
  'src/server.ts',
  'src/controllers/eventController.ts',
  'src/controllers/searchController.ts',
  'src/services/voteService.ts'
];

const methodsToService: Record<string, string> = {
  createEvent: 'EventMutationService',
  updateEvent: 'EventMutationService',
  deleteEvent: 'EventMutationService',
  getEvents: 'EventQueryService',
  getEventById: 'EventQueryService',
  getActiveEvents: 'EventQueryService',
  getEventsByBrand: 'EventQueryService',
  getEventsVotedByUser: 'EventQueryService',
  updateEventStatus: 'EventLifecycleService',
  publishEvent: 'EventLifecycleService',
  cancelEvent: 'EventLifecycleService',
  stopEventEarly: 'EventLifecycleService',
  autoTransitionEvent: 'EventLifecycleService',
  transitionToCompleted: 'EventLifecycleService',
  updateBlockchainStatus: 'EventLifecycleService',
  failBlockchainStatus: 'EventLifecycleService',
  computeRankings: 'EventRankingService',
  validateEventData: 'EventValidationService',
  isValidStatusTransition: 'EventValidationService',
  getLockedFields: 'EventValidationService'
};

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let importsNeeded = new Set<string>();
  
  for (const [method, service] of Object.entries(methodsToService)) {
    const rx = new RegExp(`EventService\\.${method}`, 'g');
    if (rx.test(content)) {
      importsNeeded.add(service);
      content = content.replace(rx, `${service}.${method}`);
    }
  }

  if (importsNeeded.size > 0) {
    // Remove old import
    content = content.replace(/import\s*{\s*EventService\s*}\s*from\s*['"]\.\.\/services\/eventService(\.js)?['"];?\n?/, '');
    content = content.replace(/import\s*{\s*EventService\s*}\s*from\s*['"]\.\/eventService(\.js)?['"];?\n?/, '');
    
    // Determine relative path based on the file depth
    const depth = file.split('/').length - 1;
    const rel = depth === 1 ? './services/events/' : '../services/events/';
    
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
