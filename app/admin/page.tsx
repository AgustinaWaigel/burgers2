import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/actions";

const sections = [
  { title: "Pedidos", path: "orders", description: "Recepci?n, preparación y entrega de pedidos." },
  { title: "Productos", path: "products", description: "Hamburguesas, precios, fotos y personalización." },
  { title: "Categorías", path: "categories", description: "Organización y orden de la carta." },
  { title: "Ingredientes", path: "ingredients", description: "Ingredientes incluidos y opciones para quitar." },
  { title: "Extras", path: "extras", description: "Adicionales y sus precios." },
  { title: "Promociones", path: "promotions", description: "Códigos, valores y vigencias." },
  { title: "Configuración", path: "settings", description: "Datos del comercio, envíos y formas de pago." },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return <main className="admin-shell">
    <header className="admin-topbar"><Link href="/" className="admin-back">Volver a la tienda</Link><div className="admin-session"><span>{user.email}</span><form action={signOut}><button type="submit">Salir</button></form></div></header>
    <section className="admin-intro"><h1>Control de<br /><em>cocina.</em></h1><p>Administrá la carta y los datos de tu comercio.</p></section>
    <section className="admin-grid">{sections.map(section => <article className="admin-section" key={section.path}><h2>{section.title}</h2><p>{section.description}</p><Link className="arrow-link" href={`/admin/${section.path}`}>Administrar {section.title.toLowerCase()}</Link></article>)}</section>
  </main>;
}
