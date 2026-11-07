export type PaymentStatus = 'paid' | 'pending' | 'cancelled';

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  employeeId: string;
  issuedAt: string;
  discount: number;
  total: number;
  status: PaymentStatus;
}