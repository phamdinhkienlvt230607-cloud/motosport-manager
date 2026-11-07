import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasPermission } from './permissions';
import type { Permission } from './authTypes';
import { useAuth } from './useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="auth-loading" role="status">Đang khởi tạo phiên làm việc...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !hasPermission(user, permission)) return <Navigate to="/unauthorized" replace />;
  return children;
}