import React from 'react';
import WhatIsTycoon from '@/components/guest/WhatIsTycoon';
import { BoardSquare } from '@/components/game/BoardSquare';
import JoinRoomForm from '@/components/settings/JoinRoomForm';

export default {
  title: 'Visual Regression/Baseline',
};

export const MarketingLanding = () => (
  <div className="min-h-screen bg-[#010F10] p-8 text-white">
    <WhatIsTycoon />
  </div>
);

MarketingLanding.storyName = 'Marketing Landing (stable state)';

export const HUDBoardSquares = () => (
  <div className="min-h-screen bg-[#010F10] p-8 text-white">
    <h2 className="mb-4 text-2xl font-bold">HUD: Board Squares</h2>
    <div className="grid grid-cols-4 gap-4">
      <BoardSquare name="GO" type="go" position={0} color="bg-transparent" />
      <BoardSquare name="Income Tax" type="tax" position={4} color="bg-transparent" />
      <BoardSquare name="Community" type="community" position={2} color="bg-transparent" />
      <BoardSquare name="Jail" type="jail" position={10} color="bg-transparent" />
      <BoardSquare name="Park Place" type="property" position={37} color="bg-[#00008B]" />
    </div>
  </div>
);

HUDBoardSquares.storyName = 'HUD board squares (stable)';

/** Chromatic baseline — join room flow error / loading states (#843). */
export const JoinRoomIdle = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8">
    <JoinRoomForm previewState={{ skipAutoFocus: true, code: '' }} />
  </div>
);
JoinRoomIdle.storyName = 'Join room — idle';

export const JoinRoomLoading = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8">
    <JoinRoomForm
      previewState={{ skipAutoFocus: true, code: 'ABC123', isLoading: true }}
    />
  </div>
);
JoinRoomLoading.storyName = 'Join room — loading';

export const JoinRoomRoomNotFound = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8">
    <JoinRoomForm
      previewState={{
        skipAutoFocus: true,
        code: 'NOTFND',
        errors: { _form: 'Room not found. Check the code and try again.' },
      }}
    />
  </div>
);
JoinRoomRoomNotFound.storyName = 'Join room — room not found';

export const JoinRoomInviteExpired = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8">
    <JoinRoomForm
      previewState={{
        skipAutoFocus: true,
        code: 'EXPIRD',
        errors: {
          _form: 'This invite link has expired. Ask the host for a new one.',
        },
      }}
    />
  </div>
);
JoinRoomInviteExpired.storyName = 'Join room — invite expired';

export const JoinRoomFull = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8">
    <JoinRoomForm
      previewState={{
        skipAutoFocus: true,
        code: 'FULL00',
        errors: { _form: 'Room is full. Try a different room.' },
      }}
    />
  </div>
);
JoinRoomFull.storyName = 'Join room — room full';

export const JoinRoomUnauthorized = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8">
    <JoinRoomForm
      previewState={{
        skipAutoFocus: true,
        code: 'UNAUTH',
        errors: { _form: 'Please sign in to join a room.' },
      }}
    />
  </div>
);
JoinRoomUnauthorized.storyName = 'Join room — unauthorized';

export const JoinRoomSuccess = () => (
  <div className="min-h-screen bg-[var(--tycoon-bg)] p-8 text-center">
    <p className="font-orbitron text-lg text-[var(--tycoon-accent)]">Join successful</p>
    <p className="mt-2 text-sm text-[var(--tycoon-text)]/80">
      Redirecting to the waiting room…
    </p>
  </div>
);
JoinRoomSuccess.storyName = 'Join room — success redirect';
