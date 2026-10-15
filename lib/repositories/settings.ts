import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { StoreSettingsData } from "@/lib/types";

export async function getStoreSettings(): Promise<StoreSettingsData | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const settings = await prisma.storeSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!settings) return null;
    return {
      businessName: settings.businessName,
      whatsappNumber: settings.whatsappNumber || process.env.WHATSAPP_NUMBER || "",
      address: settings.address,
      hours: settings.hours as Record<string, string>,
      deliveryCost: Number(settings.deliveryCost),
      minimumOrder: Number(settings.minimumOrder),
      paymentMethods: settings.paymentMethods,
      deliveryZones: settings.deliveryZones,
      socialLinks: settings.socialLinks as Record<string, string>,
    };
  } catch (error) {
    console.error("Store settings query failed", error);
    return null;
  }
}
