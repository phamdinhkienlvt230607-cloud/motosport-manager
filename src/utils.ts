export const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const formatCompactMoney = (value: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} tr`;
export const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
export const stockLabel = (stock: number) => stock === 0 ? 'Hết hàng' : stock <= 2 ? 'Sắp hết hàng' : 'Đang kinh doanh';
export const makeId = (prefix: string, records: { id: string }[]) => {
  const next = Math.max(0, ...records.map((item) => Number(item.id.split('-').at(-1)) || 0)) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
};
export const createStableId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID()}`;