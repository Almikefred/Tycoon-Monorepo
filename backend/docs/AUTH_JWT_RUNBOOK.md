# AUTH_JWT_RUNBOOK

Operational runbook for Tycoon authentication: JWT access/refresh tokens, refresh
rotation with reuse detection, httpOnly cookie transport (ADR-004), CSRF, and
NEAR wallet challenge/nonce verification.

Sources of truth:

- `backend/docs/TOKEN_REFRESH_SECURITY_GUIDE.md`
- `frontend/docs/ADR-004-session-tokens-httpOnly-cookies.md`
- `backend/test/auth-token-security.e2e-spec.ts`
- `backend/test/auth.e2e-spec.ts`

## 1. Token model

| Token   | Lifetime | Storage                          | Transport            |
| ------- | -------- | -------------------------------- | -------------------- |
| Access  | 15m      | httpOnly Secure SameSite cookie  | `Set-Cookie`         |
| Refresh | 30d      | httpOnly Secure SameSite cookie  | `Set-Cookie`         |

- Access tokens are **never** exposed to JavaScript. No `localStorage`,
  `sessionStorage`, or JS-readable cookies (ADR-004).
- Cookies are `httpOnly`, `Secure`, `SameSite=Lax` (or `Strict` for admin
  surfaces), and scoped to the API origin with `Path=/`.
- The server is the source of truth for money, dice, inventory, and admin
  mutations. A valid cookie is required for every authenticated write.

## 2. Refresh rotation

Every refresh call rotates the refresh token:

1. Validate the presented refresh token signature, expiry, and `jti`.
2. Look up the refresh family (`familyId`) and the token record.
3. If the token is **unused and unrevoked**, mark it used, issue a new access +
   refresh pair in the same family, and return both as httpOnly cookies.
4. If the token was **already used or revoked**, treat it as reuse (see §3).

Rotation is atomic: the used-mark and the new-token insert happen in a single
transaction so concurrent duplicate requests cannot both succeed.

## 3. Reuse detection

Reuse of a rotated refresh token means the token was stolen or replayed.

- On detection, **revoke the entire refresh family** (`familyId`), not just the
  presented token. All descendants become invalid immediately.
- Return `401 Unauthorized` and clear both auth cookies.
- Emit a security event with the `familyId` and `userId` only. Never log the
  token value, `jti`, or any PII.
- Fail closed: if the token store (Postgres/Redis) is unavailable, reject the
  refresh rather than issuing new tokens.

## 4. CSRF strategy

Cookie-authenticated mutations require CSRF protection:

- Double-submit token: a non-httpOnly `csrf` cookie paired with an
  `X-CSRF-Token` header that must match.
- `SameSite=Lax`/`Strict` cookies as defense in depth.
- Reject state-changing requests (POST/PUT/PATCH/DELETE) with a missing or
  mismatched CSRF token using `403 Forbidden`.
- Safe methods (GET/HEAD/OPTIONS) are exempt.

## 5. NEAR wallet challenge / nonce

- Issue a single-use, time-boxed challenge nonce per login attempt.
- Verify the NEAR signature with domain separation and bind the `account_id`
  into the signed payload.
- Throttle challenge issuance per IP and per account to prevent enumeration.
- Reject replayed nonces; a nonce is consumed on first successful verify.
- If the user rejects the signature, no session is created and the nonce is
  discarded.

## 6. Redirects

- `returnTo` values are validated against an allowlist of known origins/paths.
- Reject open-redirect attempts (absolute URLs, protocol-relative `//`, and
  encoded variants) with `400 Bad Request`.

## 7. WebSocket handshake

- The WS handshake parses the same httpOnly auth cookies as REST.
- Unauthenticated or expired handshakes are rejected before upgrade.
- Deny by default for new WS/action surfaces.

## 8. Failure modes

| Condition                         | Behavior                                  |
| --------------------------------- | ----------------------------------------- |
| Refresh reuse detected            | Revoke family, `401`, clear cookies       |
| Parallel refresh (same token)     | One succeeds, others treated as reuse     |
| Token store outage                | Fail closed, `503`, no new tokens         |
| Auth expiry mid-flow              | `401`, client re-authenticates            |
| Forbidden role                    | `403`, no data leak                       |
| Oversized / adversarial payload   | `413`/`400`, request rejected             |

## 9. Rollback

- Rotation and reuse detection can be disabled behind a feature flag if a
  regression is found; disabling reverts to single-token refresh without
  family revocation.
- Rollback must not re-enable JS-readable tokens; ADR-004 cookie transport
  stays in place.

## 10. Verification

- `backend/test/auth-token-security.e2e-spec.ts` — rotation, reuse detection,
  family revocation, cookie flags, CSRF.
- `backend/test/auth.e2e-spec.ts` — login, refresh, logout, role access.
- Unit tests — signature verification negatives, replayed nonce, forged
  `account_id`.
- Frontend RTL — wallet reject path creates no session.
