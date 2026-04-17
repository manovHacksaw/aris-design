import * as fs from 'fs';
import * as path from 'path';

const baseDir = path.join(__dirname, '../src/services');
const eventsDir = path.join(baseDir, 'events');
const rewardsDir = path.join(baseDir, 'rewards');

const mappings = [
    { dir: eventsDir, search: /from '\.\.\/lib\//g, replace: "from '../../lib/" },
    { dir: eventsDir, search: /from '\.\.\/utils\//g, replace: "from '../../utils/" },
    { dir: eventsDir, search: /from '\.\.\/types\//g, replace: "from '../../types/" },
    { dir: eventsDir, search: /from '\.\/([a-zA-Z]+Service)\.js'/g, replace: "from '../$1.js'" },
    { dir: eventsDir, search: /import\('(\.\.\/lib\/blockchain\.js)'\)/g, replace: "import('../../lib/blockchain.js')" },
    
    { dir: rewardsDir, search: /from '\.\.\/lib\//g, replace: "from '../../lib/" },
    { dir: rewardsDir, search: /from '\.\.\/utils\//g, replace: "from '../../utils/" },
    { dir: rewardsDir, search: /from '\.\.\/types\//g, replace: "from '../../types/" },
    { dir: rewardsDir, search: /from '\.\/([a-zA-Z]+Service)\.js'/g, replace: "from '../$1.js'" },
    { dir: rewardsDir, search: /import\('(\.\.\/lib\/blockchain\.js)'\)/g, replace: "import('../../lib/blockchain.js')" },
];

function processDirectory(dir, search, replace) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (!file.endsWith('.ts')) return;
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        const newContent = content.replace(search, replace);
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated imports in ${file}`);
        }
    });
}

mappings.forEach(m => processDirectory(m.dir, m.search, m.replace));
