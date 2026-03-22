export const PERF_ENABLED =
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_PERF_LOGS === "1");

export function perfNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function perfLog(scope: string, message: string, extra?: Record<string, unknown>) {
  if (!PERF_ENABLED) return;
  if (extra) {
    console.log(`[perf:${scope}] ${message}`, extra);
    return;
  }
  console.log(`[perf:${scope}] ${message}`);
}
