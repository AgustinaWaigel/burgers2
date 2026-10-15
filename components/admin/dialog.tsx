"use client";

import { createContext, useContext, useId, useState, useActionState, type ReactNode } from "react";
import { useDialogLifecycle } from "@/lib/hooks/use-dialog-lifecycle";
import { useRouter } from "next/navigation";

const CloseContext = createContext<(() => void) | null>(null);

export function AdminDialog({ title, children, onClose, compact = false }: { title: string; children: ReactNode; onClose: () => void; compact?: boolean }) {
  const { ref, requestClose: close } = useDialogLifecycle(onClose);
  const titleId = useId();
  return <CloseContext.Provider value={close}>
    <dialog ref={ref} className={`motion-dialog admin-dialog${compact ? " admin-dialog-compact" : ""}`} aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <header className="admin-dialog-header"><h2 data-dialog-heading tabIndex={-1} id={titleId}>{title}</h2><button type="button" className="admin-dialog-close" aria-label="Cerrar" onClick={close}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
      <div className="admin-dialog-content">{children}</div>
    </dialog>
  </CloseContext.Provider>;
}

export function AdminModal({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  return visible ? <AdminDialog title={title} onClose={() => { setVisible(false); router.replace(closeHref, { scroll: false }); }}>{children}</AdminDialog> : null;
}

export function ModalCancel({ disabled = false }: { disabled?: boolean }) {
  const close = useContext(CloseContext);
  return <button type="button" className="burger-edit" disabled={disabled} onClick={() => close?.()}>Cancelar</button>;
}

type ActionState = { error?: string; success?: string };
type DeleteProps = { action: (state: ActionState, form: FormData) => Promise<ActionState>; id: string; name: string; explanation: string; label?: string };
export function DeleteDialog(props: DeleteProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  return <>
    <button type="button" className="burger-delete" onClick={() => { setNotice(""); setOpen(true); }}>{props.label ?? "Dar de baja"}</button>
    {notice && <p className="muted" role="status">{notice}</p>}
    {open && <AdminDialog title={props.label ?? "Dar de baja"} compact onClose={() => setOpen(false)}><DeleteForm {...props} onSuccess={message => { setNotice(message); setOpen(false); }} /></AdminDialog>}
  </>;
}
function DeleteForm({ action, id, name, explanation, label, onSuccess }: DeleteProps & { onSuccess: (message: string) => void }) {
  const [state, submit, pending] = useActionState(async (previous: ActionState, form: FormData) => {
    const result = await action(previous, form);
    if (result.success) onSuccess(result.success);
    return result;
  }, {});
  return <form action={submit} aria-busy={pending}>
    <input type="hidden" name="id" value={id} />
    <p className="admin-dialog-record">{name}</p><p className="muted">{explanation}</p>
    {state.error && <p role="alert" className="form-status">{state.error}</p>}
    <div className="burger-tools admin-dialog-actions"><ModalCancel disabled={pending} /><button type="submit" className="primary-action" disabled={pending}>{pending ? "Procesando…" : label ?? "Confirmar baja"}</button></div>
  </form>;
}
