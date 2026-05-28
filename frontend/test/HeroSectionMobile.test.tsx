/**
 * SW-FE-023/SW-FE-027: HeroSectionMobile — accessibility, error, and empty states.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockTrack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@/lib/errors", () => ({
  sanitizeError: (err: unknown) => ({
    userMessage: err instanceof Error ? err.message : "An unexpected error occurred",
    category: "unknown",
    recoverable: true,
  }),
}));

import HeroSectionMobile from "@/components/guest/HeroSectionMobile";

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe("HeroSectionMobile — accessibility", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockTrack.mockClear();
  });

  it("renders the section with an aria-label", () => {
    render(<HeroSectionMobile />);
    expect(screen.getByRole("region", { name: "Landing hero" })).toBeInTheDocument();
  });

  it("renders a single h1 element", () => {
    render(<HeroSectionMobile />);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("renders all four CTA buttons", () => {
    render(<HeroSectionMobile />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("all CTA buttons have accessible names", () => {
    render(<HeroSectionMobile />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toHaveAttribute("aria-label");
    }
  });

  it("decorative background element is hidden from assistive technology", () => {
    const { container } = render(<HeroSectionMobile />);
    const bg = container.querySelector<HTMLElement>("section > div[aria-hidden='true']");
    expect(bg).not.toBeNull();
  });

  it("navigates correctly when Continue Game is clicked", () => {
    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /continue game/i }));
    expect(mockPush).toHaveBeenCalledWith("/game-settings");
  });

  it("navigates correctly when Multiplayer is clicked", () => {
    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /multiplayer/i }));
    expect(mockPush).toHaveBeenCalledWith("/game-settings");
  });

  it("navigates correctly when Join Room is clicked", () => {
    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));
    expect(mockPush).toHaveBeenCalledWith("/join-room");
  });

  it("navigates correctly when Challenge AI is clicked", () => {
    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /challenge ai/i }));
    expect(mockPush).toHaveBeenCalledWith("/play-ai");
  });
});

describe("HeroSectionMobile — error state", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockTrack.mockClear();
  });

  it("renders error UI when navigation throws", () => {
    mockPush.mockImplementationOnce(() => { throw new Error("Navigation failed"); });

    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /continue game/i }));

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Navigation failed")).toBeInTheDocument();
  });

  it("renders generic message for non-Error throws", () => {
    mockPush.mockImplementationOnce(() => { throw "string error"; });

    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /continue game/i }));

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });

  it("error state has role='alert' for screen readers", () => {
    mockPush.mockImplementationOnce(() => { throw new Error("fail"); });

    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /continue game/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("Try Again button resets the error and restores normal state", () => {
    mockPush.mockImplementationOnce(() => { throw new Error("fail"); });

    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /continue game/i }));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Landing hero" })).toBeInTheDocument();
  });

  it("does not expose stack traces in error messages", () => {
    const err = new Error("fail");
    err.stack = "Error: fail\n    at Object.<anonymous> (test.ts:1:1)";
    mockPush.mockImplementationOnce(() => { throw err; });

    render(<HeroSectionMobile />);
    fireEvent.click(screen.getByRole("button", { name: /continue game/i }));

    expect(screen.queryByText(/at Object/)).not.toBeInTheDocument();
    expect(screen.queryByText(/test\.ts/)).not.toBeInTheDocument();
  });
});

describe("HeroSectionMobile — empty state (happy path)", () => {
  it("renders all content in normal state", () => {
    render(<HeroSectionMobile />);
    expect(screen.getByText("Welcome back, Player!")).toBeInTheDocument();
    expect(screen.getByText("TYCOON")).toBeInTheDocument();
  });

  it("all buttons are enabled in normal state", () => {
    render(<HeroSectionMobile />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).not.toBeDisabled();
    }
  });
});
