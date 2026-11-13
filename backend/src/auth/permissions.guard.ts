import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTHENTICATED_ONLY_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './auth.decorators.js';
import type { AuthenticatedRequest, PermissionCode } from './auth.types.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadataTargets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      metadataTargets,
    );
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionCode[] | undefined
    >(REQUIRED_PERMISSIONS_KEY, metadataTargets);
    const authenticatedOnly = this.reflector.getAllAndOverride<boolean>(
      AUTHENTICATED_ONLY_KEY,
      metadataTargets,
    );

    if (
      requiredPermissions === undefined &&
      authenticatedOnly !== true
    ) {
      throw new ForbiddenException(
        'Protected routes must declare permissions or @AuthenticatedOnly().',
      );
    }
    if (requiredPermissions && requiredPermissions.length === 0) {
      throw new ForbiddenException(
        'Protected routes must declare at least one permission.',
      );
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    if (requiredPermissions === undefined) {
      return true;
    }

    const hasEveryPermission = requiredPermissions.every((permission) =>
      request.user?.permissions.includes(permission),
    );
    if (!hasEveryPermission) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
