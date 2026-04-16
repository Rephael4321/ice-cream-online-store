# Privileged CMS login (JWT + sessions)

Privileged access uses:

- a minimal `users` table with seeded privileged roles: `admin`, `superuser` (admin-equivalent), and `driver` (see migrations `001_stateful_privileged_sessions.sql` and `003_superuser_role.sql`)
- a `sessions` table for revocable server-backed sessions
- `scripts/generate-token.ts` to mint a **JWT only** (no DB row yet)
- the **first** successful CMS visit with `?token=` creates the matching `sessions` row
- `POST /api/auth/logout` revokes the current session so that **same bearer token** cannot be bootstrapped again
- `GET /api/auth/session` to inspect the current authenticated session
- DB migrations: `001_stateful_privileged_sessions.sql` (users + sessions); `003_superuser_role.sql` (adds `superuser` role); `002_push_subscriptions.sql` (optional Web Push for privileged users)

## Flow

1. Run the script (needs `JWT_SECRET` and `DATABASE_URL` with seeded `users` — only to resolve `userId` for the role).
2. Open the printed link (`/cms?token=...`) on the app that shares **the same** `JWT_SECRET` and `DATABASE_URL` as production (or generate using prod env).
3. Edge middleware (`src/proxy.ts`, when wired as Next.js middleware) verifies the token, then **redirects** to the same path without `token` and sets the HTTP-only **`token`** cookie. The cookie’s **`maxAge`** matches the JWT’s `exp` (decoded in middleware); see [`CMS-MIDDLEWARE.md`](./CMS-MIDDLEWARE.md).
4. The app verifies the JWT and creates the `sessions` row if missing and not previously revoked for this token (`verifyPrivilegedSession` in `src/lib/jwt.ts`).
5. Logout revokes that session; reusing the same link is rejected until you generate a **new** JWT (new `sid` / `jti`).

## `npm run generate-token` (script)

Default behavior:

- **Role:** `admin` (first matching user in DB for that role).
- **JWT lifetime:** **`1mo`** — one “month” = **30×24 hours** from generation time (`parseExpiry` in `src/lib/jwt.ts`).
- **Path prefix for printed URLs:** `/cms` (local `http://localhost:3000`, prod from `NEXT_PUBLIC_SITE_URL` when set and not localhost).

**Expiry format** (`--expiry=` or a positional token after role): suffix **`mo`** (30-day month), **`d`** (days), **`h`** (hours), **`m`** (**minutes** — not months). Examples: `1mo`, `14d`, `8h`, `30m`.

**CLI flags:**

| Flag | Example | Purpose |
|------|---------|---------|
| `--role=` | `--role=driver` | `admin`, `superuser`, or `driver` |
| `--expiry=` | `--expiry=7d` | Overrides default `1mo` |
| `--path=` | `--path=/orders` | First segment of printed links (must start with `/`) |
| `--port=` | `--port=3000` | Local URL port |

Positional args (when still at defaults): `admin` / `superuser` / `driver`, then an expiry like `14d`, then a path like `/cms`.

**Console output** includes JWT **expiry** (ISO-8601 + the shorthand you passed) and **Cookie max-age (seconds)** — the same window the bootstrap cookie uses when middleware sets it from `exp`.

## Seed model

- migrations insert one row per privileged role: `admin`, `superuser`, and `driver` (idempotent)
- there are no emails or passwords in the current model

## Cookie and JWT lifetimes (code reference)

- **Bootstrap cookie** (first visit with `?token=`): `maxAge` = seconds until JWT `exp` (`decodeJwt` in `src/proxy.ts`). If `exp` cannot be read, falls back to **`SESSION_MAX_AGE_SECONDS`** (**8 hours**) in `src/lib/auth/session.ts`.
- **`getSessionCookieOptions`:** still uses `SESSION_MAX_AGE_SECONDS` (8h) anywhere that helper sets cookies — keep bootstrap vs other paths in mind if you change server-side cookie setting.
- **DB `sessions.expires_at`:** set from the JWT `exp` when the row is created.

## Operator hygiene

- Default **`1mo`** is convenient for mobile/CMS; use **`--expiry=`** with a shorter value (e.g. `8h`, `1d`) when links should expire sooner.
- Rotate `JWT_SECRET` if a link leaks (old tokens become invalid).

## Rejected or invalid CMS access

Invalid or missing privileged sessions should **not** send users to the public home page.

- **Edge middleware** (`src/proxy.ts`, when wired as Next.js middleware — see [`CMS-MIDDLEWARE.md`](./CMS-MIDDLEWARE.md)): clears the `token` cookie and **rewrites** to `/cms-unauthorized`, which calls `notFound()` and renders the root **`not-found`** page (404). The browser URL may still show the original CMS path.
- **Client** (`JwtGatekeeper`): if `GET /api/auth/session` returns unauthenticated, or the user is neither **admin-equivalent** (`admin`, `superuser`) nor **driver** on a CMS route, navigates to `/cms-unauthorized` (same 404). **Drivers** on a disallowed CMS path are redirected to `/orders`. Allowed driver paths include `/cms`, `/notifications`, order fulfillment URLs, and client payment; see [`CMS-MIDDLEWARE.md`](./CMS-MIDDLEWARE.md).
