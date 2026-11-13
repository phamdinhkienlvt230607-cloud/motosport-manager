import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { PermissionsGuard } from './permissions.guard.js';
import type { AuthenticatedUser, LoginResponse } from './auth.types.js';

const testSecret = 'test-only-jwt-secret-with-at-least-thirty-two-characters';
const testUser: AuthenticatedUser = {
  id: 'e2e-user-id',
  username: 'manager',
  displayName: 'Test Manager',
  employeeId: null,
  status: 'active',
  roles: ['manager'],
  permissions: ['dashboard:view'],
};

const authService = {
  login: vi.fn(),
  findAuthenticatedUser: vi.fn(),
};

@Module({
  imports: [JwtModule.register({ secret: testSecret })],
  controllers: [AuthController],
  providers: [
    Reflector,
    AuthGuard,
    PermissionsGuard,
    { provide: AuthService, useValue: authService },
  ],
})
class AuthE2eModule {}

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthE2eModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalGuards(
      moduleRef.get(AuthGuard),
      moduleRef.get(PermissionsGuard),
    );
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in through the public endpoint without returning hash fields', async () => {
    const loginResponse: LoginResponse = {
      accessToken: 'test-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: testUser,
    };
    authService.login.mockResolvedValue(loginResponse);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'manager', password: 'test-password' })
      .expect(200);

    expect(response.body).toEqual(loginResponse);
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('rejects unknown login properties', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'manager',
        password: 'test-password',
        isAdmin: true,
      })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('returns the current sanitized identity for a valid bearer token', async () => {
    const token = await jwtService.signAsync({ sub: testUser.id });
    authService.findAuthenticatedUser.mockResolvedValue(testUser);

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(testUser);
    expect(authService.findAuthenticatedUser).toHaveBeenCalledWith(testUser.id);
  });

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('logs out with HTTP 204 without a response body', async () => {
    const token = await jwtService.signAsync({ sub: testUser.id });
    authService.findAuthenticatedUser.mockResolvedValue(testUser);

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(response.text).toBe('');
  });
});
