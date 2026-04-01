# Temporary Privileged Token Lock

This repository currently rejects every privileged JWT except one explicit allowlisted admin token.

## What is allowed

- Only the exact token string stored in `ADMIN_TOKEN`
- That token must still verify successfully and decode to the expected admin payload

## What is blocked

- Any other JWT, even if it is otherwise valid and signed correctly
- Any JWT payload that identifies as `driver`
- Legacy admin payload shapes such as `admin: true` or `id: "admin"` unless the token string exactly matches `ADMIN_TOKEN`

## Current behavior

- `verifyJWT()` returns `null` for every token except the exact `ADMIN_TOKEN` value
- `createJWT()` rejects privileged token issuance
- `createJWTWithExpiry()` rejects privileged token issuance
- CMS page routes redirect as if no valid token was sent
- Protected API routes return `401` as if no valid token was sent
- Token cookies are cleared when protected CMS routes reject access

## Why this exists

This is an emergency temporary lock intended to disable leaked privileged access while preserving one controlled admin token for this app.

## Before removing

- Rotate `JWT_SECRET`
- Remove or replace the `ADMIN_TOKEN` exception
- Re-issue any legitimate admin or driver tokens
- Re-test CMS pages and protected API routes
