# CMS edge middleware (`src/proxy.ts`)

This module exports:

- **`proxy(req)`** – intended as the default export of the Next.js **middleware** entry file.
- **`config.matcher`** – CMS HTML routes, `link-product-to-category`, `/_next/image` (image rewrites), and **`/management-menu`** (redirect-only).

## What it does

1. **`/_next/image`** – If the optimizer requests a remote `url=`, rewrites to `/api/img-proxy?url=...` when the URL host is in `ALLOWED_IMAGE_HOSTS` (SSRF guard aligned with `src/app/api/img-proxy/route.ts`).

2. **CMS paths** – For path prefixes such as `/cms`, `/products`, `/categories`, `/orders`, `/notifications`, `/clients`, `/sale-groups`, `/storage-areas`, `/link-product-to-category`:
   - Requires a JWT in the **`token`** cookie or in the query string `?token=`.
   - Verifies the token with **`verifyPrivilegedSession`** (stateful session in DB, not signature-only).
   - On missing/invalid session: clears the auth cookie and **rewrites** to `/cms-unauthorized`, which triggers the app **`not-found`** UI (HTTP 404) instead of redirecting to the store home.
   - On first visit with `?token=` only (no cookie yet): redirects to the same path without the query param and sets the **`token`** cookie. Cookie **`maxAge`** is **`exp - now`** in seconds from the JWT payload (`decodeJwt` from `jose`; signature not checked for this TTL-only read). If decoding fails or `exp` is missing, falls back to **`SESSION_MAX_AGE_SECONDS`** (**8 hours**) in `src/lib/auth/session.ts`.

## Wiring it in Next.js

The repo keeps the implementation in **`src/proxy.ts`**. In Next.js 16+, that file is the **edge proxy** entry (do **not** add a separate **`src/middleware.ts`** alongside it — the build will fail).

**`export async function proxy`** runs for paths in **`config.matcher`**. It handles **`/_next/image`**, CMS auth, and (first in the function body) the legacy **`/management-menu`** redirect (see below).

Without a working **`proxy`** export, only the **client** `JwtGatekeeper` enforces CMS role rules; the edge gate and image rewrite above will not run.

## Legacy `/management-menu` URL

Some deployments or old links may use **`/management-menu`** (sometimes with **`?token=`**). That path is **not** a CMS route in this app.

**`src/proxy.ts`** includes **`/management-menu`** and **`/management-menu/:path*`** in **`config.matcher`**. At the start of **`proxy`**, those requests get a **307** to the site root built as **`new URL("/", origin)`**, with **`search`** and **`hash`** cleared so the address bar shows only **`/`** (no `?token=`, no fragment).

Privileged users should open the management hub at **`/cms?token=...`** (see [`JWT-GENERATION.md`](./JWT-GENERATION.md)).

## Client-side CMS gate

`src/components/auth/jwt-gatekeeper.tsx` calls `GET /api/auth/session` and sends users who lack a session or admin role to `/cms-unauthorized` (404). **Drivers** may only use `/cms` (management menu), `/notifications` (Web Push setup), `/orders` (list, detail, client unpaid), and `/clients/[id]/payment`; any other CMS path redirects to `/orders` (not 404).
