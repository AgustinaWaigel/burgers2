import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { access } from 'node:fs/promises';
import { products, seedSides } from '../prisma/seeds/sides.mjs';

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--dry-run')) throw new Error('Usar: node scripts/seed-sides.mjs [--dry-run]');
for (const product of products) await access(`public${product.imageUrl}`);
if (args.includes('--dry-run')) {
  console.table(products.map(({ name, category, price }) => ({ name, category, price })));
} else {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.local.');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connect_timeout', '15');
  url.searchParams.set('connection_limit', '1');
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    const added = await seedSides(db);
    console.log(added.length ? `Productos agregados: ${added.join(', ')}.` : 'Los productos ya existen. Se conservaron sus datos.');
  } catch (error) {
    // Do not print connection strings or credentials on connection failures.
    console.error(`No se pudo cargar el catálogo (${error.code ?? error.name}). Revisá la conexión y volvé a ejecutar el comando. La transacción evita una carga parcial.`);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
