import { JwtAuthGuard } from './auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with jwt strategy', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });

  it('should read the access token from the httpOnly cookie, not the Authorization header', () => {
    const request: any = {
      headers: { authorization: 'Bearer js-readable-token' },
      cookies: { access_token: 'cookie-token' },
    };

    const token = (guard as any).getRequestToken(request);

    expect(token).toBe('cookie-token');
  });

  it('should not fall back to a JS-readable Authorization header when the cookie is absent', () => {
    const request: any = {
      headers: { authorization: 'Bearer js-readable-token' },
      cookies: {},
    };

    const token = (guard as any).getRequestToken(request);

    expect(token).toBeUndefined();
  });

  it('should reject a request with no access token cookie', () => {
    const request: any = { headers: {}, cookies: {} };

    expect((guard as any).getRequestToken(request)).toBeUndefined();
  });
});
