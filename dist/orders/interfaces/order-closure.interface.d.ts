export interface OrderTotals {
    subtotal: number;
    serviceCharge: number;
    taxAmount: number;
    finalTotal: number;
    serviceChargeRate: number;
    taxRate: number;
}
export interface OrderItemSummary {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    specialInstructions?: string;
    status: string;
}
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
