export type AccountStatus = 'active' | 'locked';

export type PermissionCode =
  | 'dashboard:view'
  | 'vehicles:manage'
  | 'categories:manage'
  | 'customers:manage'
  | 'suppliers:manage'
  | 'purchases:manage'
  | 'sales:manage'
  | 'invoices:manage'
  | 'reports:view'
  | 'settings:manage'
  | 'accounts:manage';

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  employeeId: string | null;
  status: 'active';
  roles: string[];
  permissions: PermissionCode[];
}

export interface JwtAccessPayload {
  sub: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
}
