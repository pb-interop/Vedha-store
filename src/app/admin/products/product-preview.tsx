"use client";

import { useRef, useState } from "react";
import styles from "../admin.module.css";

type PreviewData = { name: string; price: number; images: string[]; active: boolean; featured: boolean };

export function ProductPreview({ category, weight, stock, currentImages }: { category: string; weight: string; stock: number; currentImages: string[] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  function openPreview() {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const data = new FormData(form);
    const selectedFile = data.get("image");
    const selectedImage = selectedFile instanceof File && selectedFile.size ? URL.createObjectURL(selectedFile) : null;
    setImageIndex(0);
    setPreview({
      name: String(data.get("name") ?? "Product"),
      price: Number(data.get("price") ?? 0),
      images: selectedImage ? [...currentImages, selectedImage] : currentImages,
      active: data.get("active") === "on",
      featured: data.get("featured") === "on",
    });
  }

  function closePreview() {
    preview?.images.filter((image) => image.startsWith("blob:")).forEach(URL.revokeObjectURL);
    setPreview(null);
  }

  const image = preview?.images[imageIndex];
  return <>
    <button ref={buttonRef} className={styles.previewButton} type="button" onClick={openPreview}>Preview changes</button>
    {preview && <div className={styles.previewBackdrop} onMouseDown={(event) => event.target === event.currentTarget && closePreview()}>
      <section className={styles.previewSheet} role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
        <button className={styles.previewClose} type="button" onClick={closePreview} aria-label="Close preview">×</button>
        <div className={styles.previewGallery}>
          {image ? <div className={styles.previewPhoto} style={{ backgroundImage: `url("${image}")` }}/>:<div className={styles.previewFallback}><span>VEDHA</span><strong>{preview.name}</strong><small>{weight} · HOMEMADE</small></div>}
          {preview.images.length > 1 && <><button className={styles.previewPrevious} type="button" onClick={() => setImageIndex((imageIndex - 1 + preview.images.length) % preview.images.length)} aria-label="Previous image">‹</button><button className={styles.previewNext} type="button" onClick={() => setImageIndex((imageIndex + 1) % preview.images.length)} aria-label="Next image">›</button></>}
          <small>{preview.images.length ? `Image ${imageIndex + 1} of ${preview.images.length}` : "Generated artwork shown until a photo is saved"}</small>
        </div>
        <div className={styles.previewCopy}>
          <span>{category}</span>
          {preview.featured && <em>Featured product</em>}
          <h2>{preview.name}</h2>
          <p>{weight} pack · Vegetarian · {stock > 0 ? `${stock} available` : "Out of stock"}</p>
          <strong>₹{preview.price.toLocaleString("en-IN")}</strong>
          <p>Homemade in small batches by Vedha. Carefully prepared using a homestyle process and packed for freshness.</p>
          {!preview.active && <div className={styles.previewHidden}>This product will be hidden from the website.</div>}
          <button className={styles.previewCart} type="button" disabled={stock <= 0}>{stock > 0 ? "Add to cart" : "Out of stock"}</button>
        </div>
      </section>
    </div>}
  </>;
}
