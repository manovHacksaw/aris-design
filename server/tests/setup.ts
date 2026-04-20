/**
 * Global test setup — imported as a preload via `bun test --preload`
 *
 * Responsibilities:
 *  1. Load tests/.env.test before any src/ module touches process.env
 *  2. Start the Express app on a random free port
 *  3. Export a promise that resolves to the base URL
 *  4. Provide stopTestServer() for final teardown
 *
 * Each test file calls `await getTestServer()` in its beforeAll.
 */

import http from 'http';
import { loadEnvFile } from '../src/utils/loadEnv';

// Ensure NODE_ENV is always 'test' when running this suite
process.env.NODE_ENV = 'test';

// ── 1. Load test env vars (must happen before any src/ import) ──────────────
loadEnvFile(new URL('.env.test', import.meta.url), { override: true });

// ── 3. Singleton server ──────────────────────────────────────────────────────
let _server: http.Server | null = null;
let _baseUrl: string | null = null;
let _appModulePromise: Promise<typeof import('../src/app')> | null = null;

export async function getTestServer(): Promise<string> {
  if (_baseUrl) return _baseUrl;

  _appModulePromise ??= import('../src/app');
  const { createApp } = await _appModulePromise;
  const app = createApp();
  _server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    _server!.listen(0, '127.0.0.1', (err?: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const address = _server.address() as { port: number };
  _baseUrl = `http://127.0.0.1:${address.port}/api`;
  return _baseUrl;
}

export async function stopTestServer(): Promise<void> {
  if (!_server) return;
  await new Promise<void>((resolve, reject) => {
    _server!.close((err) => (err ? reject(err) : resolve()));
  });
  _server = null;
  _baseUrl = null;
}
