import type { AuthUser, Permission, Role } from './authTypes';

export const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Quản lý',
  sales: 'Nhân viên bán hàng',
  warehouse: 'Nhân viên kho',
  accountant: 'Kế toán',
};

const rolePermissions: Record<Role, readonly Permission[]> = {
  admin: [
    'dashboard:view', 'vehicles:manage', 'categories:manage', 'customers:manage',
    'suppliers:manage', 'purchases:manage', 'sales:manage', 'invoices:manage',
    'reports:view', 'settings:manage', 'accounts:manage',
  ],
  manager: [
    'dashboard:view', 'vehicles:manage', 'categories:manage', 'customers:manage',
    'suppliers:manage', 'purchases:manage', 'sales:manage', 'invoices:manage', 'reports:view',
  ],
  sales: ['dashboard:view', 'customers:manage', 'sales:manage', 'invoices:manage'],
  warehouse: ['dashboard:view', 'vehicles:manage', 'categories:manage', 'purchases:manage'],
  accountant: ['dashboard:view', 'invoices:manage', 'reports:view'],
};

export function hasPermission(user: AuthUser, permission: Permission) {
  return user.status === 'active' && rolePermissions[user.role].includes(permission);
}