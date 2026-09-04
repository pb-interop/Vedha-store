import styles from "./page.module.css";

export default function Home() {
  return (
    <iframe
      className={styles.legacyFrame}
      src="/storefront.html"
      title="Vedha Homemade Food Products"
    />
  );
}
