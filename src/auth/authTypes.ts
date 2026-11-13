export const roles = ['admin', 'manager', 'sales', 'warehouse', 'accountant'] as const;

export type Role = (typeof roles)[number];
export type AccountStatus = 'active' | 'locked';
export type Permission =
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

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: AccountStatus;
}

export interface NewAccountInput {
  username: string;
  name: string;
  role: Role;
}