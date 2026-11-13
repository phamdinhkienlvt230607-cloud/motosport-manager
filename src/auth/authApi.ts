import { API_BASE_URL } from '../config/api';
import type { AuthUser, Permission } from './authTypes';

type AuthApiErrorKind = 'network' | 'http' | 'invalid-response';

export class AuthApiError extends Error {
  readonly kind: AuthApiErrorKind;
  readonly status?: number;

  constructor(
    kind: AuthApiErrorKind,
    status?: number,
  ) {
    super('Authentication request failed.');
    this.name = 'AuthApiError';
    this.kind = kind;
    this.status = status;
  }
}

export interface AuthLoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

const permissionCodes: ReadonlySet<string> = new Set([
  'dashboard:view',
  'vehicles:manage',
  'categories:manage',
  'customers:manage',
  'suppliers:manage',
  'purchases:manage',
  'sales:manage',
  'invoices:manage',
  'reports:view',
  'settings:manage',
  'accounts:manage',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.username === 'string' &&
    typeof value.displayName === 'string' &&
    (typeof value.employeeId === 'string' || value.employeeId === null) &&
    value.status === 'active' &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === 'string') &&
    Array.isArray(value.permissions) &&
    value.permissions.every(
      (permission): permission is Permission =>
        typeof permission === 'string' &&
        permissionCodes.has(permission),
    )
  );
}

async function request(
  path: string,
  init: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new AuthApiError('network');
  }

  if (!response.ok) {
    throw new AuthApiError('http', response.status);
  }
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AuthApiError('invalid-response');
  }
}

export async function loginWithApi(
  username: string,
  password: string,
): Promise<AuthLoginResponse> {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body: unknown = await readJson(response);

  if (
    !isRecord(body) ||
    typeof body.accessToken !== 'string' ||
    body.accessToken.length === 0 ||
    body.tokenType !== 'Bearer' ||
    typeof body.expiresIn !== 'number' ||
    !Number.isSafeInteger(body.expiresIn) ||
    body.expiresIn <= 0 ||
    !isAuthUser(body.user)
  ) {
    throw new AuthApiError('invalid-response');
  }

  return {
    accessToken: body.accessToken,
    tokenType: 'Bearer',
    expiresIn: body.expiresIn,
    user: body.user,
  };
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await request('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body: unknown = await readJson(response);
  if (!isAuthUser(body)) {
    throw new AuthApiError('invalid-response');
  }
  return body;
}

export async function logoutFromApi(accessToken: string): Promise<void> {
  const response = await request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status !== 204) {
    throw new AuthApiError('invalid-response', response.status);
  }
}
