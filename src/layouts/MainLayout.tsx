import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bike, Boxes, ChartNoAxesCombined, ChevronLeft, ChevronRight, FileText, Gauge, LayoutDashboard, LogOut, Menu, Search, Settings, ShoppingBag, ShoppingCart, Truck, Users, X, Bell, UserCog, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { hasPermission, roleLabels } from '../auth/permissions';
import type { Permission } from '../auth/authTypes';

const navigation: { label: string; path: string; icon: LucideIcon; permission: Permission }[] = [
  { label: 'Tổng quan', path: '/', icon: LayoutDashboard, permission: 'dashboard:view' },
  { label: 'Quản lý xe', path: '/cars', icon: Bike, permission: 'vehicles:manage' },
  { label: 'Danh mục xe', path: '/categories', icon: Boxes, permission: 'categories:manage' },
  { label: 'Khách hàng', path: '/customers', icon: Users, permission: 'customers:manage' },
  { label: 'Nhà cung cấp', path: '/suppliers', icon: Truck, permission: 'suppliers:manage' },
  { label: 'Nhập hàng', path: '/purchases', icon: ShoppingBag, permission: 'purchases:manage' },
  { label: 'Bán hàng', path: '/sales', icon: ShoppingCart, permission: 'sales:manage' },
  { label: 'Hóa đơn', path: '/invoices', icon: FileText, permission: 'invoices:manage' },
  { label: 'Báo cáo thống kê', path: '/reports', icon: ChartNoAxesCombined, permission: 'reports:view' },
  { label: 'Cài đặt', path: '/settings', icon: Settings, permission: 'settings:manage' },
  { label: 'Tài khoản', path: '/accounts', icon: UserCog, permission: 'accounts:manage' },
];

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const visibleNavigation = user ? navigation.filter((item) => hasPermission(user, item.permission)) : [];
  const activePage = visibleNavigation.find((item) => item.path === location.pathname) ?? visibleNavigation[0];

  function search(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/cars?q=${encodeURIComponent(query)}`);
  }

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand-lockup"><span className="brand-mark"><Gauge size={20} /></span><span className="brand-name">MOTO<span>SPORT</span><small>MANAGER</small></span><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X size={18} /></button></div>
      <div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="side-nav">{visibleNavigation.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)} aria-label={label} title={collapsed ? label : undefined}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{path === '/purchases' && <i className="nav-dot" />}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="store-status"><span className="status-light" /><span>Showroom đang hoạt động</span></div><div className="sidebar-version">MotoSport Manager <span>v1.0.0</span></div></div>
      <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="topbar-title"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu size={19} /></button><div><span className="breadcrumb">MotoSport <span>/</span> {activePage?.label}</span><strong>{activePage?.label}</strong></div></div><div className="topbar-tools"><form className="global-search" onSubmit={search}><Search size={16} /><input placeholder="Tìm xe, mã xe..." aria-label="Tìm xe" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></form><button className="notification-button icon-button" aria-label="Thông báo"><Bell size={18} /><i /></button><span className="topbar-divider" /><div className="user-profile"><div className="avatar">{user?.name.slice(0, 1) ?? 'NV'}</div><div><strong>{user?.name}</strong><span>{user ? roleLabels[user.role] : ''}</span></div><button className="icon-button logout-button" onClick={() => { logout(); navigate('/login', { replace: true }); }} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={16} /></button></div></div></header>
      <main className="page-content"><Outlet /></main>
      <footer className="app-footer"><span>© 2026 MotoSport Manager</span><span><i className="status-light" /> Dữ liệu được lưu trên thiết bị này</span></footer>
    </div>
  </div>;
}