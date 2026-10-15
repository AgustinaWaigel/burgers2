"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type ProductActionState = { error?: string; success?: string };

async function requireSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
}

function refreshCatalog() {
  revalidatePath("/");
  revalidatePath("/admin/products");
}

export async function saveProduct(_: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requireSession();
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const id = value("id");
  const name = value("name");
  const description = value("description");
  const price = value("price").replace(",", ".");
  const categoryId = value("categoryId");
  if (!name || name.length > 100) return { error: "Ingresá un nombre de hasta 100 caracteres." };
  if (!description || description.length > 2000) return { error: "Ingresá una descripción de hasta 2000 caracteres." };
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(price) || Number(price) <= 0) return { error: "Ingresá un precio mayor a cero, con hasta dos decimales." };

  let imageUrl: string | null | undefined = form.get("removeImage") === "on" ? null : undefined;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 600 * 1024) return { error: "La foto debe pesar como máximo 600 KB." };
    const bytes = Buffer.from(await photo.arrayBuffer());
    const type = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
    if (!type) return { error: "Elegí una foto JPG, PNG o WebP válida." };
    imageUrl = `data:${type};base64,${bytes.toString("base64")}`;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const category = categoryId
        ? await tx.category.findUnique({ where: { id: categoryId } })
        : await tx.category.upsert({ where: { slug: "hamburguesas" }, create: { name: "Hamburguesas", slug: "hamburguesas" }, update: {} });
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
      const data = { name, description, price, categoryId: category.id, available: form.get("available") === "on", imageUrl };
      const product = id ? await tx.product.update({ where: { id }, data })
      : await tx.product.create({ data: { ...data, slug: `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hamburguesa"}-${randomUUID()}` } });
      if (form.get("manageRelations") === "on") {
        const ids = (key: string) => [...new Set(form.getAll(key).map(String))];
        const ingredientIds = ids("ingredientIds"); const removableIds = ids("removableIds"); const extraIds = ids("extraIds");
        if (ingredientIds.length > 100 || extraIds.length > 100 || removableIds.some(value => !ingredientIds.includes(value))) throw new Error("INVALID_RELATIONS");
        const [ingredientCount, extraCount] = await Promise.all([
          tx.ingredient.count({ where: { id: { in: ingredientIds } } }),
          tx.extra.count({ where: { id: { in: extraIds } } }),
        ]);
        if (ingredientCount !== ingredientIds.length || extraCount !== extraIds.length) throw new Error("INVALID_RELATIONS");
        await tx.productIngredient.deleteMany({ where: { productId: product.id } });
        await tx.productExtra.deleteMany({ where: { productId: product.id } });
        if (ingredientIds.length) await tx.productIngredient.createMany({ data: ingredientIds.map(ingredientId => ({ productId: product.id, ingredientId, included: true, removable: removableIds.includes(ingredientId) })) });
        if (extraIds.length) await tx.productExtra.createMany({ data: extraIds.map(extraId => ({ productId: product.id, extraId })) });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RELATIONS") return { error: "Revisá los ingredientes y extras. Alguno ya no existe o la selección no es válida." };
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") return { error: "La categoría ya no existe. Actualizá la página y elegí otra." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { error: "Este producto ya no existe. Actualizá la página." };
    console.error("Product save failed", error);
    return { error: "No pudimos guardar el producto. Tus datos siguen en el formulario; intentá nuevamente." };
  }
  refreshCatalog();
  redirect("/admin/products?saved=1");
}

export async function deleteProduct(_: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requireSession();
  const id = String(form.get("id") ?? "");
  if (!id) return { error: "No se encontró la hamburguesa." };
  let archived = false;
  try {
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      // The foreign key also protects orders created concurrently with this deletion.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2003") throw error;
      await prisma.product.update({ where: { id }, data: { available: false } });
      archived = true;
    }
  } catch (error) {
    console.error("Product delete failed", error);
    return { error: "No pudimos dar de baja el producto. Actualizá la página e intentá nuevamente." };
  }
  refreshCatalog();
  return { success: archived ? "Producto oculto de la carta. Se conservó su historial de pedidos." : "Producto eliminado." };
}

