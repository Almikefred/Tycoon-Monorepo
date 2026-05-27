import { renderHook, act } from '@testing-library/react';
import { useJoinRoomTelemetry } from '../useJoinRoomTelemetry';
import { track } from '@/lib/analytics';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the analytics module
vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

describe('useJoinRoomTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return all tracking functions', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      expect(result.current.trackFormViewed).toBeDefined();
      expect(result.current.trackJoinAttempted).toBeDefined();
      expect(result.current.trackJoinSucceeded).toBeDefined();
      expect(result.current.trackJoinFailed).toBeDefined();
    });

    it('should accept custom route parameter', () => {
      const customRoute = '/custom-join-route';
      const { result } = renderHook(() => useJoinRoomTelemetry(customRoute));

      act(() => {
        result.current.trackFormViewed();
      });

      expect(track).toHaveBeenCalledWith(
        'join_room_form_viewed',
        expect.objectContaining({ route: customRoute })
      );
    });

    it('should use default route "/join-room" if not provided', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed();
      });

      expect(track).toHaveBeenCalledWith(
        'join_room_form_viewed',
        expect.objectContaining({ route: '/join-room' })
      );
    });
  });

  describe('trackFormViewed', () => {
    it('should track form viewed event with default source', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed();
      });

      expect(track).toHaveBeenCalledWith('join_room_form_viewed', {
        route: '/join-room',
        source: 'page_load',
      });
    });

    it('should track form viewed event with custom source', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed('modal_open');
      });

      expect(track).toHaveBeenCalledWith('join_room_form_viewed', {
        route: '/join-room',
        source: 'modal_open',
      });
    });

    it('should not include sensitive data in payload', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed();
      });

      const callArgs = (track as any).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('userId');
      expect(callArgs).not.toHaveProperty('walletAddress');
      expect(callArgs).not.toHaveProperty('sessionToken');
    });
  });

  describe('trackJoinAttempted', () => {
    it('should track join attempted event with default source', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinAttempted();
      });

      expect(track).toHaveBeenCalledWith('join_room_attempted', {
        route: '/join-room',
        source: 'submit_button',
      });
    });

    it('should track join attempted event with custom source', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinAttempted('keyboard_enter');
      });

      expect(track).toHaveBeenCalledWith('join_room_attempted', {
        route: '/join-room',
        source: 'keyboard_enter',
      });
    });

    it('should not include room code in payload (privacy)', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinAttempted();
      });

      const callArgs = (track as any).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('roomCode');
      expect(callArgs).not.toHaveProperty('code');
    });
  });

  describe('trackJoinSucceeded', () => {
    it('should track join succeeded event', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinSucceeded();
      });

      expect(track).toHaveBeenCalledWith('join_room_succeeded', {
        route: '/join-room',
      });
    });

    it('should not include user or room data in succeeded event', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinSucceeded();
      });

      const callArgs = (track as any).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('userId');
      expect(callArgs).not.toHaveProperty('roomCode');
      expect(callArgs).not.toHaveProperty('playerId');
    });
  });

  describe('trackJoinFailed', () => {
    it('should track join failed event with validation error', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinFailed('validation');
      });

      expect(track).toHaveBeenCalledWith('join_room_failed', {
        route: '/join-room',
        error_type: 'validation',
      });
    });

    it('should track join failed event with not_found error', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinFailed('not_found');
      });

      expect(track).toHaveBeenCalledWith('join_room_failed', {
        route: '/join-room',
        error_type: 'not_found',
      });
    });

    it('should track join failed event with room_full error', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinFailed('room_full');
      });

      expect(track).toHaveBeenCalledWith('join_room_failed', {
        route: '/join-room',
        error_type: 'room_full',
      });
    });

    it('should track join failed event with server_error', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinFailed('server_error');
      });

      expect(track).toHaveBeenCalledWith('join_room_failed', {
        route: '/join-room',
        error_type: 'server_error',
      });
    });

    it('should track join failed event with unknown error', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinFailed('unknown');
      });

      expect(track).toHaveBeenCalledWith('join_room_failed', {
        route: '/join-room',
        error_type: 'unknown',
      });
    });

    it('should not include error details or stack traces', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackJoinFailed('server_error');
      });

      const callArgs = (track as any).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('errorMessage');
      expect(callArgs).not.toHaveProperty('statusCode');
      expect(callArgs).not.toHaveProperty('stackTrace');
    });
  });

  describe('callback stability', () => {
    it('should return stable callback references across re-renders', () => {
      const { result, rerender } = renderHook(
        ({ route }) => useJoinRoomTelemetry(route),
        { initialProps: { route: '/join-room' } }
      );

      const { trackFormViewed: firstTrackFormViewed } = result.current;

      rerender({ route: '/join-room' });

      const { trackFormViewed: secondTrackFormViewed } = result.current;
      expect(firstTrackFormViewed).toBe(secondTrackFormViewed);
    });

    it('should update callbacks when route changes', () => {
      const { result, rerender } = renderHook(
        ({ route }) => useJoinRoomTelemetry(route),
        { initialProps: { route: '/join-room' } }
      );

      act(() => {
        result.current.trackFormViewed();
      });

      expect(track).toHaveBeenCalledWith(
        'join_room_form_viewed',
        expect.objectContaining({ route: '/join-room' })
      );

      vi.clearAllMocks();

      rerender({ route: '/admin-join-room' });

      act(() => {
        result.current.trackFormViewed();
      });

      expect(track).toHaveBeenCalledWith(
        'join_room_form_viewed',
        expect.objectContaining({ route: '/admin-join-room' })
      );
    });
  });

  describe('privacy compliance', () => {
    it('should never track room codes (privacy protection)', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed();
        result.current.trackJoinAttempted();
        result.current.trackJoinSucceeded();
        result.current.trackJoinFailed('validation');
      });

      const allCalls = (track as any).mock.calls;
      allCalls.forEach(([, payload]: [string, any]) => {
        const payloadStr = JSON.stringify(payload);
        // Should not contain any recognizable room code patterns
        expect(payloadStr).not.toMatch(/[A-Z0-9]{6}/);
      });
    });

    it('should never track user identifiers', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed();
        result.current.trackJoinAttempted();
        result.current.trackJoinSucceeded();
        result.current.trackJoinFailed('validation');
      });

      const allCalls = (track as any).mock.calls;
      allCalls.forEach(([, payload]: [string, any]) => {
        expect(payload).not.toHaveProperty('userId');
        expect(payload).not.toHaveProperty('walletAddress');
        expect(payload).not.toHaveProperty('sessionId');
        expect(payload).not.toHaveProperty('playerId');
      });
    });

    it('should never track authentication tokens', () => {
      const { result } = renderHook(() => useJoinRoomTelemetry());

      act(() => {
        result.current.trackFormViewed();
      });

      const allCalls = (track as any).mock.calls;
      allCalls.forEach(([, payload]: [string, any]) => {
        const payloadStr = JSON.stringify(payload);
        expect(payloadStr).not.toContain('token');
        expect(payloadStr).not.toContain('jwt');
        expect(payloadStr).not.toContain('bearer');
      });
    });
  });
});
