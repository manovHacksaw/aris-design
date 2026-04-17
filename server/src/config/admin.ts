const raw = process.env.ALLOWED_ADMIN_EMAILS || '';

export const ALLOWED_ADMIN_EMAILS: ReadonlySet<string> = new Set(
  raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export const ADMIN_KEY = process.env.ADMIN_KEY || '';
