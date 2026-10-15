"use client";
import { useRef, useState } from "react";
import { DialogFrame } from "@/components/store-dialog";
import { orderErrors, type OrderInput, type OrderQuote, type OrderReceipt } from "@/lib/order-contract";
import type { CartItem, StoreSettingsData } from "@/lib/types";
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
export type SavedReceipt = Pick<OrderReceipt, "code" | "total" | "whatsappUrl">;
export function readSavedReceipt(value: unknown): SavedReceipt | null {
  if (!value || typeof value !== "object") return null;
  const data = value as SavedReceipt;
  if (typeof data.code !== "string" || typeof data.total !== "number" || !Number.isFinite(data.total) || typeof data.whatsappUrl !== "string" || !/^https:\/\/wa\.me\/\d{8,15}\?text=/.test(data.whatsappUrl)) return null;
  return { code: data.code, total: data.total, whatsappUrl: data.whatsappUrl };
}
export function ReceiptModal({ receipt, onClose }: { receipt: SavedReceipt; onClose: () => void }) {
  return <DialogFrame onClose={onClose}>{close => <section className="modal checkout" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
    <button className="close-button" onClick={close} aria-label="Cerrar comprobante">×</button>
    <h2 id="receipt-title" data-dialog-heading tabIndex={-1}>Pedido registrado</h2>
    <p className="receipt-code">{receipt.code}</p>
    <p>Total: <strong>{money.format(receipt.total)}</strong></p>
    <p>Falta enviar el mensaje por WhatsApp para coordinar con el local. El pedido queda pendiente de confirmación del comercio.</p>
    <a className="primary-action wide" href={receipt.whatsappUrl} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp ↗</a>
    <p className="muted">Si WhatsApp no abre, usá este enlace otra vez. No genera otro pedido. El comprobante queda disponible en esta tienda desde este navegador.</p>
    <button className="arrow-link" onClick={close}>Volver a la carta</button>
  </section>}</DialogFrame>;
}
function QuoteSummary({ quote }: { quote: OrderQuote }) {
  return <div className="order-summary">
    <ul className="order-summary-items">{quote.items.map((item, index) => <li key={index}>
      <div><strong>{item.quantity} × {item.productName}</strong><span>{money.format(item.subtotal)}</span></div>
      {item.extras.length > 0 && <p>Extras: {item.extras.join(", ")}</p>}
      {item.removed.length > 0 && <p>Sin: {item.removed.join(", ")}</p>}
      {item.notes && <p>Nota: {item.notes}</p>}
    </li>)}</ul>
    <dl className="order-totals"><div><dt>Subtotal</dt><dd>{money.format(quote.subtotal)}</dd></div>
      {quote.discount > 0 && <div><dt>{quote.promotionName}{quote.promotionCode ? " · " + quote.promotionCode : ""}</dt><dd>−{money.format(quote.discount)}</dd></div>}
      <div><dt>{quote.deliveryMethod === "delivery" ? "Envío" : "Retiro en el local"}</dt><dd>{money.format(quote.deliveryCost)}</dd></div>
      <div className="order-grand-total"><dt>Total</dt><dd>{money.format(quote.total)}</dd></div>
    </dl>
    <p><strong>{quote.customerName}</strong> · {quote.customerPhone}</p>
    <p>{quote.deliveryMethod === "delivery" ? "Envío: " : "Retiro: "}{quote.address}{quote.deliveryZone && " · " + quote.deliveryZone}</p>
    <p>Pago: {quote.paymentMethod}{quote.cashAmount !== null && " · Pagás con " + money.format(quote.cashAmount) + " · Vuelto " + money.format(quote.cashAmount - quote.total)}</p>
    {quote.notes && <p>Aclaraciones: {quote.notes}</p>}
  </div>;
}
export function CheckoutModal({ cart, settings, onClose, onSuccess }: { cart: CartItem[]; settings: StoreSettingsData | null; onClose: () => void; onSuccess: (receipt: SavedReceipt) => void }) {
  const [status, setStatus] = useState("");
  const [delivery, setDelivery] = useState<"delivery" | "pickup">(settings?.deliveryZones.length ? "delivery" : "pickup");
  const [zones, setZones] = useState(settings?.deliveryZones ?? []);
  const [paymentMethods, setPaymentMethods] = useState(settings?.paymentMethods ?? []);
  const [payment, setPayment] = useState(settings?.paymentMethods[0] ?? "");
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", zone: "", notes: "", cashAmount: "", coupon: "" });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const payload: OrderInput = {
    customerName: form.name, customerPhone: form.phone, deliveryMethod: delivery, address: form.address, deliveryZone: form.zone,
    paymentMethod: payment, cashAmount: payment.toLowerCase().includes("efectivo") && form.cashAmount ? Number(form.cashAmount.replace(",", ".")) : undefined,
    notes: form.notes, promotionCode: form.coupon,
    items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, removedIngredientIds: item.removedIngredientIds, extraIds: item.extras.map(extra => extra.id), notes: item.notes })),
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !paymentMethods.length) return;
    busy.current = true; setSubmitting(true); setStatus("");
    const confirming = Boolean(quote);
    try {
      const serialized = JSON.stringify(payload);
      if (confirming && attempt.current?.payload !== serialized) {
        let saved: { payload: string; id: string } | null = null;
        try { saved = JSON.parse(sessionStorage.getItem("turno-noche-order-attempt") ?? "null"); } catch {}
        attempt.current = saved?.payload === serialized && typeof saved.id === "string" ? saved : { payload: serialized, id: crypto.randomUUID() };
        try { sessionStorage.setItem("turno-noche-order-attempt", JSON.stringify(attempt.current)); } catch {}
      }
      const response = await fetch(confirming ? "/api/orders" : "/api/orders/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...(confirming ? { requestId: attempt.current!.id, quoteToken: quote!.token } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (Array.isArray(result.paymentMethods)) { setPaymentMethods(result.paymentMethods); if (!result.paymentMethods.includes(payment)) setPayment(""); }
        if (Array.isArray(result.deliveryZones)) { setZones(result.deliveryZones); if (!result.deliveryZones.includes(form.zone)) update("zone", ""); }
        // Keep the confirmed summary on an uncertain server failure so a retry uses the same request ID.
        if (response.status < 500) setQuote(null);
        setStatus(orderErrors[result.error] ?? orderErrors.ORDER_FAILED);
        return;
      }
      if (confirming) {
        const receipt = readSavedReceipt(result);
        if (!receipt) throw new Error("Invalid receipt");
        try { sessionStorage.removeItem("turno-noche-order-attempt"); } catch {}
        onSuccess(receipt);
      } else {
        setQuote(result as OrderQuote);
        setStatus("Revisá el detalle. Todavía no registramos el pedido.");
      }
    } catch {
      setStatus(confirming ? "No pudimos confirmar la respuesta. Volvé a confirmar: el mismo intento no se duplica." : "No pudimos calcular el total. Revisá tu conexi?n y volvé a intentar.");
    } finally { busy.current = false; setSubmitting(false); }
  }
  return <DialogFrame onClose={onClose}>{close => <section className="modal checkout" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <button className="close-button" onClick={close} disabled={submitting} aria-label="Cerrar checkout">×</button>
    <h2 id="checkout-title" data-dialog-heading tabIndex={-1}>{quote ? "Revisá tu pedido" : "Completá tus datos"}</h2>
    <form onSubmit={submit} aria-busy={submitting}>
      {quote ? <><QuoteSummary quote={quote} /><button className="arrow-link" type="button" disabled={submitting} onClick={() => { setQuote(null); setStatus(""); }}>Editar datos o cupón</button></> : <fieldset className="checkout-fields" disabled={submitting}>
        <legend className="sr-only">Datos del pedido</legend>
        <div className="form-grid">
          <label className="field"><span>Nombre *</span><input required autoComplete="name" maxLength={100} value={form.name} onChange={e => update("name", e.target.value)} /></label>
          <label className="field"><span>Teléfono *</span><input required type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={e => update("phone", e.target.value)} /></label>
        </div>
        <fieldset><legend>Modalidad *</legend>
          <label><input type="radio" name="delivery" checked={delivery === "delivery"} disabled={!zones.length} onChange={() => setDelivery("delivery")} /> Envío a domicilio</label>
          <label><input type="radio" name="delivery" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} /> Retiro</label>
        </fieldset>
        {!zones.length && <p className="muted">Por ahora, solo retiro en el local.</p>}
        {delivery === "delivery" ? <>
          <label className="field"><span>Zona de entrega *</span><select required value={form.zone} onChange={e => update("zone", e.target.value)}><option value="">Elegí tu zona</option>{zones.map(zone => <option key={zone}>{zone}</option>)}</select></label>
          <p className="muted">Si tu zona no figura, elegí retiro. Envío: {money.format(settings?.deliveryCost ?? 0)}.</p>
          <label className="field"><span>Dirección, número y departamento *</span><input required autoComplete="street-address" maxLength={300} value={form.address} onChange={e => update("address", e.target.value)} /></label>
        </> : <p>Retiro: {settings?.address || "Consultá la dirección con el local."}</p>}
        <label className="field"><span>Método de pago *</span><select required value={payment} onChange={e => setPayment(e.target.value)}><option value="">Elegí un método</option>{paymentMethods.map(method => <option key={method}>{method}</option>)}</select></label>
        {!paymentMethods.length && <p role="status">El comercio todavía no tiene formas de pago disponibles. Tu carrito queda guardado.</p>}
        {payment.toLowerCase().includes("efectivo") && <label className="field"><span>¿Con cuánto pagás? (opcional)</span><input inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={form.cashAmount} onChange={e => update("cashAmount", e.target.value)} /></label>}
        <label className="field"><span>Cupón (opcional)</span><input maxLength={40} autoCapitalize="characters" value={form.coupon} onChange={e => update("coupon", e.target.value)} /><small>Sin cupón aplicamos la mejor promoción automática vigente. No se acumulan.</small></label>
        <label className="field"><span>Aclaraciones generales</span><textarea maxLength={1000} value={form.notes} onChange={e => update("notes", e.target.value)} /></label>
        {(settings?.minimumOrder ?? 0) > 0 && <p className="muted">Pedido mínimo: {money.format(settings!.minimumOrder)}, antes de descuentos y sin envío.</p>}
      </fieldset>}
      {status && <p className="form-status" role="status">{status}</p>}
      <button className="primary-action wide" type="submit" disabled={!paymentMethods.length || submitting || !cart.length}>{submitting ? "Procesando…" : quote ? "Confirmar pedido · " + money.format(quote.total) : "Revisar pedido"}</button>
    </form>
  </section>}</DialogFrame>;
}
