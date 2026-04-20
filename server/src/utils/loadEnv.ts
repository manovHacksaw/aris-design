import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface LoadEnvOptions {
  override?: boolean;
}

const loadedFiles = new Set<string>();

function isQuoted(value: string, quote: '"' | "'"): boolean {
  return value.startsWith(quote) && value.endsWith(quote) && value.length >= 2;
}

function normalizeValue(rawValue: string): string {
  if (isQuoted(rawValue, '"')) {
    return rawValue
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }

  if (isQuoted(rawValue, "'")) {
    return rawValue.slice(1, -1);
  }

  return rawValue.replace(/\s+#.*$/, '').trim();
}

function parseEnvFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  const assignmentPattern = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)\s*$/;

  let pendingKey: string | null = null;
  let pendingQuote: '"' | "'" | null = null;
  let pendingValue = '';

  for (const line of lines) {
    if (pendingKey && pendingQuote) {
      pendingValue += `\n${line}`;
      if (line.endsWith(pendingQuote)) {
        entries[pendingKey] = normalizeValue(`${pendingQuote}${pendingValue}`);
        pendingKey = null;
        pendingQuote = null;
        pendingValue = '';
      }
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = line.match(assignmentPattern);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if ((value.startsWith('"') || value.startsWith("'")) && !value.endsWith(value[0])) {
      pendingKey = key;
      pendingQuote = value[0] as '"' | "'";
      pendingValue = value.slice(1);
      continue;
    }

    entries[key] = normalizeValue(value);
  }

  return entries;
}

export function loadEnvFile(filePath: string | URL, options: LoadEnvOptions = {}): void {
  const override = options.override ?? false;
  const resolvedPath =
    filePath instanceof URL ? fileURLToPath(filePath) : path.resolve(filePath);
  const fileKey = `${resolvedPath}:${override ? 'override' : 'keep'}`;

  if (loadedFiles.has(fileKey) || !fs.existsSync(resolvedPath)) {
    return;
  }

  const parsed = parseEnvFile(fs.readFileSync(resolvedPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  loadedFiles.add(fileKey);
}
