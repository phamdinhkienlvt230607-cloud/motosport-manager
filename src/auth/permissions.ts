import type { AuthUser, Permission } from './authTypes';

export const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Quản lý',
  sales: 'Nhân viên bán hàng',
  warehouse: 'Nhân viên kho',
  accountant: 'Kế toán',
};

export function hasPermission(user: AuthUser, permission: Permission) {
  return user.status === 'active' && user.permissions.includes(permission);
}