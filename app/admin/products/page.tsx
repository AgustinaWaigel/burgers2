import Link from "next/link";
import { AdminModal } from "@/components/admin/dialog";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/actions";
import { ProductForm, DeleteProduct } from "./product-form";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const params = await searchParams;
  const catalog = await (async () => {
    if (!isDatabaseConfigured()) return null;
    try {
      const [products, categories, ingredients, extras] = await Promise.all([
        prisma.product.findMany({
          include: { category: true, ingredients: true, extras: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
        prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
        prisma.extra.findMany({ orderBy: { name: "asc" } }),
      ]);
      return { products, categories, ingredients, extras };
    } catch (error) {
      console.error("Admin catalog query failed", error);
      return null;
    }
  })();
  const editing = catalog?.products.find(
    (product) => product.id === params.edit,
  );
  const showForm = params.edit === "new" || Boolean(editing);

  return (
    <main className="admin-shell">
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
        <h1>Productos</h1>
        <p>
          Cargá tus hamburguesas, actualizá los precios y elegí qué se muestra
          en la carta.
        </p>
        <Link href="/" className="admin-back">
          Ver la tienda
        </Link>
      </section>
      <section className="burger-admin" aria-label="Gestión de hamburguesas">
        {!catalog ? (
          <p className="form-status" role="alert">
            No pudimos cargar el catálogo. Revisá la conexión con la base de
            datos y volvé a intentar.
          </p>
        ) : (
          <>
            <div className="burger-toolbar">
              <p>
                {catalog.products.length}{" "}
                {catalog.products.length === 1 ? "producto" : "productos"}
              </p>
              <Link
                className="primary-action"
                scroll={false}
                href="/admin/products?edit=new"
              >
                Nuevo producto
              </Link>
            </div>
            {params.saved && (
              <p role="status" className="burger-notice">
                Producto guardado. La carta ya está actualizada.
              </p>
            )}
            {params.edit && !showForm && (
              <p role="alert" className="form-status">
                La hamburguesa que querías editar ya no existe.
              </p>
            )}
            {catalog.products.length === 0 ? (
              <div className="burger-empty">
                <h2>Tu carta empieza acá</h2>
                <p>
                  Creá la primera hamburguesa con su descripción, precio y foto.
                </p>
              </div>
            ) : (
              <ul className="burger-list">
                {catalog.products.map((product) => (
                  <li key={product.id} className="burger-item">
                    <div className="burger-thumb">
                      {product.imageUrl ? (
                        <Image
                          unoptimized
                          src={product.imageUrl}
                          alt={product.name}
                          width={88}
                          height={88}
                        />
                      ) : (
                        <span>Sin foto</span>
                      )}
                    </div>
                    <div className="burger-info">
                      <h2>{product.name}</h2>
                      <p>
                        {product.category.name} ·{" "}
                        {product.available && product.category.active
                          ? "Disponible"
                          : "Oculta"}
                      </p>
                      <strong>
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(Number(product.price))}
                      </strong>
                    </div>
                    <div className="burger-tools">
                      <Link
                        scroll={false}
                        href={`/admin/products?edit=${product.id}`}
                        className="burger-edit"
                        aria-label={`Editar ${product.name}`}
                      >
                        Editar
                      </Link>
                      <DeleteProduct id={product.id} name={product.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showForm && (
              <AdminModal
                key={editing?.id ?? "new"}
                title={editing ? "Editar producto" : "Nuevo producto"}
                closeHref="/admin/products"
              >
                <ProductForm
                  key={editing?.id ?? "new"}
                  product={
                    editing
                      ? {
                          id: editing.id,
                          name: editing.name,
                          description: editing.description,
                          price: editing.price.toString(),
                          categoryId: editing.categoryId,
                          available: editing.available,
                          imageUrl: editing.imageUrl,
                          ingredientIds: editing.ingredients
                            .filter((link) => link.included)
                            .map((link) => link.ingredientId),
                          removableIds: editing.ingredients
                            .filter((link) => link.removable && link.included)
                            .map((link) => link.ingredientId),
                          extraIds: editing.extras.map((link) => link.extraId),
                        }
                      : undefined
                  }
                  categories={catalog.categories}
                  ingredients={catalog.ingredients.map(
                    ({ id, name, active }) => ({ id, name, active }),
                  )}
                  extras={catalog.extras.map(({ id, name, active, price }) => ({
                    id,
                    name,
                    active,
                    price: price.toString(),
                  }))}
                />
              </AdminModal>
            )}
          </>
        )}
      </section>
    </main>
  );
}
