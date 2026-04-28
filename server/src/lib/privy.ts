import { PrivyClient } from '@privy-io/server-auth';

export const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// When set, verifyAuthToken uses local JWT verification (~1ms) instead of a
// Privy API round-trip. If missing or blank, falls back to network verification.
export const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY?.trim() || undefined;
