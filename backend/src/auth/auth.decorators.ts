import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser, PermissionCode } from './auth.types.js';

export const IS_PUBLIC_KEY = 'auth:is-public';
export const AUTHENTICATED_ONLY_KEY = 'auth:authenticated-only';
export const REQUIRED_PERMISSIONS_KEY = 'auth:required-permissions';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const AuthenticatedOnly = () =>
  SetMetadata(AUTHENTICATED_ONLY_KEY, true);

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
