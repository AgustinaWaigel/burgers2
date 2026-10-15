const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
type Interval = { start: number; end: number };
export function parseHours(value: string): Interval[] | null {
  if (!value.trim() || /^cerrado$/i.test(value.trim())) return [];
  if (/^24\s*h(?:oras)?$/i.test(value.trim())) return [{ start: 0, end: 1440 }];
  const result: Interval[] = [];
  for (const part of value.split(/[,;]/)) {
    const match = part.trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(?:a|hasta|-|–)\s*(\d{1,2})(?::([0-5]\d))?$/i);
    if (!match) return null;
    const start = Number(match[1]) * 60 + Number(match[2] ?? 0);
    const end = Number(match[3]) * 60 + Number(match[4] ?? 0);
    if (start >= 1440 || end > 1440 || start === end) return null;
    result.push({ start, end });
  }
  return result;
}
export function getStoreAvailability(hours: unknown, now = new Date()) {
  if (!hours || typeof hours !== "object" || Array.isArray(hours) || !Object.values(hours).some(Boolean)) {
    return { open: null, label: "Horarios a confirmar", invalid: false };
  }
  const schedule = hours as Record<string, string>;
  const parsed = days.map(day => typeof schedule[day] === "string" ? parseHours(schedule[day]) : []);
  if (parsed.some(value => value === null)) return { open: false, label: "Horarios pendientes de actualización", invalid: true };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  const minute = Number(part("hour")) * 60 + Number(part("minute"));
  const today = parsed[day] ?? [];
  const yesterday = parsed[(day + 6) % 7] ?? [];
  const open = today.some(({ start, end }) => minute >= start && (end > start ? minute < end : true))
    || yesterday.some(({ start, end }) => end < start && minute < end);
  return { open, label: open ? "Abierto · recibimos pedidos" : "Cerrado por ahora", invalid: false };
}
