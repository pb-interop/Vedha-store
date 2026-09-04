"use client";

import { useState } from "react";
import { createProduct } from "./actions";
import styles from "../admin.module.css";

type CategoryOption = { id: number; name: string; nextSku: string };

export function AddProductForm({ categories }: { categories: CategoryOption[] }) {
  const [categoryId, setCategoryId] = useState(String(categories[0]?.id ?? ""));
  const selected = categories.find((category) => String(category.id) === categoryId);

  return <form action={createProduct} className={styles.editGrid}>
    <label>Product name<input name="name" required/></label>
    <label>Category<select name="category_id" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
    <label>SKU<input name="sku" value={selected?.nextSku ?? ""} readOnly required/><small>Generated automatically from the category.</small></label>
    <label>Weight<input name="label" placeholder="250 g" required/></label>
    <label>Price in rupees<input name="price" type="number" min="0" step="0.01" required/></label>
    <label>Starting stock<input name="stock" type="number" min="0" defaultValue="0" required/></label>
    <label className={styles.wide}>Short description<input name="description"/></label>
    <button className={styles.primary}>Save new product</button>
  </form>;
}
