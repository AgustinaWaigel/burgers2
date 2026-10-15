"use server";

import { parseHours } from "@/lib/store-hours";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isSection, days, type Section } from "@/lib/admin/sections";
import { readFields, ValidationError, parsePromotionDate, parseLines, parseLink } from "@/lib/admin/validation";

export type ActionState = { error?: string; success?: string };
async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
}
function refresh(section: Section) {
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath(`/admin/${section}`); revalidatePath("/admin/products");
}
function failure(error: unknown): ActionState {
  if (error instanceof ValidationError) return { error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { error: "Ya existe ese identificador o código. Elegí otro." };
    if (error.code === "P2025") return { error: "El registro ya no existe. Volvé al listado y actualizá la página." };
  }
  console.error("Admin mutation failed", error);
  return { error: "No pudimos guardar el cambio. Revisá la conexión e intentá nuevamente." };
}
export async function saveRecord(section: string, _: ActionState, form: FormData): Promise<ActionState> {
  await authorize();
  if (!isSection(section)) return { error: "Sección inválida." };
  const id = String(form.get("id") ?? "");
  try {
    const values = readFields(section, form);
    const text = (key: string) => String(values[key] ?? "");
    const common = { name: text("name"), description: text("description") || null, active: values.active === true };
    switch (section) {
      case "categories": {
        const slug = text("slug") || text("name").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ValidationError("El identificador debe contener letras minúsculas, números y guiones.");
        const data = { ...common, slug, sortOrder: Number(text("sortOrder")) };
        if (id) await prisma.category.update({ where: { id }, data }); else await prisma.category.create({ data });
        break;
      }
      case "ingredients":
        if (id) await prisma.ingredient.update({ where: { id }, data: common }); else await prisma.ingredient.create({ data: common });
        break;
      case "extras": {
        const data = { ...common, price: text("price") };
        if (id) await prisma.extra.update({ where: { id }, data }); else await prisma.extra.create({ data });
        break;
      }
      case "promotions": {
        const startsAt = parsePromotionDate(text("startsAt")); const endsAt = parsePromotionDate(text("endsAt"));
        if (endsAt <= startsAt) throw new ValidationError("La fecha de fin debe ser posterior al inicio.");
        if (text("kind") === "PERCENTAGE" && Number(text("value")) > 100) throw new ValidationError("El porcentaje no puede superar 100.");
        const code = text("code").toUpperCase() || null;
        if (code && !/^[A-Z0-9_-]+$/.test(code)) throw new ValidationError("El código solo admite letras, números, guiones y guiones bajos.");
        const data = { ...common, startsAt, endsAt, code, kind: text("kind"), value: text("value") };
        if (id) await prisma.promotion.update({ where: { id }, data }); else await prisma.promotion.create({ data });
        break;
      }
      case "settings": {
        if (!/^\d{8,15}$/.test(text("whatsappNumber"))) throw new ValidationError("WhatsApp debe tener entre 8 y 15 dígitos, con código de país y sin signos.");
        const paymentMethods = parseLines(text("paymentMethods"));
        if (!paymentMethods.length) throw new ValidationError("Agregá al menos una forma de pago.");
        const hours = Object.fromEntries(days.map((day, index) => [day, text(`hours_${index}`)]).filter(([, value]) => value));
        for (const [day, value] of Object.entries(hours)) { if (parseHours(String(value)) === null) throw new ValidationError(`${day}: usá un horario como 19:00 a 02:00, Cerrado o 24h.`); }
        if (parseLines(text("deliveryZones")).some(zone => zone.length > 100)) throw new ValidationError("Cada zona debe tener como máximo 100 caracteres.");
        const data = { businessName: text("businessName"), whatsappNumber: text("whatsappNumber"), address: text("address") || null, deliveryCost: text("deliveryCost"), minimumOrder: text("minimumOrder"), paymentMethods, deliveryZones: parseLines(text("deliveryZones")), hours, socialLinks: { instagram: parseLink(text("instagram")), facebook: parseLink(text("facebook")) } };
        // A fixed ID prevents duplicate configuration on concurrent first saves.
        if (id) await prisma.storeSettings.update({ where: { id }, data });
        else await prisma.storeSettings.upsert({ where: { id: "store" }, create: { id: "store", ...data }, update: data });
        break;
      }
    }
  } catch (error) { return failure(error); }
  refresh(section);
  redirect(`/admin/${section}?saved=1`);
}

export async function deleteRecord(section: string, _: ActionState, form: FormData): Promise<ActionState> {
  await authorize();
  if (!isSection(section)) return { error: "Sección inválida." };
  const id = String(form.get("id") ?? "");
  if (!id) return { error: "Falta el registro que querés dar de baja." };
  let archived = false;
  try {
    try {
      switch (section) {
        case "categories": await prisma.category.delete({ where: { id } }); break;
        case "ingredients": await prisma.ingredient.delete({ where: { id } }); break;
        case "extras": await prisma.extra.delete({ where: { id } }); break;
        case "promotions": await prisma.promotion.delete({ where: { id } }); break;
        case "settings": await prisma.storeSettings.delete({ where: { id } }); break;
      }
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2003") throw error;
      switch (section) {
        case "categories": await prisma.category.update({ where: { id }, data: { active: false } }); break;
        case "ingredients": await prisma.ingredient.update({ where: { id }, data: { active: false } }); break;
        case "extras": await prisma.extra.update({ where: { id }, data: { active: false } }); break;
        default: throw error;
      }
      archived = true;
    }
  } catch (error) { return failure(error); }
  refresh(section);
  // Redirect keeps the feedback visible after the deleted row disappears.
  redirect(`/admin/${section}?removed=${archived ? "archived" : "deleted"}`);
}
