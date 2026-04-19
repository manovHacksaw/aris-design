import { loadEnvFile } from './utils/loadEnv';

loadEnvFile(new URL('../.env', import.meta.url));
