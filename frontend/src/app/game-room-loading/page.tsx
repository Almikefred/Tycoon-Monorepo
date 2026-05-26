import GameRoomLoadingClient from "@/clients/GameRoomLoadingClient";
import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = generatePageMetadata({
  title: "Loading Game Room",
  description:
    "Loading your Tycoon game room. Please wait while we prepare your game.",
  canonicalPath: "/game-room-loading",
  keywords: ["game loading", "room loading", "tycoon game"],
});

export default function GameRoomLoadingPage() {
  return (
    <main
      aria-label="Game room loading"
      aria-busy="true"
      className="relative min-h-screen w-full bg-[var(--tycoon-bg)]"
    >
      <a
        href="#loading-content-region"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--tycoon-accent)] focus:px-4 focus:py-2 focus:text-[var(--tycoon-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--tycoon-accent)] focus:ring-offset-2 focus:ring-offset-[var(--tycoon-bg)]"
      >
        Skip to loading status
      </a>

      <h1 className="sr-only font-orbitron text-2xl font-bold text-[var(--tycoon-accent)]">
        Loading Game Room
      </h1>

      <div
        id="loading-status-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Loading progress updates"
        className="sr-only"
      >
        Preparing your game room. Please wait.
      </div>

      <section
        id="loading-content-region"
        aria-label="Game room loading content"
        className="h-full w-full focus-within:ring-2 focus-within:ring-[var(--tycoon-accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--tycoon-bg)] [&_*:focus-visible]:outline-none [&_*:focus-visible]:ring-2 [&_*:focus-visible]:ring-[var(--tycoon-accent)] [&_*:focus-visible]:ring-offset-2"
      >
        <GameRoomLoadingClient />
      </section>
    </main>
  );
}
