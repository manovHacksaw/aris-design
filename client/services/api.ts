const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const SOCKET_URL = API_BASE_URL.replace("/api", "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Global reference for Privy token getter so apiRequest doesn't need it explicitly passed every time
let privyTokenGetter: (() => Promise<string | null>) | null = null;

export function setPrivyTokenGetter(getter: () => Promise<string | null>) {
  privyTokenGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
  if (privyTokenGetter) {
    return await privyTokenGetter();
  }
  return null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { noCache?: boolean } = {},
  timeout = 30000
): Promise<T> {
  const token = await getAuthToken();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const { noCache, ...fetchOptions } = options;

  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      cache: noCache ? 'no-store' : undefined,
    });

    clearTimeout(id);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data?.error || data?.message || `Request failed (${response.status})`,
        response.status,
        data
      );
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") throw new ApiError("Request timed out", 408);
    throw err;
  }
}

/** Authenticate with Privy access token and fetch user object */
export async function authenticateWithPrivy(
  privyToken: string,
  walletAddress?: string,
  email?: string,
  avatarUrl?: string,
  eoaAddress?: string
): Promise<{ token: string; user: any }> {
  const data = await apiRequest<{ success: boolean; token: string; user: any }>(
    "/auth/privy-login",
    {
      method: "POST",
      body: JSON.stringify({ privyToken, walletAddress, eoaAddress, email, avatarUrl }),
    }
  );
  return { token: privyToken, user: data.user };
}

/** Invalidate backend session */
export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" }, 5000);
  } catch {
    // Backend logout best effort
  }
}
