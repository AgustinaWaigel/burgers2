"use client";

import Link from "next/link";
import { ModalCancel, DeleteDialog } from "@/components/admin/dialog";
import { useActionState, useState } from "react";
import { saveProduct, deleteProduct } from "./actions";

type Product = { id: string; name: string; description: string; price: string; categoryId: string; available: boolean; imageUrl: string | null; ingredientIds: string[]; removableIds: string[]; extraIds: string[] };

type Choice = { id: string; name: string; active: boolean; price?: string };
export function ProductForm({ product, categories, ingredients, extras }: { product?: Product; categories: Choice[]; ingredients: Choice[]; extras: Choice[] }) {
  const [ingredientIds, setIngredientIds] = useState(product?.ingredientIds ?? []);
  const [removableIds, setRemovableIds] = useState(product?.removableIds ?? []);
  const [extraIds, setExtraIds] = useState(product?.extraIds ?? []);
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
  const [fields, setFields] = useState({ name: product?.name ?? "", description: product?.description ?? "", price: product?.price ?? "", categoryId: product?.categoryId ?? "", available: product?.available ?? true, removeImage: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [state, action, pending] = useActionState(async (previous: import("./actions").ProductActionState, form: FormData) => {
    if (photo) form.set("photo", photo);
    return saveProduct(previous, form);
  }, {});
  return <form action={action} className="burger-form" aria-busy={pending}>
    <input type="hidden" name="id" value={product?.id ?? ""} /><input type="hidden" name="manageRelations" value="on" />
    <fieldset disabled={pending} className="burger-fields">
      <label className="field"><span>Nombre</span><input name="name" value={fields.name} onChange={event => setFields({ ...fields, name: event.target.value })} maxLength={100} required autoComplete="off" /></label>
      <label className="field"><span>Descripción e ingredientes</span><textarea name="description" value={fields.description} onChange={event => setFields({ ...fields, description: event.target.value })} maxLength={2000} required rows={4} /></label>
      <div className="burger-form-row">
        <label className="field"><span>Precio (ARS)</span><input name="price" type="number" min="0.01" max="99999999.99" step="0.01" value={fields.price} onChange={event => setFields({ ...fields, price: event.target.value })} required /></label>
        <label className="field"><span>Categoría</span><select name="categoryId" value={fields.categoryId} onChange={event => setFields({ ...fields, categoryId: event.target.value })}><option value="">Hamburguesas (predeterminada)</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}{!category.active ? " (oculta)" : ""}</option>)}</select></label>
      </div>
      <label className="field"><span>{product?.imageUrl ? "Reemplazar foto" : "Foto"}</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" onChange={event => { const input = event.currentTarget; setPhoto(input.files?.[0] ?? null); input.setCustomValidity(input.files?.[0] && input.files[0].size > 600 * 1024 ? "Elegí una foto de hasta 600 KB." : ""); input.reportValidity(); }} /><small id="photo-help" className="muted">JPG, PNG o WebP. Hasta 600 KB. Opcional.{photo && ` Foto seleccionada: ${photo.name}`}</small></label>
      {product?.imageUrl && <label className="burger-check"><input name="removeImage" type="checkbox" checked={fields.removeImage} onChange={event => setFields({ ...fields, removeImage: event.target.checked })} /> Quitar foto actual</label>}
      <section className="burger-relations" aria-label="Ingredientes del producto"><h3>Ingredientes</h3><p className="muted">Marcá los incluidos y cuáles puede quitar el cliente. Los inactivos no se muestran en la carta.</p>
        {!ingredients.length && <p className="muted">Todavía no hay ingredientes. <Link href="/admin/ingredients?edit=new">Crear ingrediente</Link></p>}
        {ingredients.map(ingredient => <div className="burger-relation-row" key={ingredient.id}>
          <label className="burger-check"><input type="checkbox" name="ingredientIds" value={ingredient.id} checked={ingredientIds.includes(ingredient.id)} onChange={() => { setIngredientIds(toggle(ingredientIds, ingredient.id)); if (ingredientIds.includes(ingredient.id)) setRemovableIds(removableIds.filter(id => id !== ingredient.id)); }} />{ingredient.name}{!ingredient.active && " (inactivo)"}</label>
          <label className="burger-check"><input type="checkbox" name="removableIds" value={ingredient.id} checked={ingredientIds.includes(ingredient.id) && removableIds.includes(ingredient.id)} disabled={!ingredientIds.includes(ingredient.id)} onChange={() => setRemovableIds(toggle(removableIds, ingredient.id))} />Se puede quitar</label>
        </div>)}
      </section>
      <section className="burger-relations" aria-label="Extras del producto"><h3>Extras</h3>
        {!extras.length && <p className="muted">Todavía no hay extras. <Link href="/admin/extras?edit=new">Crear extra</Link></p>}
        {extras.map(extra => <label className="burger-check" key={extra.id}><input type="checkbox" name="extraIds" value={extra.id} checked={extraIds.includes(extra.id)} onChange={() => setExtraIds(toggle(extraIds, extra.id))} />{extra.name} · $ {extra.price}{!extra.active && " (inactivo)"}</label>)}
      </section>
      <label className="burger-check"><input name="available" type="checkbox" checked={fields.available} onChange={event => setFields({ ...fields, available: event.target.checked })} /> Disponible en la carta</label>
      <p className="muted">Las categorías ocultas no se muestran en la tienda.</p>
      <div className="burger-tools"><button className="primary-action" type="submit">{pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}</button><ModalCancel disabled={pending} /></div>
    </fieldset>
    {state.error && <p className="form-status" role="alert">{state.error}</p>}
  </form>;
}

export function DeleteProduct({ id, name }: { id: string; name: string }) {
  return <DeleteDialog action={deleteProduct} id={id} name={name} explanation="Si tiene pedidos, se oculta de la carta y conserva el historial. Si no, se elimina definitivamente." />;
}
