"use client";
import { useDialogLifecycle } from "@/lib/hooks/use-dialog-lifecycle";
export function DialogFrame({ children, onClose }: { children: (close: () => void) => React.ReactNode; onClose: () => void }) {
  const { ref, requestClose } = useDialogLifecycle(onClose);
  return <dialog ref={ref} className="overlay motion-dialog" aria-label="Tu pedido" onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>{children(requestClose)}</dialog>;
}
