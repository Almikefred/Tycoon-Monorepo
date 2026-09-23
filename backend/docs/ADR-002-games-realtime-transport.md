# ADR-002: Games Realtime Transport — WebSocket vs Server-Sent Events

**Status:** Decided  
**Date:** 2026-08-26  
**Author:** Backend Team  
**Issue:** #1440

## Problem Statement

The games module currently provides only REST endpoints for matchmaking and board state queries. Players need real-time synchronization for board state changes (turn advances, dice rolls, property purchases) without polling. Two primary transports are candidates:

1. **WebSocket** — bidirectional, full-duplex, stateful per client
2. **Server-Sent Events (SSE)** — unidirectional (server→client), HTTP-based, simpler

**Constraints:**
- Must support JWT-authenticated handshakes (no unauthenticated broadcast)
- Must handle turn-based game actions (player rolls, buys property)
- Must scale horizontally (prefer stateless when possible)
- Minimal event set: `join`, `roll`, `turn`, `disconnect`

---

## Decision

**Adopt WebSocket with JWT-authenticated handshake via `namespace: 'games'`.**

### Rationale

| Criterion | WebSocket | SSE |
|-----------|-----------|-----|
| **Bidirectional** | ✅ (native) | ❌ (requires separate HTTP for client→server) |
| **Game Actions** | ✅ (send roll, buy property) | ⚠️ (requires parallel POST requests) |
| **Latency** | ✅ (low) | ✅ (adequate for turn-based) |
| **Scalability** | ⚠️ (stateful, needs sticky sessions or Redis) | ✅ (stateless) |
| **Auth** | ✅ (handshake-based JWT) | ✅ (via Authorization header) |
| **Complexity** | ⚠️ (socket.io protocol) | ✅ (simple HTTP chunks) |
| **Industry Standard** | ✅ (games use WebSocket) | ❌ (not standard for games) |

**WebSocket chosen because:**
1. **Bidirectional communication** is essential for turn-based game actions (rolling dice, making moves) — clients must send actions in real time, not just receive updates.
2. **Turn-based gameplay** doesn't require extreme low-latency (unlike action games), so the slightly higher complexity of WebSocket is worth the cleaner UX.
3. **Industry norm** — multiplayer games universally use WebSocket or proprietary protocols; SSE is primarily for notifications (Slack, GitHub, HackerNews tickers).
4. **Architectural fit** — this codebase already uses socket.io (`PerkBoostGateway`), so leveraging existing patterns reduces learning curve and infrastructure overhead.

---

## Implementation

### Minimal Event Set

**Server → Client:**
- `join` — player joined a game session
- `turn` — turn changed to a specific player
- `roll` — player rolled dice (dice value + player info)
- `disconnect` — player left the session

**Client → Server:**
- `join` — player joins a specific game room
- `roll` — player initiates a dice roll
- `turn-ready` — player signals ready for next turn

### JWT Authentication

On WebSocket handshake:
1. Client must provide a JWT token via `handshake.auth.token` or `Authorization: Bearer <token>` header.
2. Server extracts token, verifies with `JwtService.verifyAsync()`.
3. Token must be valid; invalid/missing tokens result in immediate disconnect.
4. User ID from JWT payload is attached to the socket as `client.data.userId`.

### CORS & Origin Restrictions

- Uses `getWsCorsConfig()` (same as `PerkBoostGateway`).
- No `*` wildcard allowed (enforced at startup for production).
- Respects `WS_CORS_ORIGINS` environment variable.

### Room Isolation

- Each game session has a dedicated room: `game_<gameId>`.
- Only authenticated players in that game's room receive updates.
- No broadcast to unauthenticated clients.

### AI Opponent Turns — Shared Rule Engine Parity (Issue #1703)

AI opponent turns MUST execute through the **same shared rule engine** as human turns. There is no AI-only rule path.

**Parity invariants:**
1. **Single rule engine** — both human and AI turns are resolved by the shared rule engine (dice, movement, rent, purchases, bankruptcy). AI never mutates board state directly.
2. **Server authority** — the server is the sole source of truth for dice, money, inventory, and turn mutations. AI decisions are computed server-side only; clients cannot submit, spoof, or replay AI actions.
3. **Same event surface** — AI turns emit the same `turn` / `roll` events as human turns, so clients render AI and human turns identically.
4. **Deterministic inputs** — AI decisions are derived from the same server-side game state snapshot the rule engine consumes for human turns; no privileged state access.
5. **Idempotency** — AI turn advancement is keyed by `(gameId, turnIndex)` so duplicate/reconnect retries cannot double-apply a turn.

**Authz:** AI turns are triggered only by server-side scheduling or an authenticated, authorized caller (JWT / AdminGuard / API-key / WS seat check). Untrusted clients cannot trigger or spoof AI turns; deny-by-default for any new AI-turn entrypoint.

**Error mapping:** AI-turn failures surface typed errors with explicit codes per `docs/API_ERROR_RESPONSE_STANDARDS.md`, including `requestId`/correlation for observability. Writes fail closed on dependency outage (Postgres/Redis/RPC).

**Rollout:** AI-turn execution is gated behind a feature flag/kill switch; rollback disables AI turns without affecting human turn handling.

---

## Explicit Out of Scope

- **Frontend client implementation** (`useGameBoardLogic` wiring) — this ADR defines the backend gateway only; frontend updates are a follow-up.
- **Game action processing logic** (rolling, buying properties) — existing REST endpoints continue to handle this; WebSocket is for state sync only.
- **Persistence** — WebSocket events are ephemeral notifications; permanent state lives in the database.

---

## Testing & Rollout

1. **Unit tests** — gateway connection, disconnection, message routing.
2. **Integration tests** — full handshake flow, unauthorized rejection, room isolation.
3. **Canary deployment** — enable gateway for 10% of users, monitor connection health and error rates.
4. **Gradual rollout** — increase percentage as confidence grows; monitor socket.io connection pool usage.

---

## Related ADRs

- ADR-001: Shop Purchase Write Path — established proxy pattern; not directly related but shows decision-making approach.

