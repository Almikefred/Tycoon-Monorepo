"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { joinRoomSchema } from "@/lib/validation/schemas";
import { mapServerErrors, type FieldErrors } from "@/lib/validation/serverErrorMap";
import { apiClient } from "@/lib/api/client";
import type { GameResponse } from "@/lib/api/types/dto";
import { useJoinRoomTelemetry } from "@/hooks/useJoinRoomTelemetry";
import { useErrorReporting } from "@/hooks/useErrorReporting";

/** Converts a Zod error into a flat field-keyed error map. */
function parseZodErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "_form");
    if (!out[field]) out[field] = issue.message;
  }
  return out;
}

/**
 * Strip any character that is not alphanumeric, then uppercase and cap at 6.
 * Applied on every keystroke so the user never sees invalid characters in the
 * input — this is the primary client-side input sanitisation gate.
 */
function sanitiseRoomCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
}

/** Minimum milliseconds between successive join attempts (rate-limit guard). */
const SUBMIT_COOLDOWN_MS = 2_000;

export default function JoinRoomForm(): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /** Timestamp of the last submission attempt — used for client-side rate limiting. */
  const lastSubmitRef = useRef<number>(0);
  const formViewedRef = useRef(false);

  const errorId = "room-code-error";

  // Telemetry and error reporting hooks
  const { trackFormViewed, trackJoinAttempted, trackJoinSucceeded, trackJoinFailed } =
    useJoinRoomTelemetry("/join-room");
  const { reportError } = useErrorReporting();

  // Move focus to the input on mount so keyboard users land directly in the form
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track form viewed event once on component mount
  useEffect(() => {
    if (!formViewedRef.current) {
      trackFormViewed("page_load");
      formViewedRef.current = true;
    }
  }, [trackFormViewed]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitise on every change: strip non-alphanumeric chars, uppercase, cap at 6.
    setCode(sanitiseRoomCode(e.target.value));
    // Only clear field-level errors on change; _form errors persist until retry
    setErrors(({ roomCode: _dropped, ...rest }) => rest as FieldErrors);
  }, []);

  /** Re-run the submit flow without clearing the code — used by the retry button. */
  const handleRetry = useCallback(() => {
    setErrors({});
    // Reset the rate-limit clock so the retry is never blocked by the cooldown.
    lastSubmitRef.current = 0;
    formRef.current?.requestSubmit();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Client-side rate limiting: reject submissions that arrive too quickly.
      const now = Date.now();
      if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
        setErrors({ _form: "Please wait a moment before trying again." });
        return;
      }
      lastSubmitRef.current = now;

      const result = joinRoomSchema.safeParse({ roomCode: code });
      if (!result.success) {
        setErrors(parseZodErrors(result.error));
        trackJoinFailed("validation");
        return;
      }

      setSubmitAttempts((prev) => prev + 1);
      setIsLoading(true);
      setErrors({});

      // Track the join attempt
      trackJoinAttempted("submit_button");

      try {
        const startTime = performance.now();

        const response = await apiClient.post<GameResponse>(
          `/games/${encodeURIComponent(result.data.roomCode)}/join`,
          {}
        );

        const duration = performance.now() - startTime;

        // Track successful join
        trackJoinSucceeded();

        // Report performance metrics (non-blocking)
        if (window.requestIdleCallback) {
          requestIdleCallback(() => {
            // Report join time to analytics if needed
            console.debug(`[Join Room] Join completed in ${duration.toFixed(2)}ms`);
          });
        }

        router.push(`/game-waiting?gameCode=${encodeURIComponent(result.data.roomCode)}`);
      } catch (err: unknown) {
        const errorMap = mapServerErrors(err instanceof Error ? { message: err.message } : err);
        setErrors(errorMap);

        // Determine error type for telemetry
        let errorType: "validation" | "not_found" | "room_full" | "server_error" | "unknown" =
          "unknown";

        if (err instanceof Error) {
          const msg = err.message.toLowerCase();
          if (msg.includes("404") || msg.includes("not found")) {
            errorType = "not_found";
          } else if (msg.includes("409") || msg.includes("full")) {
            errorType = "room_full";
          } else if (msg.includes("5")) {
            errorType = "server_error";
          }
        }

        trackJoinFailed(errorType);

        // Report error if it's a server/network error
        if (errorType === "server_error" || errorType === "unknown") {
          reportError(err, {
            context: "join_room_submit",
            attemptNumber: submitAttempts + 1,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [code, router, trackJoinAttempted, trackJoinSucceeded, trackJoinFailed, reportError, submitAttempts]
  );

  const isValid = joinRoomSchema.safeParse({ roomCode: code }).success;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Form-level error banner — shown for server/network errors that are not
          tied to a specific field (e.g. room not found, room full, 5xx). */}
      {errors._form && (
        <div
          role="alert"
          data-testid="form-error-banner"
          className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-300"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1 leading-snug">{errors._form}</span>
          {isValid && (
            <button
              type="button"
              onClick={handleRetry}
              aria-label="Retry joining the room"
              className="ml-1 inline-flex items-center gap-1 text-xs text-red-300 underline-offset-2 hover:underline"
            >
              <RefreshCw aria-hidden="true" className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      )}

      <FormField
        id="room-code"
        label="Room Code"
        hint="6-character alphanumeric code (e.g. TYCOON)"
        error={errors.roomCode}
        required
      >
        <Input
          ref={inputRef}
          id="room-code"
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="e.g. TYCOON"
          maxLength={6}
          autoComplete="off"
          spellCheck={false}
          aria-required="true"
          aria-describedby={errors.roomCode ? errorId : undefined}
          aria-invalid={!!errors.roomCode}
          className="bg-[var(--tycoon-bg)] border-[var(--tycoon-border)] text-[var(--tycoon-text)] placeholder:text-[var(--tycoon-text)]/40 focus-visible:ring-[var(--tycoon-accent)] font-orbitron tracking-widest uppercase"
        />
      </FormField>

      <Button
        type="submit"
        disabled={!isValid || isLoading}
        aria-busy={isLoading}
        aria-disabled={!isValid || isLoading}
        className="w-full bg-[var(--tycoon-accent)] text-[var(--tycoon-bg)] font-orbitron font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--tycoon-accent)] focus-visible:ring-offset-2"
      >
        {/* min-w reserves the wider "Joining…" width so the button never
            resizes when the label swaps — eliminates a micro CLS contribution. */}
        <span className="inline-block min-w-[4.5rem] text-center">
          {isLoading ? "Joining\u2026" : "Join"}
        </span>
      </Button>
    </form>
  );
}
