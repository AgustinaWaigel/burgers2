This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Administración de hamburguesas

Entrá a `/admin`, iniciá sesión con una cuenta de Supabase Auth y seleccioná
**Administrar hamburguesas**. El ABM está en `/admin/products`.

- Permite crear, editar, ocultar y dar de baja productos.
- La categoría Hamburguesas se crea automáticamente si se elige la opción predeterminada.
- Las fotos JPG, PNG o WebP admiten hasta 600 KB y se guardan como data URL en
  el campo existente `Product.imageUrl`, sin configurar un servicio de archivos.
  Para un catálogo grande conviene migrarlas a almacenamiento de objetos.
- La baja elimina productos sin pedidos. Si tienen pedidos, los oculta y conserva
  las referencias históricas. Se pueden volver a publicar desde Editar.
- Usa la conexión PostgreSQL y el acceso de Supabase existentes. Cada acción exige
  una sesión autenticada, siguiendo el modelo de acceso del panel actual.

Pruebas de acciones con persistencia y autenticación simuladas:

```bash
node --test tests/product-actions.test.mjs
```

## Otras secciones del panel

Desde `/admin` están disponibles:

- `/admin/categories`: nombre, identificador, orden y visibilidad de categorías.
- `/admin/ingredients`: ingredientes y disponibilidad.
- `/admin/extras`: adicionales, precios y disponibilidad.
- `/admin/promotions`: códigos, tipo de descuento, valor y vigencia en horario de Argentina.
- `/admin/settings`: datos del comercio, WhatsApp, horarios, envíos, pedido mínimo,
  formas de pago, zonas y enlaces sociales.

Las promociones se administran y guardan, pero todavía no aplican descuentos en
el checkout. Zonas y enlaces sociales quedan guardados como datos del comercio.
La configuración permite alta inicial, modificación y eliminación con confirmación.

En cada hamburguesa se pueden seleccionar ingredientes incluidos, cuáles se pueden
quitar y los extras habilitados. La tienda y la validación del pedido respetan la
activación de categorías, ingredientes y extras. El pedido valida el mínimo sin
contar el envío y las formas de pago configuradas.

Las bajas de categorías, ingredientes y extras en uso los desactivan; no borran
referencias de productos o pedidos. Se pueden reactivar desde la edición.

Pruebas de administración y pedidos:

```bash
node --test tests/admin-actions.test.mjs tests/product-actions.test.mjs tests/order-settings.test.mjs
```

Prueba opcional contra la base configurada, con sesión simulada y cambios dentro
de una transacción que se revierte completamente:

```bash
node tests/admin-database.integration.mjs
```

Los formularios de alta y edición de todos los ABM se abren en modales sobre el
listado. Las bajas usan una confirmación del mismo estilo. Escape y Cancelar
cierran el diálogo y devuelven el foco al control de origen; durante el guardado
el cierre se bloquea para no interrumpir la operación.

El movimiento usa transiciones CSS: modales de 250 ms al entrar y 160 ms al salir,
carrito lateral, feedback de presión de 120 ms y una entrada breve de portada.
Las acciones de teclado son inmediatas; movimiento reducido elimina desplazamientos
y conserva un fundido breve en los diálogos.
