import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { CatalogResult } from "@/lib/types";

export async function getCatalog(): Promise<CatalogResult> {
  if (!isDatabaseConfigured()) return { status: "empty", categories: [], products: [] };

  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({
        where: { available: true, category: { active: true } },
        include: {
          category: true,
          ingredients: { include: { ingredient: true }, where: { included: true, ingredient: { active: true } } },
          extras: { include: { extra: true }, where: { extra: { active: true } } },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      status: "configured",
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      })),
      products: products.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        price: Number(product.price),
        available: product.available,
        ingredients: product.ingredients.map(({ ingredient, removable }) => ({
          id: ingredient.id,
          name: ingredient.name,
          removable,
        })),
        extras: product.extras.map(({ extra }) => ({
          id: extra.id,
          name: extra.name,
          description: extra.description,
          price: Number(extra.price),
        })),
      })),
    };
  } catch (error) {
    console.error("Catalog query failed", error);
    return { status: "error", categories: [], products: [], message: "No pudimos leer el catálogo." };
  }
}