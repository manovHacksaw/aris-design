import { loadEnvFile } from './utils/loadEnv.js';

loadEnvFile(new URL('../.env', import.meta.url));
