export function getAllowedAdminEmails(): ReadonlySet<string> {
  const raw = process.env.ALLOWED_ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getAdminKey(): string {
  return process.env.ADMIN_KEY || '';
}
