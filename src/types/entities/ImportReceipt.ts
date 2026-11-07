export type ImportReceiptStatus = 'confirmed' | 'cancelled';

export interface ImportReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  employeeId: string;
  receivedAt: string;
  total: number;
  status: ImportReceiptStatus;
}