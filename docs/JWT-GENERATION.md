# Privileged CMS login (JWT + sessions)

Privileged access uses:

- a minimal `users` table with exactly two seeded roles: `admin` and `driver`
- a `sessions` table for revocable server-backed sessions
- `scripts/generate-token.ts` to mint a **JWT only** (no DB row yet)
- the **first** successful CMS visit with `?token=` creates the matching `sessions` row
- `POST /api/auth/logout` revokes the current session so that **same bearer token** cannot be bootstrapped again
- `GET /api/auth/session` to inspect the current authenticated session

## Flow

1. Run the script (needs `JWT_SECRET` and `DATABASE_URL` with seeded `users` — only to resolve `userId` for the role).
2. Open the printed link (`/cms?token=...`) on the app that shares **the same** `JWT_SECRET` and `DATABASE_URL` as production (or generate using prod env).
3. The app verifies the JWT and creates the session if missing and not previously revoked for this token.
4. Logout revokes that session; reusing the same link is rejected until you generate a **new** JWT (new `sid` / `jti`).

## Seed model

- the migration inserts exactly two users: one `admin`, one `driver`
- there are no emails or passwords in the current model

## Operator hygiene

- keep generated links short-lived in production
- rotate `JWT_SECRET` if a link leaks (old tokens become invalid)
