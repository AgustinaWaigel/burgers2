// Precios iniciales en ARS; se pueden editar desde /admin/products.
export const categories = [
  { id: 'seed-category-fries', slug: 'papas', name: 'Papas', description: 'Papas fritas con tus toppings favoritos.', sortOrder: 2 },
  { id: 'seed-category-nuggets', slug: 'nuggets', name: 'Nuggets', description: 'Pollo crocante para acompañar tu pedido.', sortOrder: 3 },
];

export const ingredients = [
  { id: 'seed-ingredient-fries', name: 'Papas fritas', description: 'Papas cortadas en bastones y fritas.' },
  { id: 'seed-ingredient-salt', name: 'Sal', description: 'Sal fina.' },
  { id: 'seed-ingredient-cheddar-sauce', name: 'Salsa cheddar', description: 'Salsa de queso cheddar.' },
  { id: 'seed-ingredient-bacon', name: 'Bacon', description: 'Bacon crocante.' },
  { id: 'seed-ingredient-garlic', name: 'Ajo', description: 'Ajo picado.' },
  { id: 'seed-ingredient-parsley', name: 'Perejil', description: 'Perejil fresco picado.' },
  { id: 'seed-ingredient-nuggets', name: 'Nuggets de pollo', description: 'Bocaditos de pollo rebozados.' },
];

export const extras = [
  { id: 'seed-extra-cheddar-sauce', name: 'Extra salsa cheddar', description: 'Una porción adicional de salsa cheddar.', price: 700 },
  { id: 'seed-extra-bacon', name: 'Extra bacon', description: 'Bacon crocante adicional.', price: 900 },
  { id: 'seed-extra-bbq-dip', name: 'Dip BBQ', description: 'Salsa BBQ servida aparte.', price: 400 },
  { id: 'seed-extra-mayo-dip', name: 'Dip de mayonesa', description: 'Mayonesa de la casa servida aparte.', price: 400 },
];

const fries = [{ key: 'fries', removable: false }, { key: 'salt', removable: true }];
const dips = ['bbq-dip', 'mayo-dip'];
export const products = [
  { slug: 'papas-clasicas', name: 'Papas clásicas', category: 'papas', description: 'Porción de papas fritas doradas con sal.', price: 3000, ingredients: fries, extras: ['cheddar-sauce', 'bacon', ...dips] },
  { slug: 'papas-cheddar', name: 'Papas con cheddar', category: 'papas', description: 'Papas fritas con sal y salsa cheddar.', price: 3800, ingredients: [...fries, { key: 'cheddar-sauce', removable: true }], extras: ['cheddar-sauce', 'bacon', ...dips] },
  { slug: 'papas-cheddar-bacon', name: 'Papas cheddar y bacon', category: 'papas', description: 'Papas fritas con sal, salsa cheddar y bacon crocante.', price: 4600, ingredients: [...fries, { key: 'cheddar-sauce', removable: true }, { key: 'bacon', removable: true }], extras: ['cheddar-sauce', 'bacon', ...dips] },
  { slug: 'papas-provenzal', name: 'Papas provenzal', category: 'papas', description: 'Papas fritas con sal, ajo y perejil fresco.', price: 3500, ingredients: [...fries, { key: 'garlic', removable: true }, { key: 'parsley', removable: true }], extras: ['cheddar-sauce', 'bacon', ...dips] },
  { slug: 'nuggets', name: 'Nuggets · 8 unidades', category: 'nuggets', description: 'Ocho nuggets de pollo crocantes. Sumá tus dips favoritos.', price: 4500, ingredients: [{ key: 'nuggets', removable: false }], extras: dips },
].map((product, index) => ({ ...product, id: `seed-product-${product.slug}`, imageUrl: `/images/menu/${product.slug}.jpg`, sortOrder: 10 + index }));

export async function seedSides(db) {
  return db.$transaction(async (tx) => {
    const categoryIds = new Map();
    for (const category of categories) {
      const saved = await tx.category.upsert({ where: { slug: category.slug }, create: { ...category, active: true }, update: {} });
      categoryIds.set(category.slug, saved.id);
    }
    for (const ingredient of ingredients) {
      await tx.ingredient.upsert({ where: { id: ingredient.id }, create: { ...ingredient, active: true }, update: {} });
    }
    for (const extra of extras) {
      await tx.extra.upsert({ where: { id: extra.id }, create: { ...extra, active: true }, update: {} });
    }
    const added = [];
    for (const { category, ingredients: links, extras: extraKeys, ...product } of products) {
      const existing = await tx.product.findUnique({ where: { slug: product.slug }, select: { id: true } });
      if (existing) continue;
      await tx.product.create({ data: {
        ...product, categoryId: categoryIds.get(category), available: true,
        ingredients: { create: links.map(({ key, removable }) => ({ ingredientId: `seed-ingredient-${key}`, included: true, removable })) },
        extras: { create: extraKeys.map(key => ({ extraId: `seed-extra-${key}` })) },
      } });
      added.push(product.name);
    }
    return added;
  }, { maxWait: 15000, timeout: 60000 });
}
