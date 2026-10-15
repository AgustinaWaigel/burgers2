# Migraciones

El esquema fuente está en `prisma/schema.prisma`. La migración inicial versionada
crea las tablas del catálogo, pedidos y configuración en una transacción.

Aplicar las migraciones pendientes:

```bash
npm run db:migrate
```

Consultar el estado:

```bash
npm run db:status
```

Estos comandos cargan las mismas variables de entorno que Next.js, incluyendo
`.env.local`. Si `DATABASE_URL` usa el pool de Supabase en el puerto 6543,
las migraciones utilizan el puerto de sesión 5432 del mismo proyecto.
La conexión de la aplicación permanece sin cambios.

Las migraciones no incluyen datos de negocio. Las hamburguesas se cargan desde
`/admin/products`; la categoría predeterminada se crea con el primer producto.
