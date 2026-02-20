import { execSync } from 'child_process';

try {
  console.log('Syncing dependencies...');
  execSync('npm install', {
    cwd: '/vercel/share/v0-project',
    stdio: 'inherit'
  });
  console.log('Dependencies synced successfully!');
} catch (error) {
  console.error('Error syncing dependencies:', error.message);
  process.exit(1);
}
