import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  hasJoinAuthToken,
  mapJoinRoomErrors,
  sanitiseDisplayName,
  sanitiseInviteToken,
  sanitiseRoomCode,
  sanitizeJoinRoomErrorMessage,
} from "@/lib/join-room/security";
import { TycoonApiError } from "@/lib/api/errors";
import {
  displayNameSchema,
  inviteTokenSchema,
  joinRoomSchema,
} from "@/lib/validation/schemas";

describe("sanitiseRoomCode", () => {
  it("strips non-alphanumeric characters and uppercases", () => {
    expect(sanitiseRoomCode("ab!c@12")).toBe("ABC12");
  });

  it("caps input at 6 characters", () => {
    expect(sanitiseRoomCode("ABCDEFGH")).toBe("ABCDEF");
  });
});

describe("sanitiseInviteToken", () => {
  it("strips invalid characters and caps length", () => {
    expect(sanitiseInviteToken("abc!@#123-xyz")).toBe("abc123-xyz");
  });

  it("rejects invalid tokens via schema after sanitisation", () => {
    const result = inviteTokenSchema.safeParse(sanitiseInviteToken("short"));
    expect(result.success).toBe(false);
  });

  it("accepts a valid invite token", () => {
    const token = sanitiseInviteToken("invite-abc12345");
    expect(inviteTokenSchema.safeParse(token).success).toBe(true);
  });
});

describe("sanitiseDisplayName", () => {
  it("strips script-like characters", () => {
    expect(sanitiseDisplayName("Alice<script>")).toBe("Alicescript");
  });

  it("rejects empty display names via schema", () => {
    expect(displayNameSchema.safeParse(sanitiseDisplayName("   ")).success).toBe(false);
  });

  it("accepts a valid display name", () => {
    expect(displayNameSchema.safeParse(sanitiseDisplayName("Player One")).success).toBe(true);
  });
});

describe("joinRoomSchema", () => {
  it("rejects codes with invalid characters after normalisation", () => {
    expect(joinRoomSchema.safeParse({ roomCode: "TY-C01" }).success).toBe(false);
  });

  it("accepts a valid 6-character code", () => {
    expect(joinRoomSchema.safeParse({ roomCode: "tyc001" }).success).toBe(true);
  });
});

describe("sanitizeJoinRoomErrorMessage", () => {
  it("redacts JWT tokens from error messages", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const result = sanitizeJoinRoomErrorMessage(`Auth failed: ${jwt}`);
    expect(result).not.toContain("eyJhbGci");
    expect(result).toContain("[redacted]");
  });

  it("redacts session id patterns", () => {
    const result = sanitizeJoinRoomErrorMessage("session_id=abc123secret");
    expect(result).toContain("[redacted]");
    expect(result).not.toContain("abc123secret");
  });
});

describe("hasJoinAuthToken", () => {
  afterEach(() => {
    localStorage.removeItem("access_token");
  });

  it("returns false when no token is stored", () => {
    expect(hasJoinAuthToken()).toBe(false);
  });

  it("returns true when a non-empty token is stored", () => {
    localStorage.setItem("access_token", "test-token");
    expect(hasJoinAuthToken()).toBe(true);
  });
});

describe("mapJoinRoomErrors", () => {
  it("maps TycoonApiError status codes to safe messages", () => {
    const err = new TycoonApiError({
      code: "NOT_FOUND",
      statusCode: 404,
      message: "Game with ID 42 not found",
    });
    expect(mapJoinRoomErrors(err)).toEqual({
      _form: "Room not found. Check the code and try again.",
    });
  });

  it("blocks unauthorized join attempts with a clear message", () => {
    expect(mapJoinRoomErrors({ statusCode: 401 })).toEqual({
      _form: "Please sign in to join a room.",
    });
  });

  it("returns a clear error for expired invites", () => {
    expect(mapJoinRoomErrors({ statusCode: 410 })).toEqual({
      _form: "This invite link has expired. Ask the host for a new one.",
    });
    expect(
      mapJoinRoomErrors({ message: "Invite token expired for game 99" })
    ).toEqual({
      _form: "This invite link has expired. Ask the host for a new one.",
    });
  });

  it("handles stale room-full and already-joined states without leaking internals", () => {
    expect(mapJoinRoomErrors({ statusCode: 409 })).toEqual({
      _form: "Room is full. Try a different room.",
    });
    expect(mapJoinRoomErrors({ message: "User already joined this game" })).toEqual({
      _form: "You're already in this room.",
    });
  });
});
