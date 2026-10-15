"use client";
import { useEffect, useState } from "react";
import { getStoreAvailability } from "@/lib/store-hours";
export function StoreAvailability({ hours }: { hours: Record<string, string> }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 30000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, []);
  const status = now ? getStoreAvailability(hours, now) : null;
  return <span role="status" className="store-availability" data-open={status?.open ?? "unknown"}>{status?.label ?? "Consultando horario…"}<small> Hora de Argentina</small></span>;
}
