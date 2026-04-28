import { PrivyClient } from '@privy-io/server-auth';

export const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/**
 * The SPKI public key used to verify Privy JWTs locally, without a network call.
 *
 * Fetch it once: await privy.getAppSettings() → copy verificationKey → set as
 * PRIVY_VERIFICATION_KEY in Railway env vars.
 *
 * When set, verifyAuthToken(token, PRIVY_VERIFICATION_KEY) skips the
 * getAppSettings() HTTP round-trip entirely (~1ms vs ~8-10s).
 */
export const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY || '';
