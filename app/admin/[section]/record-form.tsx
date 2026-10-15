"use client";

import { ModalCancel, DeleteDialog } from "@/components/admin/dialog";
import { useActionState, useState } from "react";
import { sections, type Section, type FormValues } from "@/lib/admin/sections";
import { saveRecord, deleteRecord } from "./actions";

export function RecordForm({ section, id = "", initial = {} }: { section: Section; id?: string; initial?: FormValues }) {
  const config = sections[section];
  const [values, setValues] = useState<FormValues>(() => Object.fromEntries(config.fields.map(field => [field.name, initial[field.name] ?? field.initial ?? (field.type === "checkbox" ? false : "")])));
  const [state, action, pending] = useActionState(saveRecord.bind(null, section), {});
  return <form action={action} className="burger-form" aria-busy={pending}>
    <input type="hidden" name="id" value={id} />
    <fieldset disabled={pending} className="burger-fields">
      {config.fields.map(field => <label className={field.type === "checkbox" ? "burger-check" : "field"} key={field.name}>
        {field.type !== "checkbox" && <span>{field.label}{field.required ? " *" : ""}</span>}
        {field.type === "checkbox" ? <><input name={field.name} type="checkbox" checked={values[field.name] === true} onChange={event => setValues({ ...values, [field.name]: event.target.checked })} />{field.label}</>
          : field.type === "textarea" ? <textarea name={field.name} value={String(values[field.name])} onChange={event => setValues({ ...values, [field.name]: event.target.value })} required={field.required} maxLength={field.maxLength} rows={3} aria-describedby={field.help ? `${field.name}-help` : undefined} />
          : field.type === "select" ? <select name={field.name} value={String(values[field.name])} onChange={event => setValues({ ...values, [field.name]: event.target.value })}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : <input name={field.name} type={field.type ?? "text"} value={String(values[field.name])} onChange={event => setValues({ ...values, [field.name]: event.target.value })} required={field.required} maxLength={field.maxLength} min={field.min} max={field.max} step={field.step} aria-describedby={field.help ? `${field.name}-help` : undefined} />}
        {field.help && <small id={`${field.name}-help`} className="muted">{field.help}</small>}
      </label>)}
      <div className="burger-tools"><button type="submit" className="primary-action">{pending ? "Guardando…" : id ? "Guardar cambios" : config.create}</button><ModalCancel disabled={pending} /></div>
    </fieldset>
    {state.error && <p role="alert" className="form-status">{state.error}</p>}
  </form>;
}
export function DeleteRecord({ section, id, name }: { section: Section; id: string; name: string }) {
  const explanation = section === "settings" ? "Se eliminarán los datos del comercio y las formas de pago. Tendrás que configurarlos nuevamente para recibir pedidos." : "Si está en uso, se desactivará conservando sus relaciones. Si no, se eliminará definitivamente.";
  return <DeleteDialog action={deleteRecord.bind(null, section)} id={id} name={name} explanation={explanation} label={section === "settings" ? "Eliminar configuraci\u00f3n" : undefined} />;
}
