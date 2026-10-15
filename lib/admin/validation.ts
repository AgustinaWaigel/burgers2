import { sections, type Section, type FormValues } from "./sections";

export class ValidationError extends Error {}
export function readFields(section: Section, form: FormData): FormValues {
  const values: FormValues = {};
  for (const field of sections[section].fields) {
    if (field.type === "checkbox") { values[field.name] = form.get(field.name) === "on"; continue; }
    let value = String(form.get(field.name) ?? "").trim();
    if (field.type === "number") value = value.replace(",", ".");
    if (field.required && !value) throw new ValidationError(`Completá el campo ${field.label}.`);
    if (value.length > (field.maxLength ?? 2000)) throw new ValidationError(`${field.label}: el texto es demasiado largo.`);
    if (field.type === "number" && (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)) || Number(value) < Number(field.min) || Number(value) > Number(field.max) || (field.step === "1" && !Number.isInteger(Number(value))))) throw new ValidationError(`Revisá el valor de ${field.label}.`);
    if (field.options && !field.options.some(option => option.value === value)) throw new ValidationError(`Elegí una opción válida para ${field.label}.`);
    values[field.name] = value;
  }
  return values;
}
export function parsePromotionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new ValidationError("Ingresá una fecha y hora válidas.");
  const date = new Date(`${value}:00-03:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() - 3 * 3600000).toISOString().slice(0, 16) !== value) throw new ValidationError("Ingresá una fecha válida.");
  return date;
}
export function parseLines(value: string) { return [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))]; }
export function parseLink(value: string) {
  if (!value) return "";
  try { const url = new URL(value); if (url.protocol === "https:" || url.protocol === "http:") return url.toString(); } catch {}
  throw new ValidationError("Los enlaces deben comenzar con https:// o http://.");
}
