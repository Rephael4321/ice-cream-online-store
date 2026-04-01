# Privileged Auth Migration Note

Privileged access now uses:
- a minimal `users` table with exactly two seeded roles: `admin` and `driver`
- a `sessions` table for revocable server-backed sessions
- `scripts/generate-token.ts` to generate a stateful management link for `admin` or `driver`
- `POST /api/auth/logout` to revoke the current session
- `GET /api/auth/session` to inspect the current authenticated session

## What changed

- `scripts/generate-token.ts` now creates a real DB-backed session token
- `?token=` management links are the supported login path again
- privileged requests are authorized by active session lookup, not by standalone JWT validity

## Seed model

- the migration inserts exactly two users: one `admin`, one `driver`
- there are no emails or passwords in the current model
- use the token-generation script to produce a management link for one of those roles

## Recommended next documentation

If you want a full operator guide, document:
- how to generate admin and driver links safely
- how to revoke sessions
- how long generated links should live in production
