import styles from "../council-gazette.module.css";

type DotState = "idle" | "active" | "done";

type InputSectionProps = {
  question: string;
  errorMsg: string;
  disabled: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  dotStates: {
    gpt: DotState;
    deepseek: DotState;
    gemini: DotState;
    synthesis: DotState;
  };
};

const MAX_LEN = 5000;

function Dot({ state }: { state: DotState }) {
  return <span className={`${styles.corrDot} ${state === "active" ? styles.corrDotActive : ""} ${state === "done" ? styles.corrDotDone : ""}`} />;
}

export function InputSection({ question, errorMsg, disabled, onQuestionChange, onSubmit, dotStates }: InputSectionProps) {
  const charCount = question.length;

  return (
    <section className={styles.inputSection}>
      <h2 className={styles.inputHeadline}>
        Submit Your Question to the Council
      </h2>
      <p className={styles.inputDeck}>
        Your question is dispatched simultaneously to three correspondents.
        <br />
        Each files their report. Then the editor delivers the verdict.
      </p>

      <div className={styles.inputBoxWrap}>
        <div className={styles.questionNote}>
          <textarea
            className={styles.questionInput}
            value={question}
            onChange={(event) => onQuestionChange(event.target.value.slice(0, MAX_LEN))}
            placeholder="e.g. How would you improve retention for Spotify Premium in India?"
            maxLength={MAX_LEN}
            rows={3}
          />
        </div>
        <div className={styles.inputFooterRow}>
          <button type="button" className={styles.submitBtn} onClick={onSubmit} disabled={disabled}>
            Dispatch to Council →
          </button>
          <span className={styles.charCount}>{charCount} / {MAX_LEN}</span>
        </div>
        {errorMsg ? <p className={styles.errorLine}>{errorMsg}</p> : null}
      </div>

      <div className={styles.correspondentsRow}>
        <div className={styles.corrItem}>
          <Dot state={dotStates.gpt} /> GPT-4o · OpenAI
        </div>
        <div className={styles.corrItem}>✦</div>
        <div className={styles.corrItem}>
          <Dot state={dotStates.deepseek} /> DeepSeek · DeepSeek
        </div>
        <div className={styles.corrItem}>✦</div>
        <div className={styles.corrItem}>
          <Dot state={dotStates.gemini} /> Gemini · Google
        </div>
        <div className={styles.corrItem}>✦</div>
        <div className={styles.corrItem}>
          <span
            className={`${styles.corrDot} ${dotStates.synthesis === "done" ? styles.corrDotDone : ""}`}
            style={{ opacity: dotStates.synthesis === "done" ? 1 : 0.4 }}
          />
          The Editor&apos;s Verdict
        </div>
      </div>
    </section>
  );
}
