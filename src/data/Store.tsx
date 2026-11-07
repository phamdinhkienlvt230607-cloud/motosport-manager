import { useEffect, useRef, useState, type ReactNode } from 'react';
import { initialData } from './normalizedSeed';
import { localStorageRepository } from './LocalStorageRepository';
import { StoreContext, type StoreContextValue } from './storeContext';
import { motoSportService } from '../services/motoSportService';
import type { StoreData } from '../types/store-data';
import type { Customer, Supplier } from '../types/entities';
import type { ImportReceiptView, SalesInvoiceView, VehicleCatalogItem } from '../types/views';

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function resolveEmployeeId(data: StoreData) {
  return data.employees.find((employee) => employee.active)?.id ?? '';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => localStorageRepository.load(initialData));
  const dataRef = useRef(data);

  useEffect(() => {
    localStorageRepository.save(data);
  }, [data]);

  function commit(update: (current: StoreData) => StoreData) {
    const next = update(dataRef.current);
    dataRef.current = next;
    setData(next);
  }

  const brands = data.vehicleBrands.map((brand) => brand.name);
  const categories = data.vehicleCategories.map((category) => category.name);
  const vehicleCatalog: VehicleCatalogItem[] = data.vehicles.map((vehicle) => ({
    ...vehicle,
    brand: data.vehicleBrands.find((brand) => brand.id === vehicle.brandId)?.name ?? 'Chưa phân loại',
    category: data.vehicleCategories.find((category) => category.id === vehicle.categoryId)?.name ?? 'Chưa phân loại',
  }));
  const invoices: SalesInvoiceView[] = data.salesInvoices.map((invoice) => {
    const details = data.salesInvoiceDetails.filter((detail) => detail.salesInvoiceId === invoice.id).map((detail) => {
      const vehicle = vehicleCatalog.find((item) => item.id === detail.vehicleId);
      return { ...detail, vehicleName: vehicle?.name ?? 'Mẫu xe đã xóa', vehicleCode: vehicle?.code ?? '' };
    });
    const employee = data.employees.find((item) => item.id === invoice.employeeId);
    return {
      ...invoice,
      id: invoice.invoiceNumber,
      recordId: invoice.id,
      date: invoice.issuedAt,
      employeeName: employee?.name ?? 'Nhân viên đã xóa',
      employee: employee?.name ?? 'Nhân viên đã xóa',
      customer: data.customers.find((item) => item.id === invoice.customerId),
      status: invoice.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán',
      bikeId: details[0]?.vehicleId ?? '',
      quantity: details.reduce((sum, item) => sum + item.quantity, 0),
      unitPrice: details[0]?.unitPrice ?? 0,
      details,
    };
  });
  const purchases: ImportReceiptView[] = data.importReceipts.map((receipt) => {
    const details = data.importReceiptDetails.filter((detail) => detail.importReceiptId === receipt.id).map((detail) => {
      const vehicle = vehicleCatalog.find((item) => item.id === detail.vehicleId);
      return { ...detail, vehicleName: vehicle?.name ?? 'Mẫu xe đã xóa', vehicleCode: vehicle?.code ?? '' };
    });
    const employee = data.employees.find((item) => item.id === receipt.employeeId);
    return {
      ...receipt,
      id: receipt.receiptNumber,
      recordId: receipt.id,
      date: receipt.receivedAt,
      employeeName: employee?.name ?? 'Nhân viên đã xóa',
      employee: employee?.name ?? 'Nhân viên đã xóa',
      supplier: data.suppliers.find((item) => item.id === receipt.supplierId),
      bikeId: details[0]?.vehicleId ?? '',
      quantity: details.reduce((sum, item) => sum + item.quantity, 0),
      unitCost: details[0]?.unitCost ?? 0,
      details,
    };
  });

  const value: StoreContextValue = {
    data,
    bikes: vehicleCatalog,
    brands,
    categories,
    invoices,
    purchases,
    customers: data.customers,
    suppliers: data.suppliers,
    vehicleBrands: data.vehicleBrands,
    vehicleCategories: data.vehicleCategories,
    saveVehicle: (vehicle) => commit((current) => motoSportService.saveVehicle(current, vehicle)),
    removeVehicle: (id) => commit((current) => motoSportService.removeVehicle(current, id)),
    saveCustomer: (customer: Customer) => commit((current) => motoSportService.saveCustomer(current, customer)),
    removeCustomer: (id) => commit((current) => motoSportService.removeCustomer(current, id)),
    saveSupplier: (supplier: Supplier) => commit((current) => motoSportService.saveSupplier(current, supplier)),
    removeSupplier: (id) => commit((current) => motoSportService.removeSupplier(current, id)),
    saveCategory: (type, oldValue, value) => commit((current) => {
      if (type === 'brand') {
        const existing = current.vehicleBrands.find((item) => item.name === oldValue);
        return motoSportService.saveBrand(current, { id: existing?.id ?? createId('brand'), name: value });
      }
      const existing = current.vehicleCategories.find((item) => item.name === oldValue);
      return motoSportService.saveVehicleCategory(current, { id: existing?.id ?? createId('category'), name: value });
    }),
    removeCategory: (type, value) => commit((current) => {
      if (type === 'brand') {
        const brand = current.vehicleBrands.find((item) => item.name === value);
        return brand ? motoSportService.removeBrand(current, brand.id) : current;
      }
      const category = current.vehicleCategories.find((item) => item.name === value);
      return category ? motoSportService.removeVehicleCategory(current, category.id) : current;
    }),
    createSalesInvoice: (input) => commit((current) => motoSportService.createSalesInvoice(current, { ...input, employeeId: resolveEmployeeId(current) })),
    createImportReceipt: (input) => commit((current) => motoSportService.createImportReceipt(current, { ...input, employeeId: resolveEmployeeId(current) })),
    resetDemo: () => commit(() => structuredClone(initialData)),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}