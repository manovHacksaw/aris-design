const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("authToken", token);
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<T> {
  const token = getAuthToken();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
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

/** Authenticate with Privy access token and get a backend JWT */
export async function authenticateWithPrivy(
  privyToken: string,
  walletAddress?: string,
  email?: string,
  avatarUrl?: string
): Promise<{ token: string; user: any }> {
  const data = await apiRequest<{ success: boolean; token: string; user: any }>(
    "/auth/privy-login",
    {
      method: "POST",
      body: JSON.stringify({ privyToken, walletAddress, email, avatarUrl }),
    }
  );
  if (data.token) setAuthToken(data.token);
  return { token: data.token, user: data.user };
}

/** Invalidate backend session */
export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" }, 5000);
  } catch {
    // always clear local token even if request fails
  } finally {
    removeAuthToken();
  }
}
