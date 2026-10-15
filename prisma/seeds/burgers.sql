BEGIN;

-- Catalogo inicial de hamburguesas. Es idempotente y no elimina datos existentes.
INSERT INTO categories (id, name, slug, description, "sortOrder", active, "createdAt", "updatedAt")
VALUES ('seed-category-burgers', 'Hamburguesas', 'hamburguesas', 'Hamburguesas artesanales con ingredientes frescos.', 1, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = true,
  "updatedAt" = NOW();

INSERT INTO ingredients (id, name, description, active, "createdAt", "updatedAt") VALUES
  ('seed-ingredient-beef', 'Medallon de carne', 'Medallon de carne vacuna a la plancha.', true, NOW(), NOW()),
  ('seed-ingredient-chicken', 'Pollo crispy', 'Filet de pollo crocante.', true, NOW(), NOW()),
  ('seed-ingredient-veggie', 'Medallon veggie', 'Medallon de legumbres y vegetales.', true, NOW(), NOW()),
  ('seed-ingredient-cheddar', 'Cheddar', 'Queso cheddar fundido.', true, NOW(), NOW()),
  ('seed-ingredient-mozzarella', 'Mozzarella', 'Mozzarella cremosa.', true, NOW(), NOW()),
  ('seed-ingredient-lettuce', 'Lechuga', 'Hojas frescas y crocantes.', true, NOW(), NOW()),
  ('seed-ingredient-tomato', 'Tomate', 'Tomate fresco en rodajas.', true, NOW(), NOW()),
  ('seed-ingredient-onion', 'Cebolla', 'Cebolla fresca en pluma.', true, NOW(), NOW()),
  ('seed-ingredient-grilled-onion', 'Cebolla grillada', 'Cebolla cocida lentamente a la plancha.', true, NOW(), NOW()),
  ('seed-ingredient-bacon', 'Bacon', 'Fetas de bacon crocante.', true, NOW(), NOW()),
  ('seed-ingredient-bbq', 'Salsa BBQ', 'Salsa BBQ ahumada.', true, NOW(), NOW()),
  ('seed-ingredient-pickles', 'Pepinillos', 'Pepinillos agridulces.', true, NOW(), NOW()),
  ('seed-ingredient-egg', 'Huevo', 'Huevo frito con yema cremosa.', true, NOW(), NOW()),
  ('seed-ingredient-chimichurri', 'Chimichurri', 'Chimichurri casero.', true, NOW(), NOW()),
  ('seed-ingredient-mayo', 'Mayonesa', 'Mayonesa de la casa.', true, NOW(), NOW()),
  ('seed-ingredient-avocado', 'Palta', 'Palta fresca.', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = true,
  "updatedAt" = NOW();

INSERT INTO extras (id, name, description, price, active, "createdAt", "updatedAt") VALUES
  ('seed-extra-cheddar', 'Extra cheddar', 'Una porcion extra de cheddar.', 700.00, true, NOW(), NOW()),
  ('seed-extra-bacon', 'Extra bacon', 'Bacon crocante adicional.', 900.00, true, NOW(), NOW()),
  ('seed-extra-egg', 'Extra huevo', 'Huevo frito adicional.', 600.00, true, NOW(), NOW()),
  ('seed-extra-patty', 'Extra medallon', 'Medallon de carne adicional.', 1500.00, true, NOW(), NOW()),
  ('seed-extra-fries', 'Papas fritas', 'Porcion de papas fritas.', 1200.00, true, NOW(), NOW()),
  ('seed-extra-sauce', 'Salsa extra', 'Dip de salsa de la casa.', 400.00, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  active = true,
  "updatedAt" = NOW();

INSERT INTO products (id, "categoryId", name, slug, description, "imageUrl", price, available, "sortOrder", "createdAt", "updatedAt")
VALUES
  ('seed-product-clasica', (SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Clasica', 'clasica', 'Carne, cheddar, lechuga, tomate y salsa de la casa.', '/images/menu/clasica.jpg', 6500.00, true, 1, NOW(), NOW()),
  ('seed-product-doble-cheddar', (SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Doble Cheddar', 'doble-cheddar', 'Doble medallon, doble cheddar y cebolla grillada.', '/images/menu/doble-cheddar.jpg', 8200.00, true, 2, NOW(), NOW()),
  ('seed-product-bacon-bbq', (SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Bacon BBQ', 'bacon-bbq', 'Carne, cheddar, bacon crocante, pepinillos y BBQ.', '/images/menu/bacon-bbq.jpg', 7900.00, true, 3, NOW(), NOW()),
  ('seed-product-criolla', (SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Criolla', 'criolla', 'Carne, mozzarella, huevo, cebolla grillada y chimichurri.', '/images/menu/criolla.jpg', 7600.00, true, 4, NOW(), NOW()),
  ('seed-product-pollo-crispy', (SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Pollo Crispy', 'pollo-crispy', 'Pollo crispy, lechuga, tomate y mayonesa de la casa.', '/images/menu/pollo-crispy.jpg', 7000.00, true, 5, NOW(), NOW()),
  ('seed-product-veggie', (SELECT id FROM categories WHERE slug = 'hamburguesas'), 'Veggie', 'veggie', 'Medallon veggie, cheddar, palta, tomate y lechuga.', '/images/menu/veggie.jpg', 6800.00, true, 6, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "imageUrl" = EXCLUDED."imageUrl",
  price = EXCLUDED.price,
  available = EXCLUDED.available,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

DELETE FROM product_ingredients
WHERE "productId" IN (SELECT id FROM products WHERE slug IN ('clasica', 'doble-cheddar', 'bacon-bbq', 'criolla', 'pollo-crispy', 'veggie'));

INSERT INTO product_ingredients ("productId", "ingredientId", included, removable)
SELECT p.id, i.id, true, true
FROM (VALUES
  ('clasica', 'seed-ingredient-beef'), ('clasica', 'seed-ingredient-cheddar'), ('clasica', 'seed-ingredient-lettuce'), ('clasica', 'seed-ingredient-tomato'), ('clasica', 'seed-ingredient-mayo'),
  ('doble-cheddar', 'seed-ingredient-beef'), ('doble-cheddar', 'seed-ingredient-cheddar'), ('doble-cheddar', 'seed-ingredient-onion'),
  ('bacon-bbq', 'seed-ingredient-beef'), ('bacon-bbq', 'seed-ingredient-cheddar'), ('bacon-bbq', 'seed-ingredient-bacon'), ('bacon-bbq', 'seed-ingredient-pickles'), ('bacon-bbq', 'seed-ingredient-bbq'),
  ('criolla', 'seed-ingredient-beef'), ('criolla', 'seed-ingredient-mozzarella'), ('criolla', 'seed-ingredient-egg'), ('criolla', 'seed-ingredient-grilled-onion'), ('criolla', 'seed-ingredient-chimichurri'),
  ('pollo-crispy', 'seed-ingredient-chicken'), ('pollo-crispy', 'seed-ingredient-lettuce'), ('pollo-crispy', 'seed-ingredient-tomato'), ('pollo-crispy', 'seed-ingredient-mayo'),
  ('veggie', 'seed-ingredient-veggie'), ('veggie', 'seed-ingredient-cheddar'), ('veggie', 'seed-ingredient-avocado'), ('veggie', 'seed-ingredient-tomato'), ('veggie', 'seed-ingredient-lettuce')
) AS rel(slug, ingredient_id)
JOIN products p ON p.slug = rel.slug
JOIN ingredients i ON i.id = rel.ingredient_id;

UPDATE product_ingredients SET removable = false
WHERE "ingredientId" IN ('seed-ingredient-beef', 'seed-ingredient-chicken', 'seed-ingredient-veggie')
  AND "productId" IN (SELECT id FROM products WHERE slug IN ('clasica', 'doble-cheddar', 'bacon-bbq', 'criolla', 'pollo-crispy', 'veggie'));

DELETE FROM product_extras
WHERE "productId" IN (SELECT id FROM products WHERE slug IN ('clasica', 'doble-cheddar', 'bacon-bbq', 'criolla', 'pollo-crispy', 'veggie'));

INSERT INTO product_extras ("productId", "extraId")
SELECT p.id, e.id
FROM (VALUES
  ('clasica', 'seed-extra-cheddar'), ('clasica', 'seed-extra-bacon'), ('clasica', 'seed-extra-egg'), ('clasica', 'seed-extra-fries'), ('clasica', 'seed-extra-sauce'),
  ('doble-cheddar', 'seed-extra-bacon'), ('doble-cheddar', 'seed-extra-egg'), ('doble-cheddar', 'seed-extra-patty'), ('doble-cheddar', 'seed-extra-fries'),
  ('bacon-bbq', 'seed-extra-cheddar'), ('bacon-bbq', 'seed-extra-egg'), ('bacon-bbq', 'seed-extra-patty'), ('bacon-bbq', 'seed-extra-fries'), ('bacon-bbq', 'seed-extra-sauce'),
  ('criolla', 'seed-extra-cheddar'), ('criolla', 'seed-extra-bacon'), ('criolla', 'seed-extra-patty'), ('criolla', 'seed-extra-fries'),
  ('pollo-crispy', 'seed-extra-cheddar'), ('pollo-crispy', 'seed-extra-bacon'), ('pollo-crispy', 'seed-extra-egg'), ('pollo-crispy', 'seed-extra-fries'), ('pollo-crispy', 'seed-extra-sauce'),
  ('veggie', 'seed-extra-cheddar'), ('veggie', 'seed-extra-egg'), ('veggie', 'seed-extra-fries'), ('veggie', 'seed-extra-sauce')
) AS rel(slug, extra_id)
JOIN products p ON p.slug = rel.slug
JOIN extras e ON e.id = rel.extra_id;

COMMIT;