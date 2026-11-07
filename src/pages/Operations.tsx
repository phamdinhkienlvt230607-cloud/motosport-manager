import { useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Eye, Pencil, Plus, Printer, RotateCcw, Search, Trash2 } from 'lucide-react';
import { FormActions, FormField, Modal, PageHeading } from '../components/ui';
import { useStore } from '../data/useStore';
import type { Customer, Supplier } from '../types/entities';
import type { SalesInvoiceView } from '../types/views';
import { createStableId, formatCompactMoney, formatDate, formatMoney, makeId } from '../utils';

type PersonKind = 'customer' | 'supplier';
type Person = Customer | Supplier;
type TransactionKind = 'sale' | 'purchase';
const reportToday = new Date();

function PeoplePage({ kind }: { kind: PersonKind }) {
  const store = useStore();
  const isCustomer = kind === 'customer';
  const records: Person[] = isCustomer ? store.customers : store.suppliers;
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [detail, setDetail] = useState<Person | null>(null);
  const filtered = records.filter((person) => `${person.id} ${person.name} ${person.phone} ${person.email}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const idPrefix = isCustomer ? 'KH' : 'NCC';

  function savePerson(form: FormData) {
    const code = editing?.code ?? makeId(idPrefix, records.map((record) => ({ id: record.code })));
    const base = { id: editing?.id ?? createStableId(isCustomer ? 'customer' : 'supplier'), code, name: String(form.get('name')).trim(), phone: String(form.get('phone')).trim(), email: String(form.get('email')).trim(), address: String(form.get('address')).trim() };
    if (isCustomer) store.saveCustomer({ ...base, registeredAt: (editing as Customer | null)?.registeredAt ?? new Date().toISOString().slice(0, 10) });
    else store.saveSupplier({ ...base, contact: String(form.get('contact')).trim() });
    setEditing(null);
    setPersonModalOpen(false);
  }

  function removePerson(person: Person) {
    if (!window.confirm(`Xóa ${isCustomer ? 'khách hàng' : 'nhà cung cấp'} ${person.name}?`)) return;
    try {
      if (isCustomer) store.removeCustomer(person.id); else store.removeSupplier(person.id);
    } catch (issue) {
      window.alert(issue instanceof Error ? issue.message : 'Không thể xóa hồ sơ này.');
    }
  }

  const relatedHistory = detail && isCustomer
    ? store.invoices.filter((invoice) => invoice.customerId === detail.id)
    : detail ? store.purchases.filter((purchase) => purchase.supplierId === detail.id) : [];

  return <>
    <PageHeading eyebrow={isCustomer ? 'HỒ SƠ KHÁCH HÀNG' : 'ĐỐI TÁC CUNG ỨNG'} title={isCustomer ? 'Khách hàng' : 'Nhà cung cấp'} description={isCustomer ? 'Lưu thông tin liên hệ và lịch sử mua xe.' : 'Quản lý đối tác và theo dõi các lần nhập hàng.'} action={<button className="button button-primary" onClick={() => { setEditing(null); setPersonModalOpen(true); }}><Plus size={16} /> {isCustomer ? 'Thêm khách hàng' : 'Thêm nhà cung cấp'}</button>} />
    <section className="panel directory-panel"><div className="table-toolbar"><div className="toolbar-title"><h2>{isCustomer ? 'Danh sách khách hàng' : 'Đối tác đang hợp tác'}</h2><span className="result-count">{records.length}</span></div><label className="search-control"><Search size={16} /><input placeholder="Tìm tên, mã, số điện thoại..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>MÃ SỐ</th><th>{isCustomer ? 'KHÁCH HÀNG' : 'ĐƠN VỊ'}</th><th>LIÊN HỆ</th><th>EMAIL</th><th>ĐỊA CHỈ</th><th>{isCustomer ? 'NGÀY ĐĂNG KÝ' : 'GIAO DỊCH'}</th><th /></tr></thead><tbody>{filtered.map((person) => { const activityCount = isCustomer ? store.invoices.filter((invoice) => invoice.customerId === person.id).length : store.purchases.filter((purchase) => purchase.supplierId === person.id).length; return <tr key={person.id}><td><span className="code-label">{person.code}</span></td><td><div className="person-name"><span className="person-avatar">{person.name.split(' ').slice(-1)[0].slice(0, 1)}</span><strong>{person.name}</strong></div>{!isCustomer && <span className="person-contact">{(person as Supplier).contact}</span>}</td><td>{person.phone}</td><td>{person.email}</td><td className="address-cell">{person.address}</td><td>{isCustomer ? formatDate((person as Customer).registeredAt) : <button className="history-link" onClick={() => setDetail(person)}>{activityCount} phiếu nhập <ArrowRight size={13} /></button>}</td><td><div className="row-actions"><button className="icon-button" onClick={() => setDetail(person)} aria-label="Xem chi tiết"><Eye size={16} /></button><button className="icon-button" onClick={() => { setEditing(person); setPersonModalOpen(true); }} aria-label="Chỉnh sửa"><Pencil size={15} /></button><button className="icon-button danger-hover" onClick={() => removePerson(person)} aria-label="Xóa"><Trash2 size={15} /></button></div></td></tr>; })}</tbody></table>{filtered.length === 0 && <div className="table-empty">Không có kết quả phù hợp.</div>}</div><div className="table-footer"><span>Hiển thị <strong>{filtered.length}</strong> trên <strong>{records.length}</strong> hồ sơ</span><span className="footer-status"><i /> Đã lưu cục bộ</span></div>
    </section>
    {personModalOpen && <PersonModal person={editing} kind={kind} onClose={() => { setEditing(null); setPersonModalOpen(false); }} onSave={savePerson} />}
    {detail && <Modal title={isCustomer ? 'Hồ sơ khách hàng' : 'Lịch sử nhà cung cấp'} onClose={() => setDetail(null)}><div className="person-detail"><span className="person-avatar large-avatar">{detail.name.split(' ').slice(-1)[0].slice(0, 1)}</span><h3>{detail.name}</h3><span>{detail.code} · {detail.phone}</span><p>{detail.email}<br />{detail.address}</p><h4>{isCustomer ? 'Lịch sử mua xe' : 'Lịch sử nhập hàng'}</h4>{relatedHistory.length === 0 ? <p className="muted-copy">Chưa có giao dịch.</p> : relatedHistory.map((record) => { const isInvoice = 'invoiceNumber' in record; const firstLine = record.details[0]; return <div className="history-row" key={record.id}><span><strong>{isInvoice ? record.invoiceNumber : record.receiptNumber}</strong><small>{firstLine?.vehicleName ?? 'Chứng từ'} · {formatDate(record.date)}{record.details.length > 1 ? ` · ${record.details.length} dòng` : ''}</small></span><b>{formatMoney(record.total)}</b></div>; })}</div></Modal>}
  </>;
}

function PersonModal({ person, kind, onClose, onSave }: { person: Person | null; kind: PersonKind; onClose: () => void; onSave: (form: FormData) => void }) {
  const editing = person !== null;
  const supplier = kind === 'supplier';
  return <Modal title={`${editing ? 'Chỉnh sửa' : 'Thêm'} ${supplier ? 'nhà cung cấp' : 'khách hàng'}`} onClose={onClose}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave(new FormData(event.currentTarget)); }}><FormField label={supplier ? 'Tên đơn vị' : 'Họ và tên'}><input name="name" required defaultValue={person?.name} placeholder={supplier ? 'Tên doanh nghiệp' : 'Nguyễn Văn A'} /></FormField>{supplier && <FormField label="Người liên hệ"><input name="contact" required defaultValue={(person as Supplier | null)?.contact} /></FormField>}<FormField label="Số điện thoại"><input name="phone" required defaultValue={person?.phone} /></FormField><FormField label="Email"><input name="email" type="email" required defaultValue={person?.email} /></FormField><FormField label="Địa chỉ"><input name="address" required defaultValue={person?.address} /></FormField><FormActions onCancel={onClose} /></form></Modal>;
}

export function CustomersPage() { return <PeoplePage kind="customer" />; }
export function SuppliersPage() { return <PeoplePage kind="supplier" />; }

export function CategoriesPage() {
  const { brands, categories, bikes, saveCategory, removeCategory } = useStore();
  const [editing, setEditing] = useState<{ type: 'brand' | 'category'; value: string } | null>(null);
  function deleteItem(type: 'brand' | 'category', value: string) {
    const count = bikes.filter((bike) => type === 'brand' ? bike.brand === value : bike.category === value).length;
    if (count > 0) return window.alert(`Không thể xóa vì đang có ${count} mẫu xe thuộc danh mục này.`);
    if (window.confirm(`Xóa danh mục “${value}”?`)) removeCategory(type, value);
  }
  function save(form: FormData) {
    const value = String(form.get('value')).trim();
    if (!value) return;
    const exists = editing?.type === 'brand' ? brands.includes(value) : categories.includes(value);
    if (exists && value !== editing?.value) return window.alert('Tên danh mục đã tồn tại.');
    saveCategory(editing?.type ?? 'brand', editing?.value ?? '', value);
    setEditing(null);
  }
  return <>
    <PageHeading eyebrow="CẤU HÌNH SẢN PHẨM" title="Danh mục xe" description="Quản lý hãng xe và dòng xe đang kinh doanh." />
    <div className="category-grid">{([{ type: 'brand' as const, label: 'Hãng xe', items: brands, icon: 'H', description: 'Thương hiệu xe trong showroom' }, { type: 'category' as const, label: 'Dòng xe', items: categories, icon: 'D', description: 'Phân loại theo kiểu dáng và mục đích' }]).map((group) => <section className="panel category-panel" key={group.type}><div className="panel-heading"><div><span className="eyebrow">DANH MỤC</span><h2>{group.label}</h2><p>{group.description}</p></div><button className="button button-outline" onClick={() => setEditing({ type: group.type, value: '' })}><Plus size={15} /> Thêm mới</button></div><div className="category-list">{group.items.map((item, index) => { const count = bikes.filter((bike) => group.type === 'brand' ? bike.brand === item : bike.category === item).length; return <div className="category-row" key={item}><span className="category-index">{String(index + 1).padStart(2, '0')}</span><div className="category-item-name"><strong>{item}</strong><span>{count} mẫu xe</span></div><span className="category-count">{count}</span><button className="icon-button" onClick={() => setEditing({ type: group.type, value: item })} aria-label="Chỉnh sửa"><Pencil size={15} /></button><button className="icon-button danger-hover" onClick={() => deleteItem(group.type, item)} aria-label="Xóa"><Trash2 size={15} /></button></div>; })}</div></section>)}</div>
    {editing && <Modal title={`${editing.value ? 'Chỉnh sửa' : 'Thêm'} ${editing.type === 'brand' ? 'hãng xe' : 'dòng xe'}`} onClose={() => setEditing(null)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); save(new FormData(event.currentTarget)); }}><FormField label="Tên danh mục"><input name="value" required autoFocus defaultValue={editing.value} placeholder={editing.type === 'brand' ? 'Ví dụ: Triumph' : 'Ví dụ: Adventure'} /></FormField><FormActions onCancel={() => setEditing(null)} /></form></Modal>}
  </>;
}

function TransactionForm({ kind, onClose }: { kind: TransactionKind; onClose: () => void }) {
  const store = useStore();
  const isSale = kind === 'sale';
  const firstVehicle = store.bikes.find((vehicle) => !isSale || vehicle.stock > 0) ?? store.bikes[0];
  const [lines, setLines] = useState(() => firstVehicle ? [{ id: createStableId('draft'), vehicleId: firstVehicle.id, quantity: 1, unitCost: firstVehicle.cost }] : []);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');
  const subtotal = lines.reduce((sum, line) => {
    const vehicle = store.bikes.find((item) => item.id === line.vehicleId);
    return sum + line.quantity * (isSale ? vehicle?.price ?? 0 : line.unitCost);
  }, 0);
  const total = Math.max(0, subtotal - (isSale ? discount : 0));

  function updateLine(id: string, patch: Partial<(typeof lines)[number]>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  }

  function addLine() {
    const vehicle = store.bikes.find((item) => !isSale || item.stock > 0);
    if (vehicle) setLines((current) => [...current, { id: createStableId('draft'), vehicleId: vehicle.id, quantity: 1, unitCost: vehicle.cost }]);
  }

  function submit(form: FormData) {
    setError('');
    try {
      if (!lines.length) throw new Error('Thêm ít nhất một dòng xe vào chứng từ.');
      if (isSale) {
        const customerId = String(form.get('customerId'));
        store.createSalesInvoice({ customerId, discount, details: lines.map((line) => ({ vehicleId: line.vehicleId, quantity: line.quantity, unitPrice: store.bikes.find((vehicle) => vehicle.id === line.vehicleId)?.price ?? 0 })) });
      } else {
        const supplierId = String(form.get('supplierId'));
        store.createImportReceipt({ supplierId, details: lines.map((line) => ({ vehicleId: line.vehicleId, quantity: line.quantity, unitCost: line.unitCost })) });
      }
      onClose();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Không thể tạo giao dịch.');
    }
  }

  return <Modal title={isSale ? 'Tạo hóa đơn bán xe' : 'Tạo phiếu nhập hàng'} onClose={onClose} wide>
    <form className="transaction-form" onSubmit={(event) => { event.preventDefault(); submit(new FormData(event.currentTarget)); }}>
      <div className="form-grid">
        {isSale ? <FormField label="Khách hàng"><select name="customerId" required defaultValue=""><option value="" disabled>Chọn khách hàng</option>{store.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.phone}</option>)}</select></FormField> : <FormField label="Nhà cung cấp"><select name="supplierId" required defaultValue=""><option value="" disabled>Chọn nhà cung cấp</option>{store.suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></FormField>}
      </div>
      <div className="transaction-lines">
        {lines.map((line, index) => {
          const vehicle = store.bikes.find((item) => item.id === line.vehicleId);
          const lineTotal = line.quantity * (isSale ? vehicle?.price ?? 0 : line.unitCost);
          return <div className="transaction-line" key={line.id}>
            <div className="transaction-line-heading"><strong>Dòng {index + 1}</strong>{lines.length > 1 && <button type="button" className="icon-button danger-hover" aria-label={`Xóa dòng ${index + 1}`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><Trash2 size={15} /></button>}</div>
            <div className="form-grid line-fields">
              <FormField label="Mẫu xe"><select aria-label={`Xe dòng ${index + 1}`} value={line.vehicleId} onChange={(event) => { const selected = store.bikes.find((item) => item.id === event.target.value); updateLine(line.id, { vehicleId: event.target.value, unitCost: selected?.cost ?? 0 }); }} required>{store.bikes.map((item) => <option value={item.id} key={item.id} disabled={isSale && item.stock === 0}>{item.code} · {item.name} · {item.brand}{isSale ? ` · tồn ${item.stock}` : ''}</option>)}</select></FormField>
              <FormField label="Số lượng"><input aria-label={`Số lượng dòng ${index + 1}`} type="number" min="1" max={isSale ? vehicle?.stock ?? 1 : undefined} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} required /></FormField>
              {!isSale && <FormField label="Đơn giá nhập (VNĐ)"><input aria-label={`Đơn giá dòng ${index + 1}`} type="number" min="0" value={line.unitCost} onChange={(event) => updateLine(line.id, { unitCost: Number(event.target.value) })} required /></FormField>}
              <div className="line-total"><span>Thành tiền</span><strong>{formatMoney(lineTotal)}</strong></div>
            </div>
          </div>;
        })}
        <button type="button" className="button button-quiet add-line-button" onClick={addLine}><Plus size={15} /> Thêm xe vào chứng từ</button>
      </div>
      {isSale && <FormField label="Giảm giá hóa đơn (VNĐ)"><input type="number" min="0" max={subtotal} value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></FormField>}
      <div className="transaction-summary"><div><span>Tạm tính</span><strong>{formatMoney(subtotal)}</strong></div>{isSale && <div><span>Giảm giá</span><strong>- {formatMoney(discount)}</strong></div>}<div className="transaction-total"><span>Tổng thanh toán</span><strong>{formatMoney(total)}</strong></div></div>
      {error && <div className="form-error">{error}</div>}
      <div className="transaction-note">{isSale ? 'Tất cả dòng xe sẽ được kiểm tra tồn trước khi trừ kho và tạo hóa đơn.' : 'Xác nhận sẽ cộng tồn cho toàn bộ xe trong phiếu nhập.'}</div>
      <FormActions onCancel={onClose} submitLabel={isSale ? 'Xác nhận bán xe' : 'Xác nhận nhập hàng'} />
    </form>
  </Modal>;
}

export function SalesPage() {
  const { invoices, customers, bikes } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = invoices.filter((invoice) => `${invoice.invoiceNumber} ${customers.find((customer) => customer.id === invoice.customerId)?.name ?? ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <><PageHeading eyebrow="GIAO DỊCH · BÁN HÀNG" title="Bán hàng" description="Tạo giao dịch, cập nhật tồn kho và ghi nhận doanh thu." action={<button className="button button-primary" onClick={() => setOpen(true)}><Plus size={16} /> Tạo hóa đơn bán</button>} /><div className="sales-callout"><span className="sales-callout-icon"><ArrowUpFromLine size={18} /></span><div><strong>Quy trình bán hàng nhanh</strong><span>Chọn khách hàng và xe, xác nhận giao dịch để tự động trừ kho.</span></div><span className="sales-callout-count">{bikes.reduce((sum, bike) => sum + bike.stock, 0)} xe sẵn sàng bán</span></div><section className="panel directory-panel"><div className="table-toolbar"><div className="toolbar-title"><h2>Giao dịch bán hàng</h2><span className="result-count">{invoices.length}</span></div><label className="search-control"><Search size={16} /><input placeholder="Tìm hóa đơn hoặc khách hàng..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div><div className="table-scroll"><table className="data-table"><thead><tr><th>MÃ HÓA ĐƠN</th><th>KHÁCH HÀNG</th><th>SẢN PHẨM</th><th>NGÀY BÁN</th><th>NHÂN VIÊN</th><th>TRẠNG THÁI</th><th className="align-right">TỔNG TIỀN</th></tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice.id}><td><strong className="table-primary">{invoice.invoiceNumber}</strong></td><td>{customers.find((customer) => customer.id === invoice.customerId)?.name ?? 'Đã xóa khách'}</td><td>{invoice.details.map((detail) => `${detail.vehicleName} × ${detail.quantity}`).join(', ')}</td><td>{formatDate(invoice.date)}</td><td>{invoice.employee}</td><td><span className="status-pill status-success"><i />{invoice.status}</span></td><td className="align-right"><strong>{formatMoney(invoice.total)}</strong></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="table-empty">Chưa có giao dịch phù hợp.</div>}</div></section>{open && <TransactionForm kind="sale" onClose={() => setOpen(false)} />}</>;
}

export function PurchasesPage() {
  const { purchases, suppliers } = useStore();
  const [open, setOpen] = useState(false);
  return <><PageHeading eyebrow="KHO HÀNG · NHẬP HÀNG" title="Nhập hàng" description="Lập phiếu nhập và cập nhật số lượng xe trong kho." action={<button className="button button-primary" onClick={() => setOpen(true)}><Plus size={16} /> Tạo phiếu nhập</button>} /><div className="sales-callout purchase-callout"><span className="sales-callout-icon"><ArrowDownToLine size={18} /></span><div><strong>Nhập kho từ nhà cung cấp</strong><span>Phiếu nhập đã xác nhận sẽ cập nhật tồn kho ngay lập tức.</span></div><span className="sales-callout-count">{suppliers.length} nhà cung cấp</span></div><section className="panel directory-panel"><div className="table-toolbar"><div className="toolbar-title"><h2>Lịch sử nhập hàng</h2><span className="result-count">{purchases.length}</span></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>MÃ PHIẾU</th><th>NHÀ CUNG CẤP</th><th>SẢN PHẨM</th><th>NGÀY NHẬP</th><th>SỐ LƯỢNG</th><th>NHÂN VIÊN</th><th className="align-right">TỔNG TIỀN</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td><strong className="table-primary">{purchase.receiptNumber}</strong></td><td>{suppliers.find((supplier) => supplier.id === purchase.supplierId)?.name ?? 'Đã xóa nhà cung cấp'}</td><td>{purchase.details.map((detail) => `${detail.vehicleName} × ${detail.quantity}`).join(', ')}</td><td>{formatDate(purchase.date)}</td><td><strong>{purchase.quantity}</strong> xe</td><td>{purchase.employee}</td><td className="align-right"><strong>{formatMoney(purchase.total)}</strong></td></tr>)}</tbody></table>{purchases.length === 0 && <div className="table-empty">Chưa có phiếu nhập hàng.</div>}</div></section>{open && <TransactionForm kind="purchase" onClose={() => setOpen(false)} />}</>;
}

export function InvoicesPage() {
  const { invoices, customers } = useStore();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<SalesInvoiceView | null>(null);
  const filtered = invoices.filter((invoice) => `${invoice.invoiceNumber} ${customers.find((customer) => customer.id === invoice.customerId)?.name ?? ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <>
    <PageHeading eyebrow="GIAO DỊCH · CHỨNG TỪ" title="Hóa đơn" description="Tra cứu, xem chi tiết và in hóa đơn bán xe." />
    <section className="panel directory-panel"><div className="table-toolbar"><div className="toolbar-title"><h2>Danh sách hóa đơn</h2><span className="result-count">{invoices.length}</span></div><label className="search-control"><Search size={16} /><input placeholder="Tìm mã hóa đơn, khách hàng..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>MÃ HÓA ĐƠN</th><th>KHÁCH HÀNG</th><th>NHÂN VIÊN</th><th>NGÀY LẬP</th><th>TRẠNG THÁI</th><th className="align-right">TỔNG TIỀN</th><th /></tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice.id}><td><strong className="table-primary">{invoice.invoiceNumber}</strong></td><td>{customers.find((customer) => customer.id === invoice.customerId)?.name ?? 'Đã xóa khách'}</td><td>{invoice.employee}</td><td>{formatDate(invoice.date)}</td><td><span className="status-pill status-success"><i />{invoice.status}</span></td><td className="align-right"><strong>{formatMoney(invoice.total)}</strong></td><td><button className="icon-button" onClick={() => setDetail(invoice)} aria-label="Xem hóa đơn"><Eye size={16} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="table-empty">Không tìm thấy hóa đơn.</div>}</div>
    </section>
    {detail && <Modal title="Xem trước hóa đơn" onClose={() => setDetail(null)}><div className="invoice-preview"><div className="invoice-brand"><span className="brand-mark"><span>M</span></span><div><strong>MOTOSPORT</strong><small>SPORT MOTORCYCLE</small></div></div><div className="invoice-title"><span>HÓA ĐƠN BÁN HÀNG</span><strong>{detail.invoiceNumber}</strong><small>Ngày lập: {formatDate(detail.date)}</small></div><div className="invoice-customer"><span>KHÁCH HÀNG</span><strong>{customers.find((customer) => customer.id === detail.customerId)?.name ?? 'Khách hàng'}</strong><small>Nhân viên: {detail.employee}</small></div>{detail.details.map((line) => <div className="invoice-line" key={line.id}><div><strong>{line.vehicleName}</strong><small>{line.vehicleCode} · {line.quantity} xe</small></div><span>{formatMoney(line.lineTotal)}</span></div>)}{detail.discount > 0 && <div className="invoice-discount"><span>Giảm giá</span><span>- {formatMoney(detail.discount)}</span></div>}<div className="invoice-total"><span>Tổng thanh toán</span><strong>{formatMoney(detail.total)}</strong></div><div className="invoice-thanks">Cảm ơn quý khách đã tin tưởng MotoSport.</div><button className="button button-primary button-full no-print" onClick={() => window.print()}><Printer size={16} /> In hóa đơn</button></div></Modal>}
  </>;
}

export function ReportsPage() {
  const { bikes, invoices, purchases, customers } = useStore();
  const [range, setRange] = useState('90');
  const since = new Date(reportToday.getTime() - Number(range) * 86_400_000).toISOString().slice(0, 10);
  const periodInvoices = invoices.filter((invoice) => invoice.date >= since);
  const periodPurchases = purchases.filter((purchase) => purchase.date >= since);
  const revenue = periodInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const grossProfit = periodInvoices.reduce((sum, invoice) => sum + invoice.details.reduce((lineSum, detail) => lineSum + detail.lineTotal - (bikes.find((bike) => bike.id === detail.vehicleId)?.cost ?? 0) * detail.quantity, 0) - invoice.discount, 0);
  const sold = periodInvoices.reduce((sum, invoice) => sum + invoice.details.reduce((lineSum, detail) => lineSum + detail.quantity, 0), 0);
  const purchased = periodPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
  const monthBars = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(reportToday);
    date.setMonth(date.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const value = periodInvoices.filter((invoice) => invoice.date.startsWith(key)).reduce((sum, invoice) => sum + invoice.total, 0);
    return { label: date.toLocaleDateString('vi-VN', { month: 'short' }).replace('.', ''), value };
  });
  const chartMax = Math.max(1, ...monthBars.map((bar) => bar.value));
  const categories = [...new Set(bikes.map((bike) => bike.category))].map((category) => ({ category, stock: bikes.filter((bike) => bike.category === category).reduce((sum, bike) => sum + bike.stock, 0), sold: invoices.reduce((sum, invoice) => sum + invoice.details.filter((detail) => bikes.find((bike) => bike.id === detail.vehicleId)?.category === category).reduce((lineSum, detail) => lineSum + detail.quantity, 0), 0) }));
  return <><PageHeading eyebrow="PHÂN TÍCH KINH DOANH" title="Báo cáo thống kê" description="Tổng hợp doanh thu, nhập hàng và hiệu quả tồn kho." action={<select className="range-select" value={range} onChange={(event) => setRange(event.target.value)} aria-label="Khoảng thời gian"><option value="30">30 ngày gần nhất</option><option value="90">90 ngày gần nhất</option><option value="365">12 tháng gần nhất</option></select>} /><section className="report-stats"><article><span>Doanh thu</span><strong>{formatCompactMoney(revenue)}</strong><small>{periodInvoices.length} hóa đơn</small></article><article><span>Xe bán ra</span><strong>{sold}</strong><small>xe trong kỳ</small></article><article><span>Xe nhập kho</span><strong>{purchased}</strong><small>xe trong kỳ</small></article><article><span>Lợi nhuận dự kiến</span><strong>{formatCompactMoney(grossProfit)}</strong><small>chưa gồm chi phí vận hành</small></article></section><div className="report-grid"><section className="panel report-chart-panel"><div className="panel-heading"><div><span className="eyebrow">DOANH THU</span><h2>Xu hướng 6 tháng</h2></div></div><div className="report-chart">{monthBars.map((bar, index) => <div className="report-bar-column" key={`${bar.label}-${index}`}><span>{bar.value ? formatCompactMoney(bar.value) : '—'}</span><div className="report-bar-track"><i className={index === monthBars.length - 1 ? 'current' : ''} style={{ height: `${Math.max(bar.value ? 8 : 2, bar.value / chartMax * 100)}%` }} /></div><small>{bar.label}</small></div>)}</div><div className="chart-legend"><span><i /> Doanh thu ghi nhận</span></div></section><section className="panel report-stock-panel"><div className="panel-heading"><div><span className="eyebrow">PHÂN BỔ TỒN KHO</span><h2>Theo dòng xe</h2></div></div>{categories.map((item) => <div className="category-report-row" key={item.category}><div><strong>{item.category}</strong><span>{item.sold} xe đã bán</span></div><b>{item.stock}<small> tồn</small></b><div className="mini-progress"><i style={{ width: `${Math.max(3, item.stock / Math.max(1, bikes.reduce((sum, bike) => sum + bike.stock, 0)) * 100)}%` }} /></div></div>)}</section></div><section className="panel report-recent-panel"><div className="panel-heading"><div><span className="eyebrow">HIỆU QUẢ BÁN HÀNG</span><h2>Giao dịch trong kỳ</h2></div><span className="result-count">{periodInvoices.length}</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>MÃ HÓA ĐƠN</th><th>KHÁCH HÀNG</th><th>NGÀY</th><th>SỐ LƯỢNG</th><th className="align-right">DOANH THU</th></tr></thead><tbody>{periodInvoices.slice(0, 8).map((invoice) => <tr key={invoice.id}><td><strong className="table-primary">{invoice.id}</strong></td><td>{customers.find((customer) => customer.id === invoice.customerId)?.name ?? 'Khách hàng'}</td><td>{formatDate(invoice.date)}</td><td>{invoice.quantity} xe</td><td className="align-right"><strong>{formatMoney(invoice.total)}</strong></td></tr>)}</tbody></table>{periodInvoices.length === 0 && <div className="table-empty">Không có giao dịch trong khoảng thời gian này.</div>}</div></section></>;
}

export function SettingsPage() {
  const { resetDemo, bikes, customers, suppliers, invoices, purchases } = useStore();
  function reset() {
    if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu? Các thay đổi hiện tại sẽ bị xóa.')) resetDemo();
  }
  return <><PageHeading eyebrow="HỆ THỐNG" title="Cài đặt" description="Tùy chỉnh dữ liệu mẫu và thông tin không gian làm việc." /><div className="settings-layout"><section className="panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol"><RotateCcw size={18} /></span><div><h2>Dữ liệu demo</h2><p>Dữ liệu được lưu trên trình duyệt hiện tại, không gửi lên máy chủ.</p></div></div><div className="settings-data-counts"><span><strong>{bikes.length}</strong> mẫu xe</span><span><strong>{customers.length}</strong> khách hàng</span><span><strong>{suppliers.length}</strong> nhà cung cấp</span><span><strong>{invoices.length + purchases.length}</strong> giao dịch</span></div><div className="settings-danger-zone"><div><strong>Khôi phục dữ liệu ban đầu</strong><span>Thao tác này sẽ thay thế dữ liệu đã chỉnh sửa bằng dữ liệu mẫu.</span></div><button className="button button-danger" onClick={reset}><RotateCcw size={15} /> Khôi phục</button></div></section><section className="panel settings-panel"><div className="settings-section-heading"><span className="settings-symbol settings-symbol-orange"><span>M</span></span><div><h2>Thông tin showroom</h2><p>Thông tin hiển thị trên hồ sơ nội bộ.</p></div></div><div className="settings-info"><span>Tên showroom<strong>MotoSport Premium</strong></span><span>Nhân viên hiện tại<strong>Nguyễn An · Quản lý cửa hàng</strong></span><span>Đơn vị tiền tệ<strong>Việt Nam đồng (₫)</strong></span><span>Chế độ lưu trữ<strong>LocalStorage trên thiết bị</strong></span></div></section></div></>;
}