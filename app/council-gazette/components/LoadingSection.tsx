import styles from "../council-gazette.module.css";

type LoadingSectionProps = {
  message: string;
};

export function LoadingSection({ message }: LoadingSectionProps) {
  return (
    <section className={styles.loadingSection}>
      <span className={styles.loadingOrnament}>✦</span>
      <div className={styles.loadingHeadlineTxt}>{message}</div>
      <div className={styles.loadingSubtext}>Dispatches being received from all three correspondents</div>
    </section>
  );
}
