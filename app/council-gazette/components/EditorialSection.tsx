import styles from "../council-gazette.module.css";
import type { SynthesisResult } from "../types";

type EditorialSectionProps = {
  synthesis: SynthesisResult;
};

export function EditorialSection({ synthesis }: EditorialSectionProps) {
  return (
    <section className={styles.editorialSection}>
      <div className={styles.editorialHeader}>
        <div className={styles.editorialHeaderLine} />
        <div className={styles.editorialTitleBlock}>
          <div className={styles.editorialKicker}>The Editor&apos;s Column</div>
          <h3 className={styles.editorialTitle}>
            Where Three Minds
            <br />
            <em>Meet &amp; Diverge</em>
          </h3>
        </div>
        <div className={styles.editorialHeaderLine} />
      </div>

      <div className={styles.editorialBody}>
        <div className={styles.synCol}>
          <div className={styles.synKicker}>Points of Consensus</div>
          {synthesis.agree.map((item, idx) => (
            <div key={`${item.slice(0, 24)}-${idx}`} className={styles.synItem}>
              <span className={`${styles.synItemMark} ${styles.synItemMarkAgree}`}>✦</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className={styles.colRule} />

        <div className={styles.synCol}>
          <div className={styles.synKicker}>Points of Contention</div>
          {synthesis.disagree.map((item, idx) => (
            <div key={`${item.slice(0, 24)}-${idx}`} className={styles.synItem}>
              <span className={`${styles.synItemMark} ${styles.synItemMarkSplit}`}>✕</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className={styles.colRule} />

        <div className={styles.verdictCol}>
          <div className={styles.synKicker}>The Editor&apos;s Verdict</div>
          <div className={styles.verdictDrop}>{synthesis.verdict}</div>
        </div>
      </div>
    </section>
  );
}
