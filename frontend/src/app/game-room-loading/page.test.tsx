import { render, screen } from "@testing-library/react";
import { expect, test, describe, vi } from "vitest";
import GameRoomLoadingPage from "./page";

vi.mock("@/clients/GameRoomLoadingClient", () => ({
  default: () => (
    <div data-testid="loading-client">
      <button type="button" aria-label="Cancel loading">
        Cancel
      </button>
      <p role="status">Loading game room...</p>
    </div>
  ),
}));

describe("Game Room Loading Page - Accessibility", () => {
  describe("Landmarks and ARIA", () => {
    test("renders main landmark with aria-label and busy state", () => {
      const { container } = render(<GameRoomLoadingPage />);
      const main = container.querySelector('main[aria-label="Game room loading"]');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute("aria-busy", "true");
    });

    test("renders loading content region with aria-label", () => {
      const { container } = render(<GameRoomLoadingPage />);
      const region = container.querySelector(
        'section[aria-label="Game room loading content"]',
      );
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("id", "loading-content-region");
    });

    test("includes visually hidden h1 heading", () => {
      render(<GameRoomLoadingPage />);
      expect(
        screen.getByRole("heading", { level: 1, name: "Loading Game Room" }),
      ).toBeInTheDocument();
    });

    test("provides aria-live region for loading progress", () => {
      const { container } = render(<GameRoomLoadingPage />);
      const announcer = container.querySelector("#loading-status-announcer");
      expect(announcer).toBeInTheDocument();
      expect(announcer).toHaveAttribute("role", "status");
      expect(announcer).toHaveAttribute("aria-live", "polite");
      expect(announcer).toHaveAttribute("aria-atomic", "true");
      expect(announcer).toHaveAttribute(
        "aria-label",
        "Loading progress updates",
      );
      expect(announcer?.textContent).toContain("Preparing your game room");
    });
  });

  describe("Focus order", () => {
    test("skip link targets the loading content region", () => {
      render(<GameRoomLoadingPage />);
      const skipLink = screen.getByRole("link", { name: "Skip to loading status" });
      expect(skipLink).toHaveAttribute("href", "#loading-content-region");
    });

    test("tab order is: skip link → loading controls", () => {
      render(<GameRoomLoadingPage />);
      const skipLink = screen.getByRole("link", { name: "Skip to loading status" });
      const cancel = screen.getByRole("button", { name: "Cancel loading" });

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      expect(focusables.indexOf(skipLink)).toBeLessThan(focusables.indexOf(cancel));
    });

    test("skip link is keyboard focusable with visible focus styles", () => {
      render(<GameRoomLoadingPage />);
      const skipLink = screen.getByRole("link", { name: "Skip to loading status" });
      expect(skipLink.className).toContain("focus:ring-2");
      expect(skipLink.className).toContain("focus:not-sr-only");
    });

    test("loading content region applies focus-visible styles to descendants", () => {
      const { container } = render(<GameRoomLoadingPage />);
      const region = container.querySelector("#loading-content-region");
      expect(region?.className).toContain("focus-visible");
    });
  });
});
