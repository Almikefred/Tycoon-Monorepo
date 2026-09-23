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
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

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
