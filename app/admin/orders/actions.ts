"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { isOrderStatus, orderTransitions } from "@/lib/order-status";
export async function updateOrderStatus(_: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a iniciar sesión." };
  const id = String(form.get("id") ?? "");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("status") ?? "");
  if (!id || !isOrderStatus(current) || !isOrderStatus(next) || !orderTransitions[current].includes(next)) return { error: "El cambio de estado no es válido." };
  try {
    const result = await prisma.order.updateMany({ where: { id, status: current }, data: { status: next } });
    if (!result.count) return { error: "El pedido cambió en otra sesión. Actualizá la lista antes de continuar." };
  } catch (error) { console.error("Order status update failed", error); return { error: "No pudimos guardar el estado. Volvé a intentar." }; }
  revalidatePath("/admin/orders");
  return { success: "Estado actualizado." };
}
