import { ArrowRight, ArrowUpRight, Bike, CircleAlert, CreditCard, PackageCheck, Plus, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../data/useStore';
import { formatCompactMoney, formatDate, formatMoney } from '../utils';
import { PageHeading } from '../components/ui';

const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export function Dashboard() {
  const { bikes, customers, invoices, purchases, suppliers } = useStore();
  const now = new Date();
  const currentMonthRevenue = invoices.filter((invoice) => {
    const date = new Date(`${invoice.date}T00:00:00`);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, invoice) => sum + invoice.total, 0);
  const unitsInStock = bikes.reduce((sum, bike) => sum + bike.stock, 0);
  const attentionCount = bikes.filter((bike) => bike.stock <= 2).length;
  const chartData = monthNames.map((label, index) => ({ label, value: invoices.filter((invoice) => new Date(`${invoice.date}T00:00:00`).getMonth() === index && new Date(`${invoice.date}T00:00:00`).getFullYear() === now.getFullYear()).reduce((sum, invoice) => sum + invoice.total, 0) }));
  const maxRevenue = Math.max(...chartData.map((item) => item.value), 1);
  const bestSellers = bikes.map((bike) => ({ ...bike, sold: invoices.reduce((sum, invoice) => sum + invoice.details.filter((detail) => detail.vehicleId === bike.id).reduce((lineSum, detail) => lineSum + detail.quantity, 0), 0) })).sort((a, b) => b.sold - a.sold).slice(0, 4);
  const latestInvoices = invoices.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const latestPurchases = purchases.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const stats = [
    { label: 'Xe trong kho', value: unitsInStock.toLocaleString('vi-VN'), note: `${bikes.length} mẫu xe đang quản lý`, icon: Bike, tone: 'orange', trend: '+8,2%', up: true },
    { label: 'Xe đã bán', value: invoices.reduce((sum, invoice) => sum + invoice.quantity, 0).toLocaleString('vi-VN'), note: 'Tổng lượng xe đã giao', icon: CreditCard, tone: 'green', trend: '+12,5%', up: true },
    { label: 'Doanh thu tháng', value: formatCompactMoney(currentMonthRevenue), note: 'Doanh thu ghi nhận trong tháng', icon: TrendingUp, tone: 'blue', trend: '+6,4%', up: true },
    { label: 'Khách hàng', value: customers.length.toLocaleString('vi-VN'), note: 'Hồ sơ khách hàng', icon: Users, tone: 'gold', trend: '+4 mới', up: true },
  ];

  return <>
    <PageHeading eyebrow="THỨ SÁU, 06 THÁNG 11, 2026" title="Tổng quan" description="Theo dõi hoạt động kinh doanh của showroom hôm nay." action={<Link className="button button-primary" to="/sales"><Plus size={16} /> Tạo giao dịch</Link>} />
    <section className="stat-grid">{stats.map(({ label, value, note, icon: Icon, tone, trend }) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><strong className="stat-value">{value}</strong><div className="stat-bottom"><span>{note}</span><span className="trend"><ArrowUpRight size={14} />{trend}</span></div></article>)}</section>
    <section className="dashboard-grid main-dash-grid">
      <article className="panel revenue-panel"><div className="panel-heading"><div><span className="eyebrow">HIỆU SUẤT KINH DOANH</span><h2>Doanh thu theo tháng</h2></div><select className="select-small" defaultValue="2026" aria-label="Năm thống kê"><option>2026</option><option>2025</option></select></div><div className="chart-summary"><strong>{formatMoney(currentMonthRevenue)}</strong><span className="positive-chip"><ArrowUpRight size={13} /> 8,6%</span><small>so với tháng trước</small></div><div className="bar-chart" aria-label="Biểu đồ doanh thu theo tháng">{chartData.map((item, index) => <div className="bar-column" key={item.label}><div className="bar-rail"><div className={`bar-fill ${index === now.getMonth() ? 'current' : ''}`} style={{ height: `${Math.max(4, item.value / maxRevenue * 100)}%` }} title={`${item.label}: ${formatMoney(item.value)}`} /></div><span className={index === now.getMonth() ? 'month-current' : ''}>{item.label}</span></div>)}</div><div className="chart-legend"><span><i /> Doanh thu thực tế</span><span><i className="legend-current" /> Tháng hiện tại</span></div></article>
      <article className="panel inventory-panel"><div className="panel-heading"><div><span className="eyebrow">TỒN KHO</span><h2>Cần chú ý</h2></div><span className="attention-count"><CircleAlert size={14} /> {attentionCount} mẫu</span></div><p className="panel-subtext">Các mẫu xe sắp hết hoặc đã hết hàng.</p><div className="attention-list">{bikes.filter((bike) => bike.stock <= 2).slice(0, 4).map((bike) => <div className="attention-row" key={bike.id}><img src={bike.image} alt="" /><div className="attention-name"><strong>{bike.name}</strong><span>{bike.brand} · {bike.id}</span></div><span className={`stock-badge ${bike.stock === 0 ? 'stock-empty' : 'stock-low'}`}>{bike.stock === 0 ? 'Hết hàng' : `${bike.stock} xe`}</span></div>)}</div><Link className="panel-link" to="/cars">Xem quản lý kho <ArrowRight size={15} /></Link></article>
    </section>
    <section className="dashboard-grid lower-dash-grid">
      <article className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">GIAO DỊCH GẦN ĐÂY</span><h2>Đơn bán mới nhất</h2></div><Link className="text-link" to="/invoices">Tất cả hóa đơn <ArrowRight size={14} /></Link></div><div className="compact-table-wrap"><table className="data-table compact-table"><thead><tr><th>Mã hóa đơn</th><th>Khách hàng</th><th>Ngày lập</th><th className="align-right">Giá trị</th></tr></thead><tbody>{latestInvoices.map((invoice) => <tr key={invoice.id}><td><strong className="table-primary">{invoice.invoiceNumber}</strong></td><td>{customers.find((customer) => customer.id === invoice.customerId)?.name ?? 'Đã xóa khách'}</td><td>{formatDate(invoice.date)}</td><td className="align-right"><strong>{formatMoney(invoice.total)}</strong></td></tr>)}</tbody></table></div></article>
      <article className="panel purchase-panel"><div className="panel-heading"><div><span className="eyebrow">NHẬP HÀNG</span><h2>Phiếu nhập gần đây</h2></div><Link className="icon-link" to="/purchases" aria-label="Xem phiếu nhập"><ArrowRight size={16} /></Link></div><div className="purchase-list">{latestPurchases.map((purchase) => { const supplier = suppliers.find((item) => item.id === purchase.supplierId); const itemSummary = purchase.details.map((detail) => `${detail.vehicleName} × ${detail.quantity}`).join(', '); return <div className="purchase-row" key={purchase.id}><span className="purchase-icon"><PackageCheck size={17} /></span><div><strong>{itemSummary || 'Phiếu nhập rỗng'}</strong><span>{supplier?.name ?? 'Nhà cung cấp'} · {formatDate(purchase.date)}</span></div><span className="purchase-amount">{formatCompactMoney(purchase.total)}</span></div>; })}</div><Link className="panel-link" to="/purchases">Tạo phiếu nhập <ArrowRight size={15} /></Link></article>
    </section>
    <section className="panel best-sellers"><div className="panel-heading"><div><span className="eyebrow">SẢN PHẨM</span><h2>Mẫu xe bán chạy</h2></div><Link className="text-link" to="/cars">Danh mục xe <ArrowRight size={14} /></Link></div><div className="seller-grid">{bestSellers.map((bike, index) => <div className="seller-item" key={bike.id}><span className={`seller-rank rank-${index + 1}`}>0{index + 1}</span><img src={bike.image} alt={bike.name} /><div className="seller-info"><strong>{bike.name}</strong><span>{bike.brand} · {bike.category}</span></div><div className="seller-total"><strong>{bike.sold} xe</strong><span>đã bán</span></div><div className="seller-stock"><span>{bike.stock}</span> tồn kho</div></div>)}</div></section>
  </>;
}