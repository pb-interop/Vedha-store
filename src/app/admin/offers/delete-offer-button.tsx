"use client";

import { deleteOffer } from "./actions";
import styles from "../admin.module.css";

export function DeleteOfferButton({ offerId, title }: { offerId: number; title: string }) {
  return <form action={deleteOffer} onSubmit={(event) => { if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) event.preventDefault(); }}>
    <input type="hidden" name="offer_id" value={offerId}/>
    <button className={styles.iconActionDanger} type="submit" title="Delete offer" aria-label={`Delete ${title}`}>⌫</button>
  </form>;
}
