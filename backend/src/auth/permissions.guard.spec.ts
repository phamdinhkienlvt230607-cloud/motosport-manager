import {
  Controller,
  ForbiddenException,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  AuthenticatedOnly,
  Public,
  RequirePermissions,
} from './auth.decorators.js';
import { PermissionsGuard } from './permissions.guard.js';
import type { AuthenticatedUser } from './auth.types.js';

@Controller()
class PermissionTarget {
  @Get()
  @RequirePermissions('vehicles:manage')
  handler(): void {}
}

@Controller()
class AuthenticatedOnlyTarget {
  @Get()
  @AuthenticatedOnly()
  handler(): void {}
}

@Controller()
class UnannotatedTarget {
  @Get()
  handler(): void {}
}

@Controller()
@Public()
class PublicTarget {
  @Get()
  handler(): void {}
}

@Controller()
class EmptyPermissionTarget {
  @Get()
  @RequirePermissions()
  handler(): void {}
}

function context(
  target: {
    prototype: {
      handler: () => void;
    };
  },
  user?: AuthenticatedUser,
) {
  return {
    getHandler: () => target.prototype.handler,
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function user(permissions: AuthenticatedUser['permissions']): AuthenticatedUser {
  return {
    id: 'user-id',
    username: 'manager',
    displayName: 'Test Manager',
    employeeId: null,
    status: 'active',
    roles: ['manager'],
    permissions,
  };
}

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('allows a user with the required permission', () => {
    expect(
      guard.canActivate(
        context(PermissionTarget, user(['vehicles:manage'])),
      ),
    ).toBe(true);
  });

  it('denies a user without the required permission', () => {
    expect(() =>
      guard.canActivate(
        context(PermissionTarget, user(['dashboard:view'])),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects private routes that omit permission metadata', () => {
    expect(() =>
      guard.canActivate(
        context(UnannotatedTarget, user(['dashboard:view'])),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows an explicitly authenticated-only route for a signed-in user', () => {
    expect(
      guard.canActivate(
        context(AuthenticatedOnlyTarget, user([])),
      ),
    ).toBe(true);
  });

  it('rejects authenticated-only routes without a signed-in user', () => {
    expect(() =>
      guard.canActivate(context(AuthenticatedOnlyTarget)),
    ).toThrow(UnauthorizedException);
  });

  it('allows public routes without permission metadata or a user', () => {
    expect(guard.canActivate(context(PublicTarget))).toBe(true);
  });

  it('rejects an empty permission declaration', () => {
    expect(() =>
      guard.canActivate(context(EmptyPermissionTarget, user([]))),
    ).toThrow(ForbiddenException);
  });
});
