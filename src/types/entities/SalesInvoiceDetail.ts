export interface SalesInvoiceDetail {
  id: string;
  salesInvoiceId: string;
  vehicleId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}