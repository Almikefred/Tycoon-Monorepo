import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * JwtAuthGuard - Use this guard to protect routes that require JWT authentication.
 * Apply with @UseGuards(JwtAuthGuard) decorator.
 *
 * ADR-004: access tokens are delivered as httpOnly Secure SameSite cookies and
 * are never readable from JavaScript. This guard therefore extracts the token
 * from the cookie first and only falls back to the Authorization header for
 * non-browser clients (e.g. server-to-server calls).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  static readonly ACCESS_COOKIE = 'access_token';

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          code: 'AUTH_UNAUTHORIZED',
          message: 'Authentication required.',
        })
      );
    }
    return user;
  }

  getRequest(context: ExecutionContext): Request {
    const request = context.switchToHttp().getRequest<Request>();
    // Prefer the httpOnly cookie (ADR-004); fall back to bearer header.
    const cookieToken = this.extractCookieToken(request);
    if (cookieToken && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${cookieToken}`;
    }
    return request;
  }

  private extractCookieToken(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[JwtAuthGuard.ACCESS_COOKIE];
  }
}

/**
 * AgentCallbackGuard - Protects agent-vs-agent HMAC callback entrypoints.
 *
 * Deny-by-default: requires a valid HMAC signature header. The signature is
 * compared in constant time to prevent timing oracles. Missing or malformed
 * signatures are rejected with an explicit error code per
 * docs/API_ERROR_RESPONSE_STANDARDS.md so untrusted clients cannot bypass
 * server authority on money-adjacent callback paths.
 */
@Injectable()
export class AgentCallbackGuard implements CanActivate {
  static readonly SIGNATURE_HEADER = 'x-agent-signature';
  static readonly ERROR_CODE = 'AGENT_CALLBACK_UNAUTHORIZED';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = this.extractSignature(request);
    const expected = process.env.AGENT_CALLBACK_HMAC_SECRET;

    if (!expected || !provided || !this.safeEqual(provided, expected)) {
      throw new UnauthorizedException({
        code: AgentCallbackGuard.ERROR_CODE,
        message: 'Invalid or missing agent callback signature.',
      });
    }

    return true;
  }

  private extractSignature(request: Request): string | undefined {
    const header = request.headers[AgentCallbackGuard.SIGNATURE_HEADER];
    if (Array.isArray(header)) {
      return header[0];
    }
    return header;
  }

  private safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  }
}
