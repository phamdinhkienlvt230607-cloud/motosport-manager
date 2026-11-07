import type { StoreData } from '../types/store-data';

export interface StoreRepository {
  load(fallback: StoreData): StoreData;
  save(data: StoreData): void;
}

const STORAGE_KEY = 'motosport-manager-v2';
const LEGACY_STORAGE_KEY = 'motosport-manager-v1';

export class LocalStorageRepository implements StoreRepository {
  load(fallback: StoreData): StoreData {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return JSON.parse(current) as StoreData;
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) return this.migrate(JSON.parse(legacy) as LegacyStoreData, fallback);
    } catch {
      return fallback;
    }
    return fallback;
  }

  save(data: StoreData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      return;
    }
  }

  private migrate(legacy: LegacyStoreData, fallback: StoreData): StoreData {
    const data = structuredClone(fallback);
    if (!legacy || !Array.isArray(legacy.bikes)) return data;

    const brandIds = new Map(data.vehicleBrands.map((brand) => [brand.name, brand.id]));
    const categoryIds = new Map(data.vehicleCategories.map((category) => [category.name, category.id]));
    const idFor = (prefix: string, value: string) => `${prefix}-${value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-')}`;

    for (const brand of legacy.brands ?? []) {
      if (!brandIds.has(brand)) {
        const id = idFor('brand', brand);
        data.vehicleBrands.push({ id, name: brand });
        brandIds.set(brand, id);
      }
    }
    for (const category of legacy.categories ?? []) {
      if (!categoryIds.has(category)) {
        const id = idFor('category', category);
        data.vehicleCategories.push({ id, name: category });
        categoryIds.set(category, id);
      }
    }

    data.vehicles = legacy.bikes.map((bike) => {
      const brandId = brandIds.get(bike.brand) ?? idFor('brand', bike.brand);
      const categoryId = categoryIds.get(bike.category) ?? idFor('category', bike.category);
      if (!brandIds.has(bike.brand)) data.vehicleBrands.push({ id: brandId, name: bike.brand });
      if (!categoryIds.has(bike.category)) data.vehicleCategories.push({ id: categoryId, name: bike.category });
      return { id: idFor('vehicle', bike.id), code: bike.id, name: bike.name, brandId, categoryId, displacement: bike.displacement, year: bike.year, color: bike.color, cost: bike.cost, price: bike.price, stock: bike.stock, image: bike.image };
    });

    data.customers = (legacy.customers ?? []).map((customer) => ({ ...customer, code: customer.id, id: idFor('customer', customer.id) }));
    data.suppliers = (legacy.suppliers ?? []).map((supplier) => ({ ...supplier, code: supplier.id, id: idFor('supplier', supplier.id) }));
    const customerIds = new Map((legacy.customers ?? []).map((customer) => [customer.id, idFor('customer', customer.id)]));
    const supplierIds = new Map((legacy.suppliers ?? []).map((supplier) => [supplier.id, idFor('supplier', supplier.id)]));
    const vehicleIds = new Map(legacy.bikes.map((bike) => [bike.id, idFor('vehicle', bike.id)]));
    const employeeIds = new Map(data.employees.map((employee) => [employee.name, employee.id]));
    const employeeIdFor = (name: string) => employeeIds.get(name) ?? data.employees[0].id;

    data.salesInvoices = (legacy.invoices ?? []).map((invoice) => ({
      id: idFor('invoice', invoice.id), invoiceNumber: invoice.id,
      customerId: customerIds.get(invoice.customerId) ?? idFor('customer', invoice.customerId),
      employeeId: employeeIdFor(invoice.employee), issuedAt: invoice.date,
      discount: invoice.discount, total: invoice.total,
      status: invoice.status === 'Đã thanh toán' ? 'paid' as const : 'pending' as const,
    }));
    data.salesInvoiceDetails = (legacy.invoices ?? []).map((invoice) => ({
      id: `${idFor('invoice', invoice.id)}-detail-1`,
      salesInvoiceId: idFor('invoice', invoice.id),
      vehicleId: vehicleIds.get(invoice.bikeId) ?? idFor('vehicle', invoice.bikeId),
      quantity: invoice.quantity, unitPrice: invoice.unitPrice,
      lineTotal: invoice.quantity * invoice.unitPrice,
    }));
    data.importReceipts = (legacy.purchases ?? []).map((purchase) => ({
      id: idFor('receipt', purchase.id), receiptNumber: purchase.id,
      supplierId: supplierIds.get(purchase.supplierId) ?? idFor('supplier', purchase.supplierId),
      employeeId: employeeIdFor(purchase.employee), receivedAt: purchase.date,
      total: purchase.total, status: 'confirmed' as const,
    }));
    data.importReceiptDetails = (legacy.purchases ?? []).map((purchase) => ({
      id: `${idFor('receipt', purchase.id)}-detail-1`,
      importReceiptId: idFor('receipt', purchase.id),
      vehicleId: vehicleIds.get(purchase.bikeId) ?? idFor('vehicle', purchase.bikeId),
      quantity: purchase.quantity, unitCost: purchase.unitCost,
      lineTotal: purchase.total,
    }));
    return data;
  }
}

interface LegacyStoreData {
  brands?: string[];
  categories?: string[];
  bikes: Array<{ id: string; name: string; brand: string; category: string; displacement: number; year: number; color: string; cost: number; price: number; stock: number; image: string }>;
  customers?: Array<{ id: string; name: string; phone: string; email: string; address: string; registeredAt: string }>;
  suppliers?: Array<{ id: string; name: string; contact: string; phone: string; email: string; address: string }>;
  invoices?: Array<{ id: string; customerId: string; bikeId: string; quantity: number; unitPrice: number; discount: number; total: number; date: string; employee: string; status: string }>;
  purchases?: Array<{ id: string; supplierId: string; bikeId: string; quantity: number; unitCost: number; total: number; date: string; employee: string }>;
}

export const localStorageRepository = new LocalStorageRepository();