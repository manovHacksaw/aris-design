/**
 * Thin HTTP client wrapper for integration tests.
 *
 * All methods return { status, body } so assertions are uniform.
 * Headers common to a test session (auth, content-type) can be
 * built with makeHeaders() and passed to each call.
 */

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

async function parseBody<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export async function apiGet<T = any>(
  baseUrl: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const body = await parseBody<T>(res);
  return { status: res.status, body };
}

export async function apiPost<T = any>(
  baseUrl: string,
  path: string,
  payload: unknown = {},
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const body = await parseBody<T>(res);
  return { status: res.status, body };
}

export async function apiPut<T = any>(
  baseUrl: string,
  path: string,
  payload: unknown = {},
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const body = await parseBody<T>(res);
  return { status: res.status, body };
}

export async function apiPatch<T = any>(
  baseUrl: string,
  path: string,
  payload: unknown = {},
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  const body = await parseBody<T>(res);
  return { status: res.status, body };
}

export async function apiDelete<T = any>(
  baseUrl: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const body = await parseBody<T>(res);
  return { status: res.status, body };
}
