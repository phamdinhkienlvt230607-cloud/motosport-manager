import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bike, Boxes, ChartNoAxesCombined, ChevronLeft, ChevronRight, FileText, Gauge, LayoutDashboard, Menu, Search, Settings, ShoppingBag, ShoppingCart, Truck, Users, X, Bell } from 'lucide-react';

const navigation = [
  { label: 'Tổng quan', path: '/', icon: LayoutDashboard },
  { label: 'Quản lý xe', path: '/cars', icon: Bike },
  { label: 'Danh mục xe', path: '/categories', icon: Boxes },
  { label: 'Khách hàng', path: '/customers', icon: Users },
  { label: 'Nhà cung cấp', path: '/suppliers', icon: Truck },
  { label: 'Nhập hàng', path: '/purchases', icon: ShoppingBag },
  { label: 'Bán hàng', path: '/sales', icon: ShoppingCart },
  { label: 'Hóa đơn', path: '/invoices', icon: FileText },
  { label: 'Báo cáo thống kê', path: '/reports', icon: ChartNoAxesCombined },
  { label: 'Cài đặt', path: '/settings', icon: Settings },
];

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = navigation.find((item) => item.path === location.pathname) ?? navigation[0];

  function search(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/cars?q=${encodeURIComponent(query)}`);
  }

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand-lockup"><span className="brand-mark"><Gauge size={20} /></span><span className="brand-name">MOTO<span>SPORT</span><small>MANAGER</small></span><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X size={18} /></button></div>
      <div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="side-nav">{navigation.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)} aria-label={label} title={collapsed ? label : undefined}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{path === '/purchases' && <i className="nav-dot" />}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="store-status"><span className="status-light" /><span>Showroom đang hoạt động</span></div><div className="sidebar-version">MotoSport Manager <span>v1.0.0</span></div></div>
      <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="topbar-title"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu size={19} /></button><div><span className="breadcrumb">MotoSport <span>/</span> {activePage.label}</span><strong>{activePage.label}</strong></div></div><div className="topbar-tools"><form className="global-search" onSubmit={search}><Search size={16} /><input placeholder="Tìm xe, mã xe..." aria-label="Tìm xe" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></form><button className="notification-button icon-button" aria-label="Thông báo"><Bell size={18} /><i /></button><span className="topbar-divider" /><div className="user-profile"><div className="avatar">NA</div><div><strong>Nguyễn An</strong><span>Quản lý cửa hàng</span></div></div></div></header>
      <main className="page-content"><Outlet /></main>
      <footer className="app-footer"><span>© 2026 MotoSport Manager</span><span><i className="status-light" /> Dữ liệu được lưu trên thiết bị này</span></footer>
    </div>
  </div>;
}