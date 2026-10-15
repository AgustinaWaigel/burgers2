import { Storefront } from "@/components/storefront";
import { getCatalog } from "@/lib/repositories/catalog";
import { getStoreSettings } from "@/lib/repositories/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalog, settings] = await Promise.all([getCatalog(), getStoreSettings()]);
  return <Storefront catalog={catalog} settings={settings} />;
}
