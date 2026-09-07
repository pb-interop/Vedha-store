"use client";

import { deleteOffer } from "./actions";
import styles from "../admin.module.css";

export function DeleteOfferButton({ offerId, title }: { offerId: number; title: string }) {
  return <form action={deleteOffer} onSubmit={(event) => { if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) event.preventDefault(); }}>
    <input type="hidden" name="offer_id" value={offerId}/>
    <button className={styles.iconActionDanger} type="submit" title="Delete offer" aria-label={`Delete ${title}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button>
  </form>;
}
