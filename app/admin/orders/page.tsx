import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { signOut } from "@/app/admin/actions";
import { isOrderStatus, orderStatuses } from "@/lib/order-status";
import type { OrderReceipt } from "@/lib/order-contract";
import { OrderStatusForm } from "./status-form";
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const date = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; q?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const params = await searchParams;
  const status = params.status && isOrderStatus(params.status) ? params.status : "ACTIVE";
  const filter = params.status === "ALL" ? "ALL" : status;
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  const q = (params.q ?? "").trim().slice(0, 100);
  const where = { ...(filter === "ALL" ? {} : filter === "ACTIVE" ? { status: { in: ["PENDING", "PREPARING", "READY"] } } : { status: filter }), ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" as const } }, { customerName: { contains: q, mode: "insensitive" as const } }] } : {}) };
  const data = await Promise.all([
    prisma.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30, skip: (page - 1) * 30, include: { items: { include: { extras: true } } } }),
    prisma.order.count({ where }),
    prisma.ingredient.findMany({ select: { id: true, name: true } }),
  ]).catch(error => { console.error("Orders list failed", error); return null; });
  const link = (page: number) => "/admin/orders?" + new URLSearchParams({ status: filter, q, page: String(page) }).toString();
  return <main className="admin-shell management-page">
    <header className="admin-topbar"><Link href="/admin" className="admin-back">Volver al panel</Link><div className="admin-session"><span>{user.email}</span><form action={signOut}><button>Salir</button></form></div></header>
    <section className="admin-intro"><h1>Pedidos</h1><p>Confirmá la recepción con el cliente y acompañá cada pedido hasta la entrega.</p><Link href={link(page)} className="arrow-link">Actualizar lista</Link></section>
    <section className="burger-admin" aria-label="Gestión de pedidos">
      <form className="orders-filters" method="get"><label className="field"><span>Estado</span><select name="status" defaultValue={filter}><option value="ACTIVE">En curso</option><option value="ALL">Todos</option>{Object.entries(orderStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="field"><span>Código o cliente</span><input name="q" defaultValue={q} maxLength={100} /></label><button className="primary-action">Filtrar</button></form>
      {!data ? <p role="alert">No pudimos cargar los pedidos. <Link href={link(page)}>Volvé a intentar</Link>.</p> : <>
        <p>{data[1]} pedidos · Página {page} de {Math.max(1, Math.ceil(data[1] / 30))} · Horarios de Argentina</p>
        {!data[0].length && <div className="burger-empty"><h2>No hay pedidos con estos filtros</h2><p>Los pedidos registrados en la tienda aparecerán acá como pendientes.</p></div>}
        <div className="orders-list">{data[0].map(order => {
          const snapshot = (order.receipt as unknown as OrderReceipt | null)?.quote;
          const items = snapshot?.items ?? order.items.map(item => ({ productName: item.productName, quantity: item.quantity, subtotal: Number(item.subtotal), extras: item.extras.map(extra => extra.name), removed: item.removedItems.map(id => data[2].find(ingredient => ingredient.id === id)?.name ?? id), notes: item.notes }));
          return <article className="admin-order" key={order.id}>
            <header><h2>{order.code}</h2><span className="order-state" data-status={order.status}>{isOrderStatus(order.status) ? orderStatuses[order.status] : order.status}</span><time dateTime={order.createdAt.toISOString()}>{date.format(order.createdAt)}</time></header>
            <p><strong>{order.customerName}</strong> · <a href={"tel:" + order.customerPhone.replace(/[^+\d]/g, "")}>{order.customerPhone}</a></p>
            <p>{order.deliveryMethod === "delivery" ? "Envío: " + order.address + (order.deliveryZone ? " · " + order.deliveryZone : "") : "Retiro en el local"}</p>
            <ul className="order-summary-items">{items.map((item, index) => <li key={index}><div><strong>{item.quantity} × {item.productName}</strong><span>{money.format(item.subtotal)}</span></div>{item.extras.length > 0 && <p>Extras: {item.extras.join(", ")}</p>}{item.removed.length > 0 && <p>Sin: {item.removed.join(", ")}</p>}{item.notes && <p>Nota: {item.notes}</p>}</li>)}</ul>
            <dl className="order-totals"><div><dt>Subtotal</dt><dd>{money.format(Number(order.subtotal))}</dd></div>{Number(order.discount) > 0 && <div><dt>Descuento · {order.promotionName}{order.promotionCode && " · " + order.promotionCode}</dt><dd>−{money.format(Number(order.discount))}</dd></div>}<div><dt>Envío</dt><dd>{money.format(Number(order.deliveryCost))}</dd></div><div className="order-grand-total"><dt>Total · {order.paymentMethod}</dt><dd>{money.format(Number(order.total))}</dd></div></dl>
            {order.cashAmount !== null && <p>Paga con {money.format(Number(order.cashAmount))} · Vuelto {money.format(Number(order.cashAmount) - Number(order.total))}</p>}
            {order.notes && <p className="order-notes">Aclaraciones: {order.notes}</p>}
            {isOrderStatus(order.status) && <OrderStatusForm key={order.status} id={order.id} status={order.status} />}
          </article>;
        })}</div>
        <nav className="orders-pagination" aria-label="Páginas de pedidos">{page > 1 && <Link href={link(page - 1)}>Anterior</Link>}{page * 30 < data[1] && <Link href={link(page + 1)}>Siguiente</Link>}</nav>
      </>}
    </section>
  </main>;
}
