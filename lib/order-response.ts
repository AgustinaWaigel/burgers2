import { NextResponse } from "next/server";
import { orderErrors } from "@/lib/order-contract";
import { getStoreSettings } from "@/lib/repositories/settings";
export async function orderErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "ORDER_FAILED";
  const known = Object.hasOwn(orderErrors, message);
  if (!known) console.error("Order request failed", error);
  const settings = ["INVALID_PAYMENT_METHOD", "INVALID_DELIVERY_ZONE", "DELIVERY_UNAVAILABLE"].includes(message) ? await getStoreSettings() : null;
  return NextResponse.json({ error: known ? message : "ORDER_FAILED", ...(settings ? { paymentMethods: settings.paymentMethods, deliveryZones: settings.deliveryZones } : {}) }, { status: message === "PRICE_CHANGED" || message === "REQUEST_CONFLICT" ? 409 : known ? 400 : 503 });
}
