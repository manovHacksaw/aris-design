import { createApp } from '../src/app';
import http from 'http';
import { setupSocket } from '../src/socket';
import { checkDatabaseConnection } from '../src/utils/dbConnection';
import dotenv from 'dotenv';
import logger from '../src/lib/logger';

dotenv.config();

process.on('uncaughtException', (err) => {
    console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

async function run() {
    await checkDatabaseConnection();
    const app = createApp();
    const httpServer = http.createServer(app);
    setupSocket(httpServer);
    httpServer.listen(8001, () => {
        console.log('Test server running on 8001');
    });
}

run().catch(err => {
    console.error('RUN ERROR:', err);
});
