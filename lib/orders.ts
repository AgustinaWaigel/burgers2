import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getStoreAvailability } from "@/lib/store-hours";
import type { OrderInput, OrderQuote, OrderReceipt } from "@/lib/order-contract";
export type { OrderInput } from "@/lib/order-contract";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalize = (value: string) => value.trim().normalize("NFC").toLocaleLowerCase("es-AR");
function text(value: unknown, max: number, required = false): string {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new Error("INVALID_ORDER");
  return value.trim();
}
function ids(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 50 || value.some(id => typeof id !== "string" || !id || id.length > 100) || new Set(value).size !== value.length) throw new Error("INVALID_ITEM");
  return value;
}
export function parseOrderInput(value: unknown): OrderInput {
  if (!value || typeof value !== "object") throw new Error("INVALID_ORDER");
  const input = value as Record<string, unknown>;
  if (!["delivery", "pickup"].includes(String(input.deliveryMethod)) || !Array.isArray(input.items) || !input.items.length || input.items.length > 50) throw new Error("INVALID_ORDER");
  const customerPhone = text(input.customerPhone, 40, true);
  if (!/^[+\d\s().-]+$/.test(customerPhone) || customerPhone.replace(/\D/g, "").length < 8 || customerPhone.replace(/\D/g, "").length > 15) throw new Error("INVALID_ORDER");
  const cashAmount = input.cashAmount == null ? undefined : input.cashAmount;
  if (cashAmount !== undefined && (typeof cashAmount !== "number" || !Number.isFinite(cashAmount) || cashAmount < 0 || cashAmount > 99999999.99)) throw new Error("INVALID_ORDER");
  return {
    customerName: text(input.customerName, 100, true), customerPhone,
    deliveryMethod: input.deliveryMethod as OrderInput["deliveryMethod"],
    address: input.deliveryMethod === "delivery" ? text(input.address, 300) : "",
    deliveryZone: input.deliveryMethod === "delivery" ? text(input.deliveryZone, 100) : "",
    paymentMethod: text(input.paymentMethod, 100, true), cashAmount,
    notes: text(input.notes, 1000), promotionCode: text(input.promotionCode, 40).toUpperCase(),
    items: input.items.map(value => {
      if (!value || typeof value !== "object") throw new Error("INVALID_ITEM");
      if (!Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 99) throw new Error("INVALID_ITEM");
      return { productId: text(value.productId, 100, true), quantity: value.quantity, removedIngredientIds: ids(value.removedIngredientIds), extraIds: ids(value.extraIds), notes: text(value.notes, 500) };
    }),
  };
}

async function prepareOrder(raw: unknown) {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_NOT_CONFIGURED");
  const input = parseOrderInput(raw);
  if (input.deliveryMethod === "delivery" && !input.address) throw new Error("ADDRESS_REQUIRED");
  const settings = await prisma.storeSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!settings?.paymentMethods.length) throw new Error("PAYMENT_METHODS_NOT_CONFIGURED");
  const paymentMethod = settings.paymentMethods.find(method => normalize(method) === normalize(input.paymentMethod));
  if (!paymentMethod) throw new Error("INVALID_PAYMENT_METHOD");
  const availability = getStoreAvailability(settings.hours);
  if (availability.invalid) throw new Error("STORE_HOURS_INVALID");
  if (availability.open === false) throw new Error("STORE_CLOSED");
  const whatsappNumber = (settings.whatsappNumber || process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(whatsappNumber)) throw new Error("WHATSAPP_NOT_CONFIGURED");
  if (input.deliveryMethod === "delivery") {
    if (!settings.deliveryZones.length) throw new Error("DELIVERY_UNAVAILABLE");
    if (!settings.deliveryZones.includes(input.deliveryZone ?? "")) throw new Error("INVALID_DELIVERY_ZONE");
  }
  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map(item => item.productId) }, available: true, category: { active: true } },
    include: { ingredients: { where: { included: true, ingredient: { active: true } }, include: { ingredient: true } }, extras: { where: { extra: { active: true } }, include: { extra: true } } },
  });
  const pricedItems = input.items.map(item => {
    const product = products.find(product => product.id === item.productId);
    if (!product) throw new Error("PRODUCT_UNAVAILABLE");
    const removed = item.removedIngredientIds.map(id => {
      const link = product.ingredients.find(link => link.ingredientId === id && link.removable);
      if (!link) throw new Error("INVALID_REMOVAL");
      return link.ingredient.name;
    });
    const extras = item.extraIds.map(id => {
      const extra = product.extras.find(link => link.extraId === id)?.extra;
      if (!extra) throw new Error("INVALID_EXTRA");
      return extra;
    });
    const unitPrice = round(Number(product.price) + extras.reduce((sum, extra) => sum + Number(extra.price), 0));
    return { ...item, product, extras, removed, unitPrice, subtotal: round(unitPrice * item.quantity) };
  });
  const subtotal = round(pricedItems.reduce((sum, item) => sum + item.subtotal, 0));
  if (subtotal < Number(settings.minimumOrder)) throw new Error("MINIMUM_ORDER_NOT_MET");
  const now = new Date();
  const promotions = await prisma.promotion.findMany({ where: { active: true, startsAt: { lte: now }, endsAt: { gt: now }, code: input.promotionCode || null }, orderBy: { id: "asc" } });
  const discountFor = (promotion: typeof promotions[number]) => round(Math.min(subtotal, Math.max(0, promotion.kind === "PERCENTAGE" ? subtotal * Number(promotion.value) / 100 : promotion.kind === "FIXED" ? Number(promotion.value) : 0)));
  const promotion = promotions.reduce<typeof promotions[number] | null>((best, current) => !best || discountFor(current) > discountFor(best) ? current : best, null);
  if (input.promotionCode && !promotion) throw new Error("INVALID_PROMOTION");
  const discount = promotion ? discountFor(promotion) : 0;
  const deliveryCost = input.deliveryMethod === "delivery" ? Number(settings.deliveryCost) : 0;
  const total = round(subtotal - discount + deliveryCost);
  const cashAmount = normalize(paymentMethod).includes("efectivo") ? input.cashAmount ?? null : null;
  if (cashAmount !== null && cashAmount < total) throw new Error("INSUFFICIENT_CASH");
  const summary = {
    subtotal, discount, deliveryCost, total, promotionName: promotion?.name ?? null, promotionCode: promotion?.code ?? null,
    customerName: input.customerName, customerPhone: input.customerPhone, deliveryMethod: input.deliveryMethod,
    address: input.deliveryMethod === "delivery" ? input.address! : settings.address ?? "Retiro en el local",
    deliveryZone: input.deliveryZone ?? "", paymentMethod, cashAmount, notes: input.notes ?? "",
    items: pricedItems.map(item => ({ productName: item.product.name, quantity: item.quantity, subtotal: item.subtotal, extras: item.extras.map(extra => extra.name), removed: item.removed, notes: item.notes ?? "" })),
  };
  const quote: OrderQuote = { ...summary, token: hash(summary) };
  return { input, quote, pricedItems, whatsappNumber };
}

export async function quoteOrder(input: unknown): Promise<OrderQuote> { return (await prepareOrder(input)).quote; }

function buildReceipt(code: string, quote: OrderQuote, whatsappNumber: string): OrderReceipt {
  const money = (amount: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
  const details = quote.items.map(item => item.quantity + " × " + item.productName + " · " + money(item.subtotal) + (item.extras.length ? "\n  Extras: " + item.extras.join(", ") : "") + (item.removed.length ? "\n  Sin: " + item.removed.join(", ") : "") + (item.notes ? "\n  Nota: " + item.notes : "")).join("\n");
  const message = ["Pedido " + code, quote.customerName + " · " + quote.customerPhone, details,
    quote.deliveryMethod === "delivery" ? "Envío a " + quote.address + " · " + quote.deliveryZone : "Retiro: " + quote.address,
    "Pago: " + quote.paymentMethod, quote.cashAmount !== null ? "Paga con: " + money(quote.cashAmount) + " · Vuelto: " + money(round(quote.cashAmount - quote.total)) : "",
    "Subtotal: " + money(quote.subtotal), quote.discount ? "Descuento (" + quote.promotionName + "): −" + money(quote.discount) : "",
    "Envío: " + money(quote.deliveryCost), "Total: " + money(quote.total), quote.notes ? "Aclaraciones: " + quote.notes : ""].filter(Boolean).join("\n");
  return { code, total: quote.total, quote, whatsappUrl: "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message) };
}

export async function createValidatedOrder(raw: unknown, requestId: string, expectedQuote: string): Promise<OrderReceipt> {
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f]{64}$/.test(expectedQuote)) throw new Error("INVALID_ORDER");
  const input = parseOrderInput(raw);
  const requestHash = hash(input);
  const existing = async () => {
    const saved = await prisma.order.findUnique({ where: { requestId } });
    if (!saved) return null;
    if (saved.requestHash !== requestHash) throw new Error("REQUEST_CONFLICT");
    return saved.receipt as unknown as OrderReceipt;
  };
  const saved = await existing();
  if (saved) return saved;
  const { quote, pricedItems, whatsappNumber } = await prepareOrder(input);
  if (quote.token !== expectedQuote) throw new Error("PRICE_CHANGED");
  const code = "TN-" + randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const receipt = buildReceipt(code, quote, whatsappNumber);
  try {
    await prisma.order.create({ data: {
      code, requestId, requestHash, receipt: JSON.parse(JSON.stringify(receipt)) as Prisma.InputJsonValue,
      customerName: input.customerName, customerPhone: input.customerPhone, deliveryMethod: input.deliveryMethod,
      address: quote.address, deliveryZone: quote.deliveryZone || null, paymentMethod: quote.paymentMethod, cashAmount: quote.cashAmount,
      notes: input.notes, subtotal: quote.subtotal, deliveryCost: quote.deliveryCost, discount: quote.discount,
      promotionName: quote.promotionName, promotionCode: quote.promotionCode, total: quote.total,
      items: { create: pricedItems.map(item => ({ productId: item.product.id, productName: item.product.name, unitPrice: item.unitPrice, quantity: item.quantity, removedItems: item.removedIngredientIds, notes: item.notes, subtotal: item.subtotal, extras: { create: item.extras.map(extra => ({ extraId: extra.id, name: extra.name, unitPrice: extra.price })) } })) },
    } });
    return receipt;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await existing();
      if (duplicate) return duplicate;
    }
    throw error;
  }
}
