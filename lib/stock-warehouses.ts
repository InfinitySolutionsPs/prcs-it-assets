export const STOCK_WAREHOUSES = [
  "مستودع غزة",
  "مستودع خانيونس",
  "مستودع المقر العام - الضفة",
] as const;

export type StockWarehouse = (typeof STOCK_WAREHOUSES)[number];
