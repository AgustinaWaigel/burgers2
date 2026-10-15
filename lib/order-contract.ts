export type OrderInput = {
  customerName: string; customerPhone: string; deliveryMethod: "delivery" | "pickup";
  address?: string; deliveryZone?: string; paymentMethod: string; cashAmount?: number;
  notes?: string; promotionCode?: string;
  items: { productId: string; quantity: number; removedIngredientIds: string[]; extraIds: string[]; notes?: string }[];
};
export type OrderQuote = {
  token: string; subtotal: number; deliveryCost: number; discount: number; total: number;
  promotionName: string | null; promotionCode: string | null;
  customerName: string; customerPhone: string; deliveryMethod: "delivery" | "pickup";
  address: string; deliveryZone: string; paymentMethod: string; cashAmount: number | null; notes: string;
  items: { productName: string; quantity: number; subtotal: number; extras: string[]; removed: string[]; notes: string }[];
};
export type OrderReceipt = { code: string; total: number; whatsappUrl: string; quote: OrderQuote };
export const orderErrors: Record<string, string> = {
  INVALID_ORDER: "Revisá tu nombre, teléfono y los datos del pedido.",
  INVALID_ITEM: "Revisá las cantidades del carrito (de 1 a 99 por producto).",
  ADDRESS_REQUIRED: "Ingresá la dirección de entrega.",
  PRODUCT_UNAVAILABLE: "Un producto ya no está disponible. Volvé a la carta y revisá el carrito.",
  INVALID_EXTRA: "Un extra ya no está disponible. Volvé a personalizar el producto.",
  INVALID_REMOVAL: "Cambió un ingrediente. Volvé a personalizar el producto.",
  PAYMENT_METHODS_NOT_CONFIGURED: "El comercio todavía no tiene formas de pago disponibles.",
  INVALID_PAYMENT_METHOD: "Las formas de pago cambiaron. Elegí una de las opciones actualizadas.",
  MINIMUM_ORDER_NOT_MET: "El subtotal no alcanza el pedido mínimo del comercio (antes de descuentos y sin envío).",
  STORE_CLOSED: "El comercio está cerrado. Tu carrito queda guardado para cuando abra.",
  STORE_HOURS_INVALID: "El comercio está actualizando sus horarios. Volvé a intentar más tarde.",
  DELIVERY_UNAVAILABLE: "El envío no está disponible. Podés elegir retiro en el local.",
  INVALID_DELIVERY_ZONE: "Elegí una de las zonas de entrega disponibles. Si tu zona no figura, elegí retiro.",
  INVALID_PROMOTION: "El cupón no existe, está inactivo o venció. Revisalo o quitá el código para continuar.",
  INSUFFICIENT_CASH: "El importe con el que pagás debe cubrir el total del pedido.",
  PRICE_CHANGED: "El total o los datos del pedido cambiaron. Revisá el resumen actualizado antes de confirmar.",
  WHATSAPP_NOT_CONFIGURED: "El comercio todavía no tiene WhatsApp disponible para confirmar pedidos.",
  REQUEST_CONFLICT: "Este intento corresponde a otro pedido. Cerrá y volvé a abrir el formulario.",
  ORDER_FAILED: "No pudimos confirmar el pedido. Volvé a intentar; no se duplicará este envío.",
};
