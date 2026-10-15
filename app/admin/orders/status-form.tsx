"use client";
import { useActionState } from "react";
import { updateOrderStatus } from "./actions";
import { orderStatuses, orderTransitions, type OrderStatus } from "@/lib/order-status";
export function OrderStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const [state, action, pending] = useActionState(updateOrderStatus, {});
  const options = orderTransitions[status];
  if (!options.length) return null;
  return <form action={action} className="order-status-form" aria-busy={pending}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="current" value={status} />
    <label className="field"><span>Actualizar estado</span><select name="status" required defaultValue="" disabled={pending}><option value="" disabled>Elegí el próximo estado</option>{options.map(option => <option key={option} value={option}>{orderStatuses[option]}</option>)}</select></label>
    <button className="primary-action" disabled={pending}>{pending ? "Guardando…" : "Guardar estado"}</button>
    {state.error && <p className="form-status" role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}
  </form>;
}
