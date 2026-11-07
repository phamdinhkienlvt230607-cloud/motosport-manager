import type { StoreData } from '../types/store-data';
import type { Customer, ImportReceipt, ImportReceiptDetail, SalesInvoice, SalesInvoiceDetail, Supplier, Vehicle, VehicleBrand, VehicleCategory } from '../types/entities';

export interface SaleLineInput {
  vehicleId: string;
  quantity: number;
  unitPrice: number;
}

export interface ImportLineInput {
  vehicleId: string;
  quantity: number;
  unitCost: number;
}

export interface SaleInvoiceInput {
  customerId: string;
  employeeId: string;
  discount: number;
  details: SaleLineInput[];
}

export interface ImportReceiptInput {
  supplierId: string;
  employeeId: string;
  details: ImportLineInput[];
}

function createId(kind: string) {
  return `${kind}-${globalThis.crypto.randomUUID()}`;
}

function nextDocumentNumber(prefix: string, values: string[]) {
  const next = Math.max(0, ...values.map((value) => Number(value.match(/(\d+)$/)?.[1]) || 0)) + 1;
  return `${prefix}-${String(next).padStart(5, '0')}`;
}

function replaceById<T extends { id: string }>(records: T[], record: T) {
  return records.some((item) => item.id === record.id)
    ? records.map((item) => item.id === record.id ? record : item)
    : [record, ...records];
}

function validateLines(lines: Array<{ vehicleId: string; quantity: number }>, store: StoreData) {
  if (!lines.length) throw new Error('Thêm ít nhất một dòng xe vào chứng từ.');
  const quantities = new Map<string, number>();
  for (const line of lines) {
    if (!store.vehicles.some((vehicle) => vehicle.id === line.vehicleId)) throw new Error('Không tìm thấy mẫu xe.');
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error('Số lượng mỗi dòng phải là số nguyên dương.');
    quantities.set(line.vehicleId, (quantities.get(line.vehicleId) ?? 0) + line.quantity);
  }
  return quantities;
}

export const motoSportService = {
  saveVehicle(store: StoreData, vehicle: Vehicle): StoreData {
    if (!store.vehicleBrands.some((brand) => brand.id === vehicle.brandId)) throw new Error('Hãng xe không tồn tại.');
    if (!store.vehicleCategories.some((category) => category.id === vehicle.categoryId)) throw new Error('Dòng xe không tồn tại.');
    return { ...store, vehicles: replaceById(store.vehicles, vehicle) };
  },

  removeVehicle(store: StoreData, id: string): StoreData {
    const referenced = store.salesInvoiceDetails.some((detail) => detail.vehicleId === id) || store.importReceiptDetails.some((detail) => detail.vehicleId === id);
    if (referenced) throw new Error('Xe đã xuất hiện trong chứng từ, không thể xóa để bảo toàn lịch sử.');
    return { ...store, vehicles: store.vehicles.filter((vehicle) => vehicle.id !== id) };
  },

  saveCustomer(store: StoreData, customer: Customer): StoreData {
    return { ...store, customers: replaceById(store.customers, customer) };
  },

  removeCustomer(store: StoreData, id: string): StoreData {
    if (store.salesInvoices.some((invoice) => invoice.customerId === id)) throw new Error('Khách hàng có hóa đơn, không thể xóa để bảo toàn lịch sử.');
    return { ...store, customers: store.customers.filter((customer) => customer.id !== id) };
  },

  saveSupplier(store: StoreData, supplier: Supplier): StoreData {
    return { ...store, suppliers: replaceById(store.suppliers, supplier) };
  },

  removeSupplier(store: StoreData, id: string): StoreData {
    if (store.importReceipts.some((receipt) => receipt.supplierId === id)) throw new Error('Nhà cung cấp có phiếu nhập, không thể xóa để bảo toàn lịch sử.');
    return { ...store, suppliers: store.suppliers.filter((supplier) => supplier.id !== id) };
  },

  saveBrand(store: StoreData, brand: VehicleBrand): StoreData {
    if (store.vehicleBrands.some((item) => item.id !== brand.id && item.name.toLocaleLowerCase() === brand.name.toLocaleLowerCase())) throw new Error('Hãng xe đã tồn tại.');
    return { ...store, vehicleBrands: replaceById(store.vehicleBrands, brand) };
  },

  removeBrand(store: StoreData, id: string): StoreData {
    if (store.vehicles.some((vehicle) => vehicle.brandId === id)) throw new Error('Hãng xe đang được sử dụng.');
    return { ...store, vehicleBrands: store.vehicleBrands.filter((brand) => brand.id !== id) };
  },

  saveVehicleCategory(store: StoreData, category: VehicleCategory): StoreData {
    if (store.vehicleCategories.some((item) => item.id !== category.id && item.name.toLocaleLowerCase() === category.name.toLocaleLowerCase())) throw new Error('Dòng xe đã tồn tại.');
    return { ...store, vehicleCategories: replaceById(store.vehicleCategories, category) };
  },

  removeVehicleCategory(store: StoreData, id: string): StoreData {
    if (store.vehicles.some((vehicle) => vehicle.categoryId === id)) throw new Error('Dòng xe đang được sử dụng.');
    return { ...store, vehicleCategories: store.vehicleCategories.filter((category) => category.id !== id) };
  },

  createSalesInvoice(store: StoreData, input: { customerId: string; employeeId: string; discount: number; details: SaleLineInput[] }): StoreData {
    if (!store.customers.some((customer) => customer.id === input.customerId)) throw new Error('Khách hàng không tồn tại.');
    if (!store.employees.some((employee) => employee.id === input.employeeId && employee.active)) throw new Error('Nhân viên không hoạt động.');
    const quantities = validateLines(input.details, store);
    for (const [vehicleId, quantity] of quantities) {
      const vehicle = store.vehicles.find((item) => item.id === vehicleId)!;
      if (quantity > vehicle.stock) throw new Error(`${vehicle.name}: tồn kho ${vehicle.stock} xe, không thể bán ${quantity} xe.`);
    }
    for (const detail of input.details) {
      if (!Number.isFinite(detail.unitPrice) || detail.unitPrice < 0) throw new Error('Đơn giá bán không hợp lệ.');
    }
    const subtotal = input.details.reduce((sum, detail) => sum + detail.quantity * detail.unitPrice, 0);
    if (input.discount < 0 || input.discount > subtotal) throw new Error('Mức giảm giá không hợp lệ.');
    const invoiceId = createId('invoice');
    const invoice: SalesInvoice = {
      id: invoiceId,
      invoiceNumber: nextDocumentNumber('HD', store.salesInvoices.map((item) => item.invoiceNumber)),
      customerId: input.customerId,
      employeeId: input.employeeId,
      issuedAt: new Date().toISOString().slice(0, 10),
      discount: input.discount,
      total: subtotal - input.discount,
      status: 'paid',
    };
    const details: SalesInvoiceDetail[] = input.details.map((detail) => ({
      id: createId('invoice-detail'), salesInvoiceId: invoiceId,
      vehicleId: detail.vehicleId, quantity: detail.quantity,
      unitPrice: detail.unitPrice, lineTotal: detail.quantity * detail.unitPrice,
    }));
    return {
      ...store,
      vehicles: store.vehicles.map((vehicle) => ({ ...vehicle, stock: vehicle.stock - (quantities.get(vehicle.id) ?? 0) })),
      salesInvoices: [invoice, ...store.salesInvoices],
      salesInvoiceDetails: [...details, ...store.salesInvoiceDetails],
    };
  },

  createImportReceipt(store: StoreData, input: { supplierId: string; employeeId: string; details: ImportLineInput[] }): StoreData {
    if (!store.suppliers.some((supplier) => supplier.id === input.supplierId)) throw new Error('Nhà cung cấp không tồn tại.');
    if (!store.employees.some((employee) => employee.id === input.employeeId && employee.active)) throw new Error('Nhân viên không hoạt động.');
    validateLines(input.details, store);
    for (const detail of input.details) {
      if (!Number.isFinite(detail.unitCost) || detail.unitCost < 0) throw new Error('Đơn giá nhập không hợp lệ.');
    }
    const receiptId = createId('receipt');
    const receipt: ImportReceipt = {
      id: receiptId,
      receiptNumber: nextDocumentNumber('PN', store.importReceipts.map((item) => item.receiptNumber)),
      supplierId: input.supplierId,
      employeeId: input.employeeId,
      receivedAt: new Date().toISOString().slice(0, 10),
      total: input.details.reduce((sum, detail) => sum + detail.quantity * detail.unitCost, 0),
      status: 'confirmed',
    };
    const details: ImportReceiptDetail[] = input.details.map((detail) => ({
      id: createId('receipt-detail'), importReceiptId: receiptId,
      vehicleId: detail.vehicleId, quantity: detail.quantity,
      unitCost: detail.unitCost, lineTotal: detail.quantity * detail.unitCost,
    }));
    const addedByVehicle = new Map<string, number>();
    for (const detail of input.details) addedByVehicle.set(detail.vehicleId, (addedByVehicle.get(detail.vehicleId) ?? 0) + detail.quantity);
    const latestCostByVehicle = new Map(input.details.map((detail) => [detail.vehicleId, detail.unitCost]));
    return {
      ...store,
      vehicles: store.vehicles.map((vehicle) => ({ ...vehicle, stock: vehicle.stock + (addedByVehicle.get(vehicle.id) ?? 0), cost: latestCostByVehicle.get(vehicle.id) ?? vehicle.cost })),
      importReceipts: [receipt, ...store.importReceipts],
      importReceiptDetails: [...details, ...store.importReceiptDetails],
    };
  },
};