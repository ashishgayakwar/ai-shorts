"use client";

import { useEffect, useState } from "react";

import type { ChipGroup, RoastInput } from "../types";
import styles from "../roast.module.css";

interface InputSectionProps {
  onSubmit: (input: RoastInput) => void;
  loading: boolean;
  errorMsg?: string;
  initialIdea?: string;
  initialSelection?: Pick<RoastInput, "audience" | "stage" | "risk">;
}

const CHIPS: Record<ChipGroup, string[]> = {
  audience: ["Consumers", "Businesses", "Developers", "Everyone (lol)"],
  stage: ["Just an idea", "Building it", "Already launched"],
  risk: ["No one will pay", "Too much competition", "Too hard to build", "¯\\_(ツ)_/¯"],
};

type SelectedState = {
  audience: string | null;
  stage: string | null;
  risk: string | null;
};

const INITIAL_SELECTED: SelectedState = {
  audience: null,
  stage: null,
  risk: null,
};

export default function InputSection({
  onSubmit,
  loading,
  errorMsg,
  initialIdea = "",
  initialSelection,
}: InputSectionProps) {
  const [idea, setIdea] = useState(initialIdea);
  const [selected, setSelected] = useState<SelectedState>(INITIAL_SELECTED);

  useEffect(() => {
    setIdea(initialIdea);
  }, [initialIdea]);

  useEffect(() => {
    setSelected({
      audience: initialSelection?.audience ?? null,
      stage: initialSelection?.stage ?? null,
      risk: initialSelection?.risk ?? null,
    });
  }, [initialSelection]);

  const handleChip = (group: ChipGroup, value: string) => {
    setSelected((prev) => ({
      ...prev,
      [group]: prev[group] === value ? null : value,
    }));
  };

  const handleSubmit = () => {
    if (idea.trim().length < 5 || loading) return;
    onSubmit({
      idea: idea.trim(),
      audience: selected.audience,
      stage: selected.stage,
      risk: selected.risk,
    });
  };

  return (
    <div className={styles.inputWrap}>
      <div className={styles.labelRow}>
        <span className={styles.arr}>→</span>
        <span className={styles.lbl}>YOUR IDEA. ONE LINE.</span>
      </div>

      <div className={styles.ideaBox}>
        <input
          className={styles.ideaInput}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
          type="text"
          placeholder="An app that..."
          maxLength={300}
          autoComplete="off"
        />
      </div>

      <div className={styles.chipsGrid}>
        <div>
          <div className={styles.cgLabel}>WHO&apos;S IT FOR</div>
          <div className={styles.chipRow}>
            {CHIPS.audience.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${selected.audience === option ? styles.chipActive : ""}`}
                onClick={() => handleChip("audience", option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.cgLabel}>STAGE</div>
          <div className={styles.chipRow}>
            {CHIPS.stage.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${selected.stage === option ? styles.chipActive : ""}`}
                onClick={() => handleChip("stage", option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.cgLabel}>BIGGEST FEAR</div>
          <div className={styles.chipRow}>
            {CHIPS.risk.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${selected.risk === option ? styles.chipActive : ""}`}
                onClick={() => handleChip("risk", option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.submitRow}>
        <button
          type="button"
          className={styles.roastBtn}
          onClick={handleSubmit}
          disabled={idea.trim().length < 5 || loading}
        >
          ROAST ME →
        </button>
        <span className={styles.charCt}>{idea.length}/300</span>
      </div>

      {errorMsg ? <div className={styles.err}>{errorMsg}</div> : null}
    </div>
  );
}
