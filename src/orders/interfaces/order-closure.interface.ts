/**
 * Interface para os totais calculados da comanda
 */
export interface OrderTotals {
  subtotal: number;
  serviceCharge: number;
  taxAmount: number;
  finalTotal: number;
  serviceChargeRate: number;
  taxRate: number;
}

/**
 * Interface para o resumo de um item da comanda
 */
export interface OrderItemSummary {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string;
  status: string;
}

/**
 * Interface para o resumo completo da comanda
 */
export interface OrderSummary {
  orderId: string;
  tableNumber: number;
  waiterName: string;
  openedAt: Date;
  closedAt: Date;
  items: OrderItemSummary[];
  totals: OrderTotals;
  totalItems: number;
  totalQuantity: number;
}