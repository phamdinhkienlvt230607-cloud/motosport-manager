import { createContext } from 'react';
import type { Customer, Supplier } from '../types/entities';
import type { StoreData } from '../types/store-data';
import type { ImportReceiptInput, SaleInvoiceInput } from '../services/motoSportService';
import type { Vehicle } from '../types/entities';
import type { ImportReceiptView, SalesInvoiceView, VehicleCatalogItem } from '../types/views';

export interface StoreContextValue {
  data: StoreData;
  bikes: VehicleCatalogItem[];
  brands: string[];
  categories: string[];
  invoices: SalesInvoiceView[];
  purchases: ImportReceiptView[];
  customers: StoreData['customers'];
  suppliers: StoreData['suppliers'];
  vehicleBrands: StoreData['vehicleBrands'];
  vehicleCategories: StoreData['vehicleCategories'];
  saveVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: string) => void;
  saveCustomer: (customer: Customer) => void;
  removeCustomer: (id: string) => void;
  saveSupplier: (supplier: Supplier) => void;
  removeSupplier: (id: string) => void;
  saveCategory: (type: 'brand' | 'category', oldValue: string, value: string) => void;
  removeCategory: (type: 'brand' | 'category', value: string) => void;
  createSalesInvoice: (input: Omit<SaleInvoiceInput, 'employeeId'>) => void;
  createImportReceipt: (input: Omit<ImportReceiptInput, 'employeeId'>) => void;
  resetDemo: () => void;
}

export const StoreContext = createContext<StoreContextValue | null>(null);