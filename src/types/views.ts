import type {
  Customer,
  ImportReceipt,
  ImportReceiptDetail,
  SalesInvoice,
  SalesInvoiceDetail,
  Supplier,
  Vehicle,
  VehicleBrand,
  VehicleCategory,
} from './entities';

export interface VehicleCatalogItem extends Vehicle {
  brand: string;
  category: string;
}

export interface SalesInvoiceLineView extends SalesInvoiceDetail {
  vehicleName: string;
  vehicleCode: string;
}

export interface SalesInvoiceView extends Omit<SalesInvoice, 'status' | 'id'> {
  id: string;
  recordId: string;
  customer?: Customer;
  employee: string;
  bikeId: string;
  quantity: number;
  unitPrice: number;
  date: string;
  employeeName: string;
  status: 'Đã thanh toán' | 'Chờ thanh toán';
  details: SalesInvoiceLineView[];
}

export interface ImportReceiptLineView extends ImportReceiptDetail {
  vehicleName: string;
  vehicleCode: string;
}

export interface ImportReceiptView extends Omit<ImportReceipt, 'id'> {
  id: string;
  recordId: string;
  supplier?: Supplier;
  employee: string;
  bikeId: string;
  quantity: number;
  unitCost: number;
  date: string;
  employeeName: string;
  details: ImportReceiptLineView[];
}

export interface VehicleCategoryView extends VehicleCategory {
  vehicleCount: number;
}

export interface VehicleBrandView extends VehicleBrand {
  vehicleCount: number;
}