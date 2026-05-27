/**
 * Security utilities for the Join Room flow (#841).
 *
 * Privacy guarantees:
 *  - User-supplied inputs are sanitised before use.
 *  - Error messages are scrubbed of tokens, session IDs, and JWTs before display.
 *  - Auth is verified client-side before any room-join mutation is attempted.
 */

import { isApiError } from "@/lib/api/errors";
import {
  mapServerErrors,
  type FieldErrors,
} from "@/lib/validation/serverErrorMap";

/** JWT-shaped bearer tokens and long opaque secrets. */
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g;
const SESSION_RE = /\b(session[_-]?id|token|bearer)[=:]\s*\S+/gi;

interface JoinRoomErrorBody {
  message?: string | string[];
  statusCode?: number;
}

/**
 * Strip any character that is not alphanumeric, then uppercase and cap at 6.
 */
export function sanitiseRoomCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
}

/** URL-safe invite tokens: alphanumeric, dash, underscore; max 64 chars. */
export function sanitiseInviteToken(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

/** Display names: letters, numbers, spaces, and basic punctuation; max 32 chars. */
export function sanitiseDisplayName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s'.-]/gu, "")
    .trim()
    .slice(0, 32);
}

/**
 * Truncates and redacts token/session patterns before messages reach the UI.
 */
export function sanitizeJoinRoomErrorMessage(msg: string, maxLen = 200): string {
  let safe = msg.replace(JWT_RE, "[redacted]").replace(SESSION_RE, "[redacted]");
  if (safe.length > maxLen) safe = safe.slice(0, maxLen) + "…";
  return safe;
}

/** Returns true when a bearer token is present for authenticated join attempts. */
export function hasJoinAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("access_token");
  return typeof token === "string" && token.trim().length > 0;
}

function toJoinRoomErrorBody(error: unknown): JoinRoomErrorBody {
  if (isApiError(error)) {
    return { statusCode: error.statusCode, message: error.message };
  }
  if (typeof error === "object" && error !== null) {
    const body = error as JoinRoomErrorBody;
    if ("statusCode" in body || "message" in body) {
      return body;
    }
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return {};
}

function scrubFieldErrors(mapped: FieldErrors): FieldErrors {
  const out: FieldErrors = {};
  for (const [field, message] of Object.entries(mapped)) {
    out[field] = sanitizeJoinRoomErrorMessage(message);
  }
  return out;
}

/**
 * Maps API/validation errors to join-room field errors without leaking secrets.
 */
export function mapJoinRoomErrors(error: unknown): FieldErrors {
  return scrubFieldErrors(mapServerErrors(toJoinRoomErrorBody(error)));
}
