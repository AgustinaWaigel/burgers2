import { prisma } from "@/lib/db";
import { days, type Section, type FormValues } from "@/lib/admin/sections";

export type AdminRecord = { id: string; name: string; values: FormValues };
function record(row: { id: string } & object): AdminRecord {
  const values: FormValues = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (key === "createdAt" || key === "updatedAt") continue;
    if (value instanceof Date) values[key] = new Date(value.getTime() - 3 * 3600000).toISOString().slice(0, 16);
    else if (typeof value === "boolean") values[key] = value;
    else if (Array.isArray(value)) values[key] = value.join("\n");
    else if (key === "hours" && value && typeof value === "object") {
      days.forEach((day, index) => { values[`hours_${index}`] = String((value as Record<string, unknown>)[day] ?? ""); });
    } else if (key === "socialLinks" && value && typeof value === "object") {
      for (const social of ["instagram", "facebook"]) values[social] = String((value as Record<string, unknown>)[social] ?? "");
    } else values[key] = value == null ? "" : String(value);
  }
  return { id: row.id, name: String(values.name || values.businessName || "Sin nombre"), values };
}
export async function getAdminRecords(section: Section): Promise<AdminRecord[]> {
  switch (section) {
    case "categories": return (await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })).map(record);
    case "ingredients": return (await prisma.ingredient.findMany({ orderBy: { name: "asc" } })).map(record);
    case "extras": return (await prisma.extra.findMany({ orderBy: { name: "asc" } })).map(record);
    case "promotions": return (await prisma.promotion.findMany({ orderBy: { startsAt: "desc" } })).map(record);
    case "settings": return (await prisma.storeSettings.findMany({ orderBy: { updatedAt: "desc" }, take: 1 })).map(record);
  }
}
