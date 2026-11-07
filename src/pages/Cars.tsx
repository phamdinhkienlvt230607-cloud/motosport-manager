import { useMemo, useState } from 'react';
import { Eye, FileDown, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FormActions, FormField, Modal, PageHeading } from '../components/ui';
import { useStore } from '../data/useStore';
import type { Vehicle } from '../types/entities';
import type { VehicleCatalogItem } from '../types/views';
import { createStableId, formatMoney, makeId, stockLabel } from '../utils';

const emptyBike: VehicleCatalogItem = { id: '', code: '', name: '', brandId: 'BRAND-HONDA', categoryId: 'CAT-SPORTBIKE', brand: 'Honda', category: 'Sportbike', displacement: 600, year: new Date().getFullYear(), color: '', cost: 0, price: 0, stock: 0, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' };

export function CarsPage() {
  const { bikes, brands, categories, vehicleBrands, vehicleCategories, saveVehicle, removeVehicle } = useStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [brandFilter, setBrandFilter] = useState('Tất cả hãng');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả dòng xe');
  const [stockFilter, setStockFilter] = useState('Mọi trạng thái');
  const [editing, setEditing] = useState<VehicleCatalogItem | null>(null);
  const [detail, setDetail] = useState<VehicleCatalogItem | null>(null);

  const visibleBikes = useMemo(() => bikes.filter((bike) => {
    const text = `${bike.name} ${bike.brand} ${bike.code}`.toLocaleLowerCase('vi');
    return text.includes(query.toLocaleLowerCase('vi')) && (brandFilter === 'Tất cả hãng' || bike.brand === brandFilter) && (categoryFilter === 'Tất cả dòng xe' || bike.category === categoryFilter) && (stockFilter === 'Mọi trạng thái' || stockLabel(bike.stock) === stockFilter);
  }), [bikes, brandFilter, categoryFilter, query, stockFilter]);

  function submitBike(form: FormData) {
    const bike: Vehicle = {
      id: editing?.id ?? createStableId('vehicle'),
      code: editing?.code ?? makeId('XE', bikes.map((item) => ({ id: item.code }))),
      name: String(form.get('name')).trim(),
      brandId: String(form.get('brandId')),
      categoryId: String(form.get('categoryId')),
      displacement: Number(form.get('displacement')), year: Number(form.get('year')),
      color: String(form.get('color')).trim(), cost: Number(form.get('cost')),
      price: Number(form.get('price')), stock: Number(form.get('stock')),
      image: String(form.get('image')).trim() || emptyBike.image,
    };
    saveVehicle(bike);
    setEditing(null);
  }

  function deleteBike(bike: VehicleCatalogItem) {
    if (!window.confirm(`Xóa mẫu xe ${bike.name} khỏi danh mục?`)) return;
    try { removeVehicle(bike.id); } catch (issue) { window.alert(issue instanceof Error ? issue.message : 'Không thể xóa mẫu xe.'); }
  }

  return <>
    <PageHeading eyebrow="KHO HÀNG · DANH MỤC SẢN PHẨM" title="Quản lý xe" description="Theo dõi danh mục, giá bán và số lượng tồn kho." action={<><button className="button button-quiet hide-small"><FileDown size={16} /> Xuất danh sách</button><button className="button button-primary" onClick={() => setEditing(emptyBike)}><Plus size={16} /> Thêm xe mới</button></>} />
    <section className="inventory-summary"><div><span className="summary-icon"><i /></span><div><span>Tổng mẫu xe</span><strong>{bikes.length} <small>mẫu</small></strong></div></div><div><span className="summary-icon summary-orange"><i /></span><div><span>Tổng xe trong kho</span><strong>{bikes.reduce((sum, bike) => sum + bike.stock, 0)} <small>xe</small></strong></div></div><div><span className="summary-icon summary-red"><i /></span><div><span>Cần nhập thêm</span><strong>{bikes.filter((bike) => bike.stock <= 2).length} <small>mẫu</small></strong></div></div><div className="inventory-progress"><span>Tình trạng kho</span><div className="progress-track"><i style={{ width: `${Math.max(4, bikes.filter((bike) => bike.stock > 2).length / Math.max(1, bikes.length) * 100)}%` }} /></div><small>{bikes.filter((bike) => bike.stock > 2).length} mẫu đủ hàng</small></div></section>
    <section className="panel inventory-table-panel"><div className="table-toolbar"><div className="toolbar-title"><h2>Danh sách xe</h2><span className="result-count">{visibleBikes.length}</span></div><div className="filter-tools"><label className="search-control"><Search size={16} /><input placeholder="Tìm tên hoặc mã xe..." value={query} onChange={(event) => { setQuery(event.target.value); setParams(event.target.value ? { q: event.target.value } : {}); }} /></label><select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}><option>Tất cả hãng</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Tất cả dòng xe</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option>Mọi trạng thái</option><option>Đang kinh doanh</option><option>Sắp hết hàng</option><option>Hết hàng</option></select></div></div>
      <div className="table-scroll"><table className="data-table bike-table"><thead><tr><th>SẢN PHẨM</th><th>MÃ XE</th><th>HÃNG / DÒNG XE</th><th>GIÁ BÁN</th><th>TỒN KHO</th><th>TRẠNG THÁI</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{visibleBikes.map((bike) => <tr key={bike.id}><td><div className="bike-cell"><img src={bike.image} alt={bike.name} /><div><strong>{bike.name}</strong><span>{bike.displacement} cc · {bike.year}</span></div></div></td><td><span className="code-label">{bike.code}</span></td><td><div className="brand-cell"><strong>{bike.brand}</strong><span>{bike.category}</span></div></td><td><strong className="price-cell">{formatMoney(bike.price)}</strong><span className="cost-cell">Giá nhập {formatMoney(bike.cost)}</span></td><td><strong className="stock-number">{bike.stock}</strong><span className="stock-unit">xe</span></td><td><span className={`status-pill ${bike.stock === 0 ? 'status-muted' : bike.stock <= 2 ? 'status-warning' : 'status-success'}`}><i />{stockLabel(bike.stock)}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => setDetail(bike)} aria-label="Xem chi tiết"><Eye size={16} /></button><button className="icon-button" onClick={() => setEditing(bike)} aria-label="Chỉnh sửa"><Pencil size={15} /></button><button className="icon-button danger-hover" onClick={() => deleteBike(bike)} aria-label="Xóa"><Trash2 size={15} /></button><button className="icon-button hide-wide" aria-label="Thao tác khác"><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table>{visibleBikes.length === 0 && <div className="table-empty">Không tìm thấy mẫu xe phù hợp với bộ lọc.</div>}</div><div className="table-footer"><span>Hiển thị <strong>{visibleBikes.length}</strong> trên <strong>{bikes.length}</strong> mẫu xe</span><span className="footer-status"><i /> Đồng bộ dữ liệu cục bộ</span></div>
    </section>
    {editing && <Modal title={editing.code ? `Chỉnh sửa ${editing.name}` : 'Thêm xe mới'} onClose={() => setEditing(null)} wide><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submitBike(new FormData(event.currentTarget)); }}><FormField label="Tên xe"><input name="name" required defaultValue={editing.name} placeholder="Ví dụ: CBR650R" /></FormField><FormField label="Mã xe"><input value={editing.code || 'Tự động tạo mã'} readOnly /></FormField><FormField label="Hãng xe"><select name="brandId" defaultValue={editing.brandId}>{vehicleBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></FormField><FormField label="Dòng xe"><select name="categoryId" defaultValue={editing.categoryId}>{vehicleCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField><FormField label="Dung tích (cc)"><input name="displacement" type="number" min="1" required defaultValue={editing.displacement} /></FormField><FormField label="Năm sản xuất"><input name="year" type="number" min="1990" max="2035" required defaultValue={editing.year} /></FormField><FormField label="Màu sắc"><input name="color" required defaultValue={editing.color} placeholder="Đen nhám" /></FormField><FormField label="Số lượng tồn"><input name="stock" type="number" min="0" required defaultValue={editing.stock} /></FormField><FormField label="Giá nhập (VNĐ)"><input name="cost" type="number" min="0" required defaultValue={editing.cost} /></FormField><FormField label="Giá bán (VNĐ)"><input name="price" type="number" min="0" required defaultValue={editing.price} /></FormField><FormField label="URL hình ảnh"><input name="image" type="url" defaultValue={editing.image} /></FormField><div className="form-actions-wide"><FormActions onCancel={() => setEditing(null)} /></div></form></Modal>}
    {detail && <Modal title="Thông tin xe" onClose={() => setDetail(null)}><div className="bike-detail"><img src={detail.image} alt={detail.name} /><span className="eyebrow">{detail.code} · {detail.brand}</span><h3>{detail.name}</h3><span>{detail.category} · {detail.displacement} cc · {detail.year}</span><div className="detail-price"><span>Giá bán</span><strong>{formatMoney(detail.price)}</strong></div><div className="detail-pairs"><span>Màu sắc <b>{detail.color}</b></span><span>Giá nhập <b>{formatMoney(detail.cost)}</b></span><span>Tồn kho <b>{detail.stock} xe</b></span><span>Trạng thái <b>{stockLabel(detail.stock)}</b></span></div><button className="button button-primary button-full" onClick={() => { setDetail(null); setEditing(detail); }}><Pencil size={15} /> Chỉnh sửa thông tin</button></div></Modal>}
  </>;
}