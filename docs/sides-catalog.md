# Papas y nuggets

Carga: `npm run db:seed:sides`. Vista previa sin escribir: `npm run db:seed:sides -- --dry-run`.

La carga agrega dos categorías y cinco productos en una transacción. Al repetirla conserva los productos existentes (incluyendo precios, fotos, ingredientes y disponibilidad). Los precios son iniciales en ARS, editables en /admin/products: clásicas 3000, cheddar 3800, cheddar y bacon 4600, provenzal 3500, nuggets de 8 unidades 4500. No modifica hamburguesas ni pedidos.

Fotos generadas con la herramienta integrada image_gen, exportadas a JPEG 768 × 768 en public/images/menu/: papas-clasicas.jpg, papas-cheddar.jpg, papas-cheddar-bacon.jpg, papas-provenzal.jpg y nuggets.jpg.

## Prompts finales

### papas-clasicas

Use case: product-mockup. One square photorealistic professional restaurant menu product photo matching a series of burgers photographed on seamless warm ivory backgrounds. A generous single portion of golden straight-cut French fries with a little fine salt. No sauce, herbs, cheese or bacon. Food in a plain shallow matte ivory ceramic bowl, whole bowl visible centered with generous margins, filling 75% of frame width. Warm ivory seamless background and surface, no horizon, natural soft contact shadow. Consistent studio light from upper left, realistic appetizing textures, neutral colors. Camera at a low three-quarter angle, 25 degrees above food, 85mm lens. No props, cutlery, drinks, hands, lettering or logos. Only the specified food.

### papas-cheddar

Use case: product-mockup. One square photorealistic professional restaurant menu product photo matching a series of burgers photographed on seamless warm ivory backgrounds. A generous single portion of golden straight-cut French fries topped with melted orange cheddar sauce. No herbs, bacon or any other toppings. Food in a plain shallow matte ivory ceramic bowl, whole bowl visible centered with generous margins, filling 75% of frame width. Warm ivory seamless background and surface, no horizon, natural soft contact shadow. Consistent studio light from upper left, realistic appetizing textures, neutral colors. Camera at a low three-quarter angle, 25 degrees above food, 85mm lens. No props, cutlery, drinks, hands, lettering or logos. Only the specified food.

### papas-cheddar-bacon

Use case: product-mockup. One square photorealistic professional restaurant menu product photo matching a series of burgers photographed on seamless warm ivory backgrounds. A generous single portion of golden straight-cut French fries topped with melted orange cheddar sauce and crispy bacon bits. No herbs or other toppings. Food in a plain shallow matte ivory ceramic bowl, whole bowl visible centered with generous margins, filling 75% of frame width. Warm ivory seamless background and surface, no horizon, natural soft contact shadow. Consistent studio light from upper left, realistic appetizing textures, neutral colors. Camera at a low three-quarter angle, 25 degrees above food, 85mm lens. No props, cutlery, drinks, hands, lettering or logos. Only the specified food.

### papas-provenzal

Use case: product-mockup. One square photorealistic professional restaurant menu product photo matching a series of burgers photographed on seamless warm ivory backgrounds. A generous single portion of golden straight-cut French fries tossed with finely chopped fresh parsley and minced garlic. No cheese, bacon or sauce. Food in a plain shallow matte ivory ceramic bowl, whole bowl visible centered with generous margins, filling 75% of frame width. Warm ivory seamless background and surface, no horizon, natural soft contact shadow. Consistent studio light from upper left, realistic appetizing textures, neutral colors. Camera at a low three-quarter angle, 25 degrees above food, 85mm lens. No props, cutlery, drinks, hands, lettering or logos. Only the specified food.

### nuggets

Square photorealistic restaurant menu photograph. EXACTLY EIGHT chicken nuggets, each a small ROUND golden breaded chicken bite, NOT elongated, arranged neatly on a wide plain shallow matte ivory ceramic plate in TWO ROWS of FOUR. Clear empty plate gaps between ALL pieces; no touching, overlapping or stacking. Eight total round nuggets only. Camera 45 degrees above plate so all eight are clearly separate. Seamless warm ivory background and surface, soft studio lighting upper left, subtle contact shadow, warm realistic crisp breading texture. Plate fully visible, centered. No dips, garnish, text or props.

