"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";

export function OfferSavedNotice() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 3500); return () => window.clearTimeout(timer); }, []);
  if (!visible) return null;
  return <div className={styles.savedToast} role="status">✓ Offer saved</div>;
}
