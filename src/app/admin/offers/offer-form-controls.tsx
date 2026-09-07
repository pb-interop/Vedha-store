"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

type Preview = { title: string; message: string; starts: string; ends: string; image: string | null };

export function OfferPreviewControl() {
  const previewButton = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    const form = previewButton.current?.closest("form");
    const startInput = form?.elements.namedItem("starts_at") as HTMLInputElement | null;
    const endInput = form?.elements.namedItem("ends_at") as HTMLInputElement | null;
    if (!startInput || !endInput) return;
    const updateRange = () => {
      endInput.min = startInput.value;
      if (endInput.value && endInput.value < startInput.value) endInput.value = startInput.value;
    };
    updateRange();
    startInput.addEventListener("change", updateRange);
    return () => startInput.removeEventListener("change", updateRange);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (preview.image) URL.revokeObjectURL(preview.image);
      setPreview(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [preview]);

  function openPreview() {
    const form = previewButton.current?.closest("form");
    if (!form) return;
    const data = new FormData(form);
    const file = data.get("banner_image");
    const image = file instanceof File && file.size ? URL.createObjectURL(file) : null;
    setPreview({
      title: String(data.get("title") || "Offer name"),
      message: String(data.get("message") || "Your offer message will appear here."),
      starts: formatDate(String(data.get("starts_at") || ""), "Starts now"),
      ends: formatDate(String(data.get("ends_at") || ""), "No end date"),
      image,
    });
  }

  function closePreview() {
    if (preview?.image) URL.revokeObjectURL(preview.image);
    setPreview(null);
  }

  const campaign = preview?.title.replace(/\s+(?:special\s+)?(?:sale|offer)s?$/i, "").trim() || preview?.title;
  return <>
    <div className={styles.offerFormActions}>
      <button ref={previewButton} className={styles.previewButton} type="button" onClick={openPreview}>Preview</button>
    </div>
    {preview && <div className={styles.offerPreviewBackdrop} onMouseDown={(event) => event.target === event.currentTarget && closePreview()}>
      <section className={`${styles.offerPreview} ${preview.image ? styles.offerPreviewWithImage : ""}`} role="dialog" aria-modal="true" aria-label="Offer banner preview" style={preview.image ? { backgroundImage: `url("${preview.image}")` } : undefined}>
        <button className={styles.previewClose} type="button" onClick={closePreview} aria-label="Close preview">×</button>
        <div className={styles.offerPreviewContent}>
          <h2><span>{campaign}</span> <em>Special Offer</em></h2>
          <p>{preview.message}</p>
          <small>Valid from {preview.starts} to {preview.ends}</small>
          <span className={styles.offerPreviewShop}>Shop Offer</span>
        </div>
      </section>
    </div>}
  </>;
}

export function OfferPublishButton() {
  return <div className={styles.offerFormActions}>
    <input type="hidden" name="active" value="on"/>
    <button className={styles.save} type="submit">Display on Website</button>
  </div>;
}

function formatDate(value: string, fallback: string) {
  if (!value) return fallback;
  const [year, month, rest] = value.split("-");
  return `${rest.slice(0, 2)}/${month}/${year}`;
}
