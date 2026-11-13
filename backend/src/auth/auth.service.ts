import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import type {
  AuthenticatedUser,
  LoginResponse,
  PermissionCode,
} from './auth.types.js';

interface AccountRow {
  id: string;
  username: string;
  displayName: string;
  passwordHash?: string;
  status: 'active' | 'locked';
  employeeId: string | null;
  employeeActive: boolean | null;
  lockedUntil: Date | null;
  roles: string[];
  permissions: PermissionCode[];
}

const ACCOUNT_JOINS = `
  FROM public.users u
  LEFT JOIN public.employees e ON e.id = u.employee_id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
`;

const ACCOUNT_AGGREGATES = `
  u.id,
  u.username,
  u.display_name AS "displayName",
  u.status::text AS status,
  u.employee_id AS "employeeId",
  e.is_active AS "employeeActive",
  u.locked_until AS "lockedUntil",
  COALESCE(
    array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL),
    ARRAY[]::varchar[]
  ) AS roles,
  COALESCE(
    array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL),
    ARRAY[]::varchar[]
  ) AS permissions
`;

const INVALID_LOGIN_MESSAGE = 'Invalid username or password.';

@Injectable()
export class AuthService {
  private readonly jwtExpiresInSeconds: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.jwtExpiresInSeconds = this.config.get<number>(
      'JWT_EXPIRES_IN_SECONDS',
      900,
    );
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    this.ensureDatabaseEnabled();

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    const rows: AccountRow[] = await this.dataSource.query(
      `
        SELECT ${ACCOUNT_AGGREGATES}, u.password_hash AS "passwordHash"
        ${ACCOUNT_JOINS}
        WHERE lower(u.username) = lower($1)
        GROUP BY u.id, e.is_active
      `,
      [username.trim()],
    );
    const account = rows[0];

    if (!account?.passwordHash) {
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(password, account.passwordHash);
    if (!passwordMatches || !this.isAccountActive(account)) {
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    await this.dataSource.query(
      'UPDATE public.users SET last_login_at = now() WHERE id = $1',
      [account.id],
    );

    const user = this.toAuthenticatedUser(account);
    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresInSeconds,
      user,
    };
  }

  async findAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    this.ensureDatabaseEnabled();

    const rows: AccountRow[] = await this.dataSource.query(
      `
        SELECT ${ACCOUNT_AGGREGATES}
        ${ACCOUNT_JOINS}
        WHERE u.id = $1
        GROUP BY u.id, e.is_active
      `,
      [userId],
    );
    const account = rows[0];

    if (!account || !this.isAccountActive(account)) {
      throw new UnauthorizedException('Account is unavailable.');
    }

    return this.toAuthenticatedUser(account);
  }

  private ensureDatabaseEnabled(): void {
    if (!this.config.get<boolean>('DATABASE_ENABLED', false)) {
      throw new ServiceUnavailableException(
        'Authentication is unavailable while the database is disabled.',
      );
    }
  }

  private isAccountActive(account: AccountRow): boolean {
    if (account.status !== 'active') {
      return false;
    }

    if (
      account.lockedUntil &&
      new Date(account.lockedUntil).getTime() > Date.now()
    ) {
      return false;
    }

    return account.employeeId === null || account.employeeActive === true;
  }

  private toAuthenticatedUser(account: AccountRow): AuthenticatedUser {
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      employeeId: account.employeeId,
      status: 'active',
      roles: account.roles ?? [],
      permissions: account.permissions ?? [],
    };
  }
}
