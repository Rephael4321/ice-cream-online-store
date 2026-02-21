/**
 * Centralized API client for client-side fetch to /api/*.
 * - Sends cookies (credentials: 'include') for auth
 * - Automatically JSON-serializes body and sets Content-Type when body is an object
 * - Use relative paths, e.g. api('/api/orders')
 */

const defaultInit: RequestInit = {
  credentials: "include",
};

export type ApiInit = Omit<RequestInit, "body"> & {
  body?: object | string | FormData | null;
};

/**
 * Fetch an API route. Path should be relative (e.g. '/api/orders').
 * If body is a plain object, it is JSON.stringify'd and Content-Type is set.
 */
export async function api(path: string, init?: ApiInit): Promise<Response> {
  const { body, headers: initHeaders, ...rest } = init ?? {};
  const headers = new Headers(initHeaders);

  if (body !== undefined && body !== null) {
    if (typeof body === "object" && !(body instanceof FormData)) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      (rest as RequestInit).body = JSON.stringify(body);
    } else {
      (rest as RequestInit).body = body;
    }
  }

  return fetch(path, {
    ...defaultInit,
    ...rest,
    headers,
  });
}

/** GET request (cache and other options supported). */
export function apiGet(path: string, init?: RequestInit): Promise<Response> {
  return api(path, { ...init, method: "GET" });
}

/** POST with optional JSON body. */
export function apiPost(
  path: string,
  body?: object | null,
  init?: Omit<ApiInit, "method" | "body">
): Promise<Response> {
  return api(path, { ...init, method: "POST", body: body ?? undefined });
}

/** PATCH with optional JSON body. */
export function apiPatch(
  path: string,
  body?: object | null,
  init?: Omit<ApiInit, "method" | "body">
): Promise<Response> {
  return api(path, { ...init, method: "PATCH", body: body ?? undefined });
}

/** PUT with optional JSON body. */
export function apiPut(
  path: string,
  body?: object | null,
  init?: Omit<ApiInit, "method" | "body">
): Promise<Response> {
  return api(path, { ...init, method: "PUT", body: body ?? undefined });
}

/** DELETE request. */
export function apiDelete(path: string, init?: RequestInit): Promise<Response> {
  return api(path, { ...init, method: "DELETE" });
}
