import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

const password = 'correct-test-password';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(password, 4);
});

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id',
    username: 'manager',
    displayName: 'Test Manager',
    passwordHash,
    status: 'active',
    employeeId: null,
    employeeActive: null,
    lockedUntil: null,
    roles: ['manager'],
    permissions: ['dashboard:view'],
    ...overrides,
  };
}

function setup(databaseEnabled = true) {
  const dataSource = { query: vi.fn() } as unknown as DataSource;
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('signed-test-token'),
  } as unknown as JwtService;
  const config = {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === 'DATABASE_ENABLED') return databaseEnabled;
      if (key === 'JWT_EXPIRES_IN_SECONDS') return 900;
      return defaultValue;
    }),
  } as unknown as ConfigService;

  return {
    service: new AuthService(dataSource, jwtService, config),
    dataSource,
    jwtService,
  };
}

describe('AuthService', () => {
  it('authenticates an active account and returns no password hash', async () => {
    const { service, dataSource, jwtService } = setup();
    vi.mocked(dataSource.query)
      .mockResolvedValueOnce([account()])
      .mockResolvedValueOnce([]);

    const response = await service.login(' manager ', password);

    expect(response.accessToken).toBe('signed-test-token');
    expect(response.user).toMatchObject({
      id: 'user-id',
      username: 'manager',
      roles: ['manager'],
      permissions: ['dashboard:view'],
    });
    expect(response.user).not.toHaveProperty('passwordHash');
    expect(response.user).not.toHaveProperty('password_hash');
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-id' });
    expect(dataSource.query).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown usernames and incorrect passwords', async () => {
    const unknown = setup();
    vi.mocked(unknown.dataSource.query).mockResolvedValueOnce([]);
    await expect(unknown.service.login('missing', password)).rejects.toThrow(
      UnauthorizedException,
    );

    const incorrect = setup();
    vi.mocked(incorrect.dataSource.query).mockResolvedValueOnce([
      account(),
    ]);
    await expect(
      incorrect.service.login('manager', 'wrong-test-password'),
    ).rejects.toThrow(UnauthorizedException);
    expect(incorrect.dataSource.query).toHaveBeenCalledTimes(1);
  });

  it('rejects passwords that exceed bcrypt’s 72-byte input limit', async () => {
    const { service, dataSource } = setup();

    await expect(service.login('manager', 'é'.repeat(37))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it.each([
    ['locked status', { status: 'locked' }],
    ['future lock timeout', { lockedUntil: new Date(Date.now() + 60_000) }],
    [
      'inactive linked employee',
      { employeeId: 'employee-id', employeeActive: false },
    ],
  ])('rejects an account with %s', async (_condition, overrides) => {
    const { service, dataSource, jwtService } = setup();
    vi.mocked(dataSource.query).mockResolvedValueOnce([account(overrides)]);

    await expect(service.login('manager', password)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rechecks account state and returns a sanitized identity for each request', async () => {
    const { service, dataSource } = setup();
    vi.mocked(dataSource.query).mockResolvedValueOnce([
      account({ passwordHash: undefined }),
    ]);

    const user = await service.findAuthenticatedUser('user-id');

    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('password_hash');
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE u.id = $1'),
      ['user-id'],
    );
  });

  it('does not query the database when database authentication is disabled', async () => {
    const { service, dataSource } = setup(false);

    await expect(service.login('manager', password)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
