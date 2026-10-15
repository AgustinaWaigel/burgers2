import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/actions";
import { isSection, sections } from "@/lib/admin/sections";
import { getAdminRecords } from "@/lib/repositories/admin";
import { AdminModal } from "@/components/admin/dialog";
import { RecordForm, DeleteRecord } from "./record-form";

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ edit?: string; saved?: string; removed?: string }>;
}) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const query = await searchParams;
  const config = sections[section];
  const records = await getAdminRecords(section).catch((error) => {
    console.error("Admin list failed", error);
    return null;
  });
  const settings = section === "settings" ? records?.[0] : undefined;
  const current = records?.find((row) => row.id === query.edit);
  const showForm = query.edit === "new" || Boolean(current);
  // Configuration has a single record: opening its creation link edits it if it already exists.
  const editing = section === "settings" ? settings : current;
  const base = `/admin/${section}`;
  return (
    <main className="admin-shell management-page">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-back">
          Volver al panel
        </Link>
        <div className="admin-session">
          <span>{user.email}</span>
          <form action={signOut}>
            <button type="submit">Salir</button>
          </form>
        </div>
      </header>
      <section className="admin-intro">
        <h1>{config.title}</h1>
        <p>{config.description}</p>
        <nav className="admin-nav" aria-label="Administración">
          <Link href="/admin/orders">Pedidos</Link>
          <Link href="/admin/products">Productos</Link>
          {Object.entries(sections).map(([key, item]) => (
            <Link
              key={key}
              href={`/admin/${key}`}
              aria-current={key === section ? "page" : undefined}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </section>
      <section
        className="burger-admin"
        aria-label={`Gestión de ${config.title.toLowerCase()}`}
      >
        {query.saved && (
          <p role="status" className="burger-notice">
            Los cambios se guardaron correctamente.
          </p>
        )}
        {query.removed && (
          <p role="status" className="burger-notice">
            {query.removed === "archived"
              ? "Registro desactivado. Se conservaron sus relaciones e historial."
              : "Registro eliminado."}
          </p>
        )}
        {!records ? (
          <p className="form-status" role="alert">
            No pudimos cargar los datos. Revisá la conexión y{" "}
            <Link href={base}>volvé a intentar</Link>.
          </p>
        ) : (
          <>
            {query.edit && !showForm && (
              <p role="alert" className="form-status">
                El registro que buscabas ya no existe.
              </p>
            )}
            <div className="burger-toolbar">
              <p>
                {section === "settings"
                  ? settings
                    ? settings.name
                    : "Tu comercio todavía no está configurado"
                  : `${records.length} ${records.length === 1 ? "registro" : "registros"}`}
              </p>
              <Link
                scroll={false}
                className="primary-action"
                href={`${base}?edit=${settings?.id ?? "new"}`}
              >
                {settings ? "Editar configuración" : config.create}
              </Link>
            </div>
            {section === "settings" ? (
              settings && (
                <>
                  <dl className="settings-summary">
                    {[
                      ["WhatsApp", settings.values.whatsappNumber],
                      ["Dirección", settings.values.address || "Sin dirección"],
                      ["Envío", `$ ${settings.values.deliveryCost}`],
                      ["Pedido mínimo", `$ ${settings.values.minimumOrder}`],
                      ["Formas de pago", settings.values.paymentMethods],
                      [
                        "Zonas de entrega",
                        settings.values.deliveryZones || "Sin zonas cargadas",
                      ],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="admin-danger">
                    <DeleteRecord
                      section={section}
                      id={settings.id}
                      name={settings.name}
                    />
                  </div>
                </>
              )
            ) : !records.length ? (
              <div className="burger-empty">
                <h2>Todavía no hay {config.title.toLowerCase()}</h2>
                <p>Usá «{config.create}» para empezar.</p>
              </div>
            ) : (
              <ul className="burger-list">
                {records.map((row) => (
                  <li key={row.id} className="management-item">
                    <div className="burger-info">
                      <h2>{row.name}</h2>
                      {row.values.description && (
                        <p>{row.values.description}</p>
                      )}
                      <p>
                        {row.values.active ? "Activo" : "Inactivo"}
                        {section === "categories" &&
                          ` · Orden ${row.values.sortOrder}`}
                        {section === "extras" &&
                          ` · ${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(row.values.price))}`}
                      </p>
                      {section === "promotions" && (
                        <p>
                          {row.values.kind === "PERCENTAGE"
                            ? `${row.values.value}%`
                            : `$ ${row.values.value}`}{" "}
                          · {String(row.values.startsAt).replace("T", " ")} a{" "}
                          {String(row.values.endsAt).replace("T", " ")}{" "}
                          (Argentina)
                          {row.values.code && ` · Código ${row.values.code}`}
                        </p>
                      )}
                    </div>
                    <div className="burger-tools">
                      <Link
                        scroll={false}
                        className="burger-edit"
                        href={`${base}?edit=${row.id}`}
                        aria-label={`Editar ${row.name}`}
                      >
                        Editar
                      </Link>
                      <DeleteRecord
                        section={section}
                        id={row.id}
                        name={row.name}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showForm && (
              <AdminModal
                key={editing?.id ?? "new"}
                title={editing ? `Editar ${config.singular}` : config.create}
                closeHref={base}
              >
                <RecordForm
                  section={section}
                  id={editing?.id}
                  initial={editing?.values}
                />
              </AdminModal>
            )}
          </>
        )}
      </section>
    </main>
  );
}
