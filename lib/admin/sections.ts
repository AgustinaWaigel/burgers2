export type Section = "categories" | "ingredients" | "extras" | "promotions" | "settings";
export type Field = { name: string; label: string; type?: "text" | "textarea" | "number" | "checkbox" | "datetime-local" | "select"; required?: boolean; help?: string; options?: { value: string; label: string }[]; min?: string; max?: string; step?: string; maxLength?: number; initial?: string | boolean };
export type FormValues = Record<string, string | boolean>;
const common: Field[] = [
  { name: "name", label: "Nombre", required: true, maxLength: 100 },
  { name: "description", label: "Descripción", type: "textarea", maxLength: 2000 },
];
const active: Field = { name: "active", label: "Activo", type: "checkbox", initial: true };
const money = { type: "number" as const, required: true, min: "0", max: "99999999.99", step: "0.01", initial: "0" };
export const sections: Record<Section, { title: string; singular: string; create: string; description: string; fields: Field[] }> = {
  categories: { title: "Categorías", singular: "categoría", create: "Nueva categoría", description: "Organizá la carta. Al desactivar una categoría, sus productos dejan de mostrarse.", fields: [...common, { name: "slug", label: "Identificador", help: "Opcional. Se genera desde el nombre. Usá letras minúsculas, números y guiones.", maxLength: 100 }, { name: "sortOrder", label: "Orden en la carta", type: "number", required: true, min: "0", max: "999999", step: "1", initial: "0" }, active] },
  ingredients: { title: "Ingredientes", singular: "ingrediente", create: "Nuevo ingrediente", description: "Creá los ingredientes y asignalos desde la edición de cada hamburguesa.", fields: [...common, active] },
  extras: { title: "Extras", singular: "extra", create: "Nuevo extra", description: "Definí los adicionales y sus precios. Elegí cuáles ofrecer en cada hamburguesa.", fields: [...common, { ...money, name: "price", label: "Precio (ARS)" }, active] },
  promotions: { title: "Promociones", singular: "promoción", create: "Nueva promoción", description: "Descuentos sobre productos, sin envío. Sin código se aplica automáticamente la mejor promoción vigente; los cupones no se acumulan.", fields: [...common, { name: "code", label: "Código (opcional)", maxLength: 40 }, { name: "kind", label: "Tipo de descuento", type: "select", initial: "PERCENTAGE", options: [{ value: "PERCENTAGE", label: "Porcentaje (%)" }, { value: "FIXED", label: "Monto fijo (ARS)" }] }, { ...money, name: "value", label: "Valor del descuento", min: "0.01", initial: "", help: "Para porcentaje, ingresá un valor entre 0,01 y 100." }, { name: "startsAt", label: "Desde", type: "datetime-local", required: true, help: "Hora de Argentina (UTC−3)." }, { name: "endsAt", label: "Hasta", type: "datetime-local", required: true }, active] },
  settings: { title: "Configuración", singular: "configuración", create: "Configurar comercio", description: "Configurá los datos del comercio, el envío y las formas de pago.", fields: [
    { name: "businessName", label: "Nombre del comercio", required: true, maxLength: 100 },
    { name: "whatsappNumber", label: "WhatsApp", required: true, maxLength: 20, help: "Número internacional, solo dígitos. Por ejemplo: 5491112345678." },
    { name: "address", label: "Dirección", maxLength: 300 },
    { ...money, name: "deliveryCost", label: "Costo de envío (ARS)" },
    { ...money, name: "minimumOrder", label: "Pedido mínimo (ARS)" },
    { name: "paymentMethods", label: "Formas de pago", type: "textarea", required: true, maxLength: 2000, help: "Una por línea. Por ejemplo: Efectivo y Transferencia." },
    { name: "deliveryZones", label: "Zonas de entrega", type: "textarea", maxLength: 2000, help: "Una zona por línea (máximo 100 caracteres). El cliente debe elegir una para recibir envío; sin zonas, solo se ofrece retiro." },
    ...["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day, index): Field => ({ name: `hours_${index}`, label: day, maxLength: 100, help: "Hora argentina. Ej.: 19:00 a 02:00; dos turnos: 12:00-15:00, 19:00-23:00. También: Cerrado o 24h. Si cargás horarios, los días vacíos quedan cerrados." })),
    { name: "instagram", label: "Instagram", maxLength: 500, help: "Enlace completo, comenzando con https://." },
    { name: "facebook", label: "Facebook", maxLength: 500, help: "Enlace completo, comenzando con https://." },
  ] },
};
export function isSection(value: string): value is Section { return Object.hasOwn(sections, value); }
export const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
