import type {
  Customer,
  Employee,
  ImportReceipt,
  ImportReceiptDetail,
  SalesInvoice,
  SalesInvoiceDetail,
  Supplier,
  Vehicle,
  VehicleBrand,
  VehicleCategory,
} from './entities';

export interface StoreData {
  vehicles: Vehicle[];
  vehicleBrands: VehicleBrand[];
  vehicleCategories: VehicleCategory[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  importReceipts: ImportReceipt[];
  importReceiptDetails: ImportReceiptDetail[];
  salesInvoices: SalesInvoice[];
  salesInvoiceDetails: SalesInvoiceDetail[];
}