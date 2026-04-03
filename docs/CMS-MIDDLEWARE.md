# CMS edge middleware (`src/proxy.ts`)

This module exports:

- **`proxy(req)`** – intended as the default export of the Next.js **middleware** entry file.
- **`config.matcher`** – limits work to CMS HTML routes, `link-product-to-category`, and `/_next/image` (for allowed-host image rewrites).

## What it does

1. **`/_next/image`** – If the optimizer requests a remote `url=`, rewrites to `/api/img-proxy?url=...` when the URL host is in `ALLOWED_IMAGE_HOSTS` (SSRF guard aligned with `src/app/api/img-proxy/route.ts`).

2. **CMS paths** – For path prefixes such as `/cms`, `/products`, `/categories`, `/orders`, `/notifications`, `/clients`, `/sale-groups`, `/storage-areas`, `/link-product-to-category`:
   - Requires a JWT in the **`token`** cookie or in the query string `?token=`.
   - Verifies the token with **`verifyPrivilegedSession`** (stateful session in DB, not signature-only).
   - On missing/invalid session: clears the auth cookie and **rewrites** to `/cms-unauthorized`, which triggers the app **`not-found`** UI (HTTP 404) instead of redirecting to the store home.
   - On first visit with `?token=` only (no cookie yet): redirects to the same path without the query param and sets the **`token`** cookie. Cookie **`maxAge`** is **`exp - now`** in seconds from the JWT payload (`decodeJwt` from `jose`; signature not checked for this TTL-only read). If decoding fails or `exp` is missing, falls back to **`SESSION_MAX_AGE_SECONDS`** (**8 hours**) in `src/lib/auth/session.ts`.

## Wiring it in Next.js

The repo keeps the implementation in **`src/proxy.ts`**. Next.js expects middleware at the project root or under `src/`. If you do not already have a middleware file, add for example **`src/middleware.ts`**:

```ts
export { proxy as default, config } from "./proxy";
```

(Adjust the import path if your middleware file lives at the repository root instead of `src/`.)

Without this export, only the **client** `JwtGatekeeper` enforces CMS role rules; the edge gate and image rewrite above will not run.

## Client-side CMS gate

`src/components/auth/jwt-gatekeeper.tsx` calls `GET /api/auth/session` and sends users who lack a session or admin role to `/cms-unauthorized` (404). **Drivers** may only use `/cms` (management menu), `/notifications` (Web Push setup), `/orders` (list, detail, client unpaid), and `/clients/[id]/payment`; any other CMS path redirects to `/orders` (not 404).
