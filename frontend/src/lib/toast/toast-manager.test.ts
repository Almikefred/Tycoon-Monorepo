import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock react-toastify before importing the module under test.
// Use vi.hoisted so mockToast is initialised before the vi.mock factory runs.
// ---------------------------------------------------------------------------

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: mockToast,
}));

import { ToastManager } from './toast-manager';

let toastManager: ToastManager;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Fresh instance per test — prevents dedup queue bleed between tests
  toastManager = new ToastManager();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

describe('ToastManager convenience methods', () => {
  it('success() calls toast.success with the message', () => {
    toastManager.success('Saved');
    expect(mockToast.success).toHaveBeenCalledOnce();
    expect(mockToast.success).toHaveBeenCalledWith('Saved', expect.any(Object));
  });

  it('error() calls toast.error with the message', () => {
    toastManager.error('Something broke');
    expect(mockToast.error).toHaveBeenCalledOnce();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Something broke',
      expect.any(Object),
    );
  });

  it('info() calls toast.info with the message', () => {
    toastManager.info('FYI');
    expect(mockToast.info).toHaveBeenCalledOnce();
  });

  it('warning() calls toast.warning with the message', () => {
    toastManager.warning('Watch out');
    expect(mockToast.warning).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('ToastManager deduplication', () => {
  it('shows the first toast immediately', () => {
    toastManager.error('Oops');
    expect(mockToast.error).toHaveBeenCalledOnce();
  });

  it('suppresses an identical toast within the dedup window', () => {
    toastManager.error('Oops');
    toastManager.error('Oops'); // duplicate within 3 s
    expect(mockToast.error).toHaveBeenCalledOnce();
  });

  it('allows the same message after the dedup window expires', () => {
    toastManager.error('Oops');
    vi.advanceTimersByTime(3001);
    toastManager.error('Oops');
    expect(mockToast.error).toHaveBeenCalledTimes(2);
  });

  it('treats different messages as distinct (no suppression)', () => {
    toastManager.error('Error A');
    toastManager.error('Error B');
    expect(mockToast.error).toHaveBeenCalledTimes(2);
  });

  it('treats same message with different types as distinct', () => {
    toastManager.error('msg');
    toastManager.info('msg');
    expect(mockToast.error).toHaveBeenCalledOnce();
    expect(mockToast.info).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Options passthrough
// ---------------------------------------------------------------------------

describe('ToastManager options passthrough', () => {
  it('defaults autoClose to 5000ms', () => {
    toastManager.success('ok');
    const [, options] = mockToast.success.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(options.autoClose).toBe(5000);
  });

  it('respects a caller-supplied autoClose', () => {
    toastManager.error('err', { autoClose: 1000 });
    const [, options] = mockToast.error.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(options.autoClose).toBe(1000);
  });

  it('respects autoClose: false (persistent toast)', () => {
    toastManager.error('persistent', { autoClose: false });
    const [, options] = mockToast.error.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(options.autoClose).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe('ToastManager.clear()', () => {
  it('calls toast.dismiss', () => {
    toastManager.clear();
    expect(mockToast.dismiss).toHaveBeenCalledOnce();
  });
});
