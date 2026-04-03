# Temporary Privileged Token Lock

This document is now historical context.

The emergency single-token allowlist has been replaced by stateful privileged sessions backed by the `users` and `sessions` tables.

## Superseded by

- `db/migrations/001_stateful_privileged_sessions.sql`
- `docs/JWT-GENERATION.md`
- Edge + cookie behavior for CMS paths: `docs/CMS-MIDDLEWARE.md`

## Notes

- privileged auth now uses revocable, session-backed management links
- raw `ADMIN_TOKEN` allowlisting is no longer the intended production model
- `?token=` CMS bootstrap links create the DB session on first successful visit; logout revokes that session so the same token cannot re-open CMS
