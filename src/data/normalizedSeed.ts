import type { ImportReceipt, ImportReceiptDetail, SalesInvoice, SalesInvoiceDetail, Vehicle } from '../types/entities';
import type { StoreData } from '../types/store-data';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const openingVehicles: Vehicle[] = [
  { id: 'VEH-001', code: 'XE-001', name: 'CBR650R', brandId: 'BRAND-HONDA', categoryId: 'CAT-SPORTBIKE', displacement: 649, year: 2025, color: 'Đỏ đen', cost: 198000000, price: 245000000, stock: 5, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-002', code: 'XE-002', name: 'YZF-R7', brandId: 'BRAND-YAMAHA', categoryId: 'CAT-SPORTBIKE', displacement: 689, year: 2025, color: 'Xanh GP', cost: 208000000, price: 259000000, stock: 6, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-003', code: 'XE-003', name: 'Ninja ZX-6R', brandId: 'BRAND-KAWASAKI', categoryId: 'CAT-SUPERBIKE', displacement: 636, year: 2024, color: 'Xanh lime', cost: 245000000, price: 299000000, stock: 2, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-004', code: 'XE-004', name: 'Monster SP', brandId: 'BRAND-DUCATI', categoryId: 'CAT-NAKED', displacement: 937, year: 2025, color: 'Đỏ Ducati', cost: 368000000, price: 429000000, stock: 2, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-005', code: 'XE-005', name: 'R 1250 GS', brandId: 'BRAND-BMW', categoryId: 'CAT-TOURING', displacement: 1254, year: 2024, color: 'Đen nhám', cost: 520000000, price: 599000000, stock: 0, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-006', code: 'XE-006', name: 'GSX-8R', brandId: 'BRAND-SUZUKI', categoryId: 'CAT-SPORTBIKE', displacement: 776, year: 2025, color: 'Bạc xanh', cost: 218000000, price: 269000000, stock: 0, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-007', code: 'XE-007', name: 'Rebel 1100', brandId: 'BRAND-HONDA', categoryId: 'CAT-CRUISER', displacement: 1084, year: 2025, color: 'Đen', cost: 312000000, price: 369000000, stock: 5, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-008', code: 'XE-008', name: 'MT-09 SP', brandId: 'BRAND-YAMAHA', categoryId: 'CAT-NAKED', displacement: 890, year: 2025, color: 'Xám xanh', cost: 278000000, price: 339000000, stock: 4, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-009', code: 'XE-009', name: 'Panigale V2', brandId: 'BRAND-DUCATI', categoryId: 'CAT-SUPERBIKE', displacement: 955, year: 2024, color: 'Đỏ', cost: 468000000, price: 549000000, stock: 1, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=960&q=85' },
  { id: 'VEH-010', code: 'XE-010', name: 'Ninja 650', brandId: 'BRAND-KAWASAKI', categoryId: 'CAT-SPORTBIKE', displacement: 649, year: 2025, color: 'Xanh đen', cost: 178000000, price: 219000000, stock: 8, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=85' },
];

const salesInvoices: SalesInvoice[] = [
  { id: 'INV-26001', invoiceNumber: 'HD-26001', customerId: 'KH-001', employeeId: 'EMP-001', issuedAt: daysAgo(2), discount: 0, total: 245000000, status: 'paid' },
  { id: 'INV-26002', invoiceNumber: 'HD-26002', customerId: 'KH-003', employeeId: 'EMP-002', issuedAt: daysAgo(4), discount: 5000000, total: 334000000, status: 'paid' },
  { id: 'INV-26003', invoiceNumber: 'HD-26003', customerId: 'KH-002', employeeId: 'EMP-001', issuedAt: daysAgo(9), discount: 0, total: 219000000, status: 'paid' },
  { id: 'INV-26004', invoiceNumber: 'HD-26004', customerId: 'KH-004', employeeId: 'EMP-003', issuedAt: daysAgo(17), discount: 10000000, total: 289000000, status: 'paid' },
  { id: 'INV-26005', invoiceNumber: 'HD-26005', customerId: 'KH-005', employeeId: 'EMP-002', issuedAt: daysAgo(36), discount: 0, total: 369000000, status: 'paid' },
  { id: 'INV-26006', invoiceNumber: 'HD-26006', customerId: 'KH-006', employeeId: 'EMP-001', issuedAt: daysAgo(68), discount: 0, total: 259000000, status: 'paid' },
];

const salesInvoiceDetails: SalesInvoiceDetail[] = [
  { id: 'INVD-26001-1', salesInvoiceId: 'INV-26001', vehicleId: 'VEH-001', quantity: 1, unitPrice: 245000000, lineTotal: 245000000 },
  { id: 'INVD-26002-1', salesInvoiceId: 'INV-26002', vehicleId: 'VEH-008', quantity: 1, unitPrice: 339000000, lineTotal: 339000000 },
  { id: 'INVD-26003-1', salesInvoiceId: 'INV-26003', vehicleId: 'VEH-010', quantity: 1, unitPrice: 219000000, lineTotal: 219000000 },
  { id: 'INVD-26004-1', salesInvoiceId: 'INV-26004', vehicleId: 'VEH-003', quantity: 1, unitPrice: 299000000, lineTotal: 299000000 },
  { id: 'INVD-26005-1', salesInvoiceId: 'INV-26005', vehicleId: 'VEH-007', quantity: 1, unitPrice: 369000000, lineTotal: 369000000 },
  { id: 'INVD-26006-1', salesInvoiceId: 'INV-26006', vehicleId: 'VEH-002', quantity: 1, unitPrice: 259000000, lineTotal: 259000000 },
];

const importReceipts: ImportReceipt[] = [
  { id: 'REC-26017', receiptNumber: 'PN-26017', supplierId: 'NCC-003', employeeId: 'EMP-001', receivedAt: daysAgo(120), total: 8028000000, status: 'confirmed' },
  { id: 'REC-26018', receiptNumber: 'PN-26018', supplierId: 'NCC-004', employeeId: 'EMP-002', receivedAt: daysAgo(41), total: 520000000, status: 'confirmed' },
  { id: 'REC-26019', receiptNumber: 'PN-26019', supplierId: 'NCC-003', employeeId: 'EMP-003', receivedAt: daysAgo(19), total: 490000000, status: 'confirmed' },
  { id: 'REC-26020', receiptNumber: 'PN-26020', supplierId: 'NCC-002', employeeId: 'EMP-001', receivedAt: daysAgo(8), total: 834000000, status: 'confirmed' },
  { id: 'REC-26021', receiptNumber: 'PN-26021', supplierId: 'NCC-001', employeeId: 'EMP-002', receivedAt: daysAgo(3), total: 792000000, status: 'confirmed' },
];

const importReceiptDetails: ImportReceiptDetail[] = [
  { id: 'RECD-26017-1', importReceiptId: 'REC-26017', vehicleId: 'VEH-001', quantity: 5, unitCost: 198000000, lineTotal: 990000000 },
  { id: 'RECD-26017-2', importReceiptId: 'REC-26017', vehicleId: 'VEH-002', quantity: 6, unitCost: 208000000, lineTotal: 1248000000 },
  { id: 'RECD-26017-3', importReceiptId: 'REC-26017', vehicleId: 'VEH-003', quantity: 2, unitCost: 245000000, lineTotal: 490000000 },
  { id: 'RECD-26017-4', importReceiptId: 'REC-26017', vehicleId: 'VEH-004', quantity: 2, unitCost: 368000000, lineTotal: 736000000 },
  { id: 'RECD-26017-5', importReceiptId: 'REC-26017', vehicleId: 'VEH-007', quantity: 5, unitCost: 312000000, lineTotal: 1560000000 },
  { id: 'RECD-26017-6', importReceiptId: 'REC-26017', vehicleId: 'VEH-008', quantity: 4, unitCost: 278000000, lineTotal: 1112000000 },
  { id: 'RECD-26017-7', importReceiptId: 'REC-26017', vehicleId: 'VEH-009', quantity: 1, unitCost: 468000000, lineTotal: 468000000 },
  { id: 'RECD-26017-8', importReceiptId: 'REC-26017', vehicleId: 'VEH-010', quantity: 8, unitCost: 178000000, lineTotal: 1424000000 },
  { id: 'RECD-26018-1', importReceiptId: 'REC-26018', vehicleId: 'VEH-005', quantity: 1, unitCost: 520000000, lineTotal: 520000000 },
  { id: 'RECD-26019-1', importReceiptId: 'REC-26019', vehicleId: 'VEH-003', quantity: 2, unitCost: 245000000, lineTotal: 490000000 },
  { id: 'RECD-26020-1', importReceiptId: 'REC-26020', vehicleId: 'VEH-008', quantity: 3, unitCost: 278000000, lineTotal: 834000000 },
  { id: 'RECD-26021-1', importReceiptId: 'REC-26021', vehicleId: 'VEH-001', quantity: 4, unitCost: 198000000, lineTotal: 792000000 },
];

const stockMovements = new Map<string, number>();
for (const detail of importReceiptDetails) stockMovements.set(detail.vehicleId, (stockMovements.get(detail.vehicleId) ?? 0) + detail.quantity);
for (const detail of salesInvoiceDetails) stockMovements.set(detail.vehicleId, (stockMovements.get(detail.vehicleId) ?? 0) - detail.quantity);

export const initialData: StoreData = {
  vehicleBrands: [
    { id: 'BRAND-HONDA', name: 'Honda' }, { id: 'BRAND-YAMAHA', name: 'Yamaha' },
    { id: 'BRAND-KAWASAKI', name: 'Kawasaki' }, { id: 'BRAND-DUCATI', name: 'Ducati' },
    { id: 'BRAND-BMW', name: 'BMW Motorrad' }, { id: 'BRAND-SUZUKI', name: 'Suzuki' },
  ],
  vehicleCategories: [
    { id: 'CAT-SPORTBIKE', name: 'Sportbike' }, { id: 'CAT-NAKED', name: 'Naked Bike' },
    { id: 'CAT-CRUISER', name: 'Cruiser' }, { id: 'CAT-TOURING', name: 'Touring' },
    { id: 'CAT-SUPERBIKE', name: 'Superbike' },
  ],
  vehicles: openingVehicles.map((vehicle) => ({ ...vehicle, stock: vehicle.stock + (stockMovements.get(vehicle.id) ?? 0) })),
  customers: [
    { id: 'KH-001', code: 'KH-001', name: 'Nguyễn Minh Khang', phone: '0901 234 567', email: 'khang.nguyen@example.com', address: 'Quận 3, TP. Hồ Chí Minh', registeredAt: daysAgo(92) },
    { id: 'KH-002', code: 'KH-002', name: 'Trần Quốc Bảo', phone: '0912 345 678', email: 'bao.tran@example.com', address: 'Thủ Đức, TP. Hồ Chí Minh', registeredAt: daysAgo(81) },
    { id: 'KH-003', code: 'KH-003', name: 'Lê Hoàng Nam', phone: '0934 567 890', email: 'nam.le@example.com', address: 'Hải Châu, Đà Nẵng', registeredAt: daysAgo(60) },
    { id: 'KH-004', code: 'KH-004', name: 'Phạm Gia Huy', phone: '0987 654 321', email: 'huy.pham@example.com', address: 'Cầu Giấy, Hà Nội', registeredAt: daysAgo(45) },
    { id: 'KH-005', code: 'KH-005', name: 'Võ Thanh Tùng', phone: '0908 765 432', email: 'tung.vo@example.com', address: 'Ninh Kiều, Cần Thơ', registeredAt: daysAgo(28) },
    { id: 'KH-006', code: 'KH-006', name: 'Đặng Nhật Minh', phone: '0976 543 210', email: 'minh.dang@example.com', address: 'Quận 7, TP. Hồ Chí Minh', registeredAt: daysAgo(12) },
  ],
  suppliers: [
    { id: 'NCC-001', code: 'NCC-001', name: 'Honda Motor Việt Nam', contact: 'Nguyễn Thành Long', phone: '028 3925 6800', email: 'sales@honda-demo.vn', address: 'Phúc Thắng, Phúc Yên, Vĩnh Phúc' },
    { id: 'NCC-002', code: 'NCC-002', name: 'Yamaha Motor Việt Nam', contact: 'Trần Hải Đăng', phone: '024 3557 2828', email: 'dealer@yamaha-demo.vn', address: 'Sóc Sơn, Hà Nội' },
    { id: 'NCC-003', code: 'NCC-003', name: 'Mô tô Thịnh Phát', contact: 'Lê Đức Thành', phone: '028 3822 4545', email: 'contact@thinhphat-demo.vn', address: 'Bình Thạnh, TP. Hồ Chí Minh' },
    { id: 'NCC-004', code: 'NCC-004', name: 'Motorcycle World', contact: 'Phạm Anh Tuấn', phone: '0236 362 8899', email: 'orders@motorworld-demo.vn', address: 'Thanh Khê, Đà Nẵng' },
  ],
  employees: [
    { id: 'EMP-001', code: 'NV-001', name: 'Nguyễn An', role: 'Quản lý cửa hàng', phone: '0900 111 222', email: 'an.nguyen@example.com', active: true },
    { id: 'EMP-002', code: 'NV-002', name: 'Trần Linh', role: 'Tư vấn bán hàng', phone: '0900 222 333', email: 'linh.tran@example.com', active: true },
    { id: 'EMP-003', code: 'NV-003', name: 'Lê Quỳnh', role: 'Tư vấn bán hàng', phone: '0900 333 444', email: 'quynh.le@example.com', active: true },
  ],
  salesInvoices,
  salesInvoiceDetails,
  importReceipts,
  importReceiptDetails,
};