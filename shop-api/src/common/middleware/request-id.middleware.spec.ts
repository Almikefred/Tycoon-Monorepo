import { RequestIdMiddleware, isValidRequestId } from './request-id.middleware';

interface MockRequest {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
}

interface MockResponse {
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
}

function createRequest(headers: Record<string, string | string[] | undefined> = {}): MockRequest {
  return { headers };
}

function createResponse(): MockResponse {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader(name: string, value: string): void {
      headers[name.toLowerCase()] = value;
    },
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('reuses a valid inbound x-request-id verbatim and echoes it', () => {
    const req = createRequest({ 'x-request-id': 'abc-123_XYZ.~' });
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req as never, res as never, next);

    expect(req.requestId).toBe('abc-123_XYZ.~');
    expect(res.headers['x-request-id']).toBe('abc-123_XYZ.~');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new id when the inbound header is missing and echoes it', () => {
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    middleware.use(req as never, res as never, next);

    expect(req.requestId).toMatch(UUID_PATTERN);
    expect(res.headers['x-request-id']).toBe(req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects an over-long inbound header and replaces it with a generated id', () => {
    const req = createRequest({ 'x-request-id': 'a'.repeat(129) });
    const res = createResponse();

    middleware.use(req as never, res as never, jest.fn());

    expect(req.requestId).toMatch(UUID_PATTERN);
    expect(req.requestId).not.toBe('a'.repeat(129));
    expect(res.headers['x-request-id']).toBe(req.requestId);
  });

  it('rejects a newline-containing inbound header and replaces it with a generated id', () => {
    const req = createRequest({ 'x-request-id': 'abc\r\nInjected: 1' });
    const res = createResponse();

    middleware.use(req as never, res as never, jest.fn());

    expect(req.requestId).toMatch(UUID_PATTERN);
    expect(req.requestId).not.toContain('\n');
    expect(res.headers['x-request-id']).toBe(req.requestId);
  });

  it('rejects an empty inbound header and replaces it with a generated id', () => {
    const req = createRequest({ 'x-request-id': '' });
    const res = createResponse();

    middleware.use(req as never, res as never, jest.fn());

    expect(req.requestId).toMatch(UUID_PATTERN);
    expect(res.headers['x-request-id']).toBe(req.requestId);
  });

  describe('isValidRequestId', () => {
    it('accepts well-formed ids', () => {
      expect(isValidRequestId('abc-123_XYZ.~')).toBe(true);
    });

    it('rejects non-strings, empty, over-long, and unsafe values', () => {
      expect(isValidRequestId(undefined)).toBe(false);
      expect(isValidRequestId(123)).toBe(false);
      expect(isValidRequestId('')).toBe(false);
      expect(isValidRequestId('a'.repeat(129))).toBe(false);
      expect(isValidRequestId('bad\nvalue')).toBe(false);
      expect(isValidRequestId('bad value')).toBe(false);
    });
  });
});
