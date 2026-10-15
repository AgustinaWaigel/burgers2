export const orderStatuses = { PENDING: "Pendiente", PREPARING: "En preparación", READY: "Listo", DELIVERED: "Entregado", CANCELLED: "Cancelado" } as const;
export type OrderStatus = keyof typeof orderStatuses;
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"], READY: ["DELIVERED", "CANCELLED"], DELIVERED: [], CANCELLED: [],
};
export function isOrderStatus(value: string): value is OrderStatus { return Object.hasOwn(orderStatuses, value); }
