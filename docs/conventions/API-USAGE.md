# API usage

## Client: `src/lib/api/client.ts`

All **client-side** calls to `/api/*` should use the centralized client so behavior (auth, JSON, errors) is consistent.

- **`api(path, init)`** – Generic fetch; path is relative (e.g. `'/api/orders'`). Sends cookies (`credentials: 'include'`). If `body` is a plain object, it is JSON-serialized and `Content-Type` is set.
- **`apiGet(path, init)`** – GET. Used for read-only routes. For `/api/products/unused-images`, responses with `listError` are cached client-side for 60s to avoid repeated failing requests.
- **`apiPost(path, body?, init)`** – POST with optional JSON body.
- **`apiPatch(path, body?, init)`** – PATCH with optional JSON body.
- **`apiPut(path, body?, init)`** – PUT with optional JSON body.
- **`apiDelete(path, init)`** – DELETE.

Example:

```ts
import { apiGet, apiPost } from "@/lib/api/client";

const res = await apiGet("/api/orders");
const data = await res.json();

await apiPost("/api/orders", { clientPhone: "...", items: [...] });
```

Server-side fetch (e.g. in Server Components, `MainMenu`, search page) may still use absolute URLs and raw `fetch`; the client is for browser-originated requests.

## Route protection

- **Protected routes** – Use `withMiddleware(handler)` from `@/lib/api/with-middleware`. By default this runs `protectAPI` (JWT required; admin role for mutating actions). Some routes allow extra roles via `allowed` (e.g. `driver`).
- **Public routes** – Either no middleware, or `withMiddleware(handler, { skipAuth: true })`. Examples:
  - `POST /api/orders` (create order) – `skipAuth: true`
  - `POST /api/products/stock` (get product stock) – `skipAuth: true`
  - `POST /api/products/sale-groups` – `skipAuth: true`
  - `PATCH /api/orders/[id]/notify` – `skipAuth: true`
  - `GET /api/auth/entry` – redirect to auth app
  - `POST /api/auth/verify` – verify JWT token (no auth required to call)

All other API routes under `src/app/api` are protected (JWT required unless `skipAuth` or no middleware).

## Category APIs

Category APIs are **name-based** only:

- `GET/PUT/DELETE /api/categories/name/[name]`
- `GET /api/categories/name/[name]/products`
- `PUT /api/categories/name/[name]/products/order`
- `GET /api/categories/name/[name]/items`
- `GET /api/categories/name/[name]/children`

Id-based category routes were removed; use the name-based routes everywhere.
