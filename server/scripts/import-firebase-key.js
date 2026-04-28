#!/usr/bin/env node

/**
 * Firebase Service Account Key Import Script
 *
 * Usage:
 *   node scripts/import-firebase-key.js path/to/service-account.json
 *
 * This script reads your Firebase service account JSON file and updates .env
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Please provide path to service account JSON file');
    console.log('\nUsage:');
    console.log('  node scripts/import-firebase-key.js path/to/service-account.json');
    console.log('\nExample:');
    console.log('  node scripts/import-firebase-key.js ~/Downloads/aris-demo-3ede4-firebase-adminsdk-xxxxx.json');
    process.exit(1);
  }

  const jsonPath = path.resolve(args[0]);

  // Check if file exists
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Error: File not found: ${jsonPath}`);
    process.exit(1);
  }

  // Read and parse JSON
  let serviceAccount;
  try {
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    serviceAccount = JSON.parse(jsonContent);
  } catch (error) {
    console.error('❌ Error reading or parsing JSON file:', error.message);
    process.exit(1);
  }

  // Validate required fields
  const requiredFields = ['project_id', 'client_email', 'private_key'];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);

  if (missingFields.length > 0) {
    console.error('❌ Error: Service account JSON is missing required fields:');
    missingFields.forEach(field => console.error(`  - ${field}`));
    process.exit(1);
  }

  // Read current .env file
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add Firebase credentials
  const credentials = {
    FIREBASE_PROJECT_ID: serviceAccount.project_id,
    FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
    FIREBASE_PRIVATE_KEY: serviceAccount.private_key
  };

  Object.entries(credentials).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}="${value.replace(/\n/g, '\\n')}"`;

    if (envContent.match(regex)) {
      // Replace existing line
      envContent = envContent.replace(regex, newLine);
    } else {
      // Add new line
      if (!envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${newLine}\n`;
    }
  });

  // Write back to .env
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('✅ Firebase credentials imported successfully!');
  console.log('\nImported:');
  console.log(`  FIREBASE_PROJECT_ID: ${credentials.FIREBASE_PROJECT_ID}`);
  console.log(`  FIREBASE_CLIENT_EMAIL: ${credentials.FIREBASE_CLIENT_EMAIL}`);
  console.log(`  FIREBASE_PRIVATE_KEY: [${credentials.FIREBASE_PRIVATE_KEY.length} characters]`);
  console.log('\n⚠️  Security reminder:');
  console.log('  - Do NOT commit the service account JSON file to Git');
  console.log('  - Do NOT commit .env file to Git');
  console.log('  - Add both to .gitignore');
  console.log('\n🔄 Next step: Restart your server for changes to take effect');
}

main();
