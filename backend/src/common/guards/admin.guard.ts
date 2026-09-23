import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../modules/auth/enums/role.enum';

/**
 * Deny-by-default admin authorization guard.
 *
 * Used to protect admin/agent-vs-agent callback surfaces so untrusted clients
 * cannot bypass server authority. Rejects unauthenticated requests with 401 and
 * authenticated-but-unauthorized requests with 403, using explicit error codes
 * per docs/API_ERROR_RESPONSE_STANDARDS.md.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    }

    const isAdmin = user.role === Role.ADMIN || user.is_admin === true;

    if (!isAdmin) {
      throw new ForbiddenException({
        code: 'ADMIN_ACCESS_REQUIRED',
        message: 'Admin access required',
      });
    }

    return true;
  }
}
