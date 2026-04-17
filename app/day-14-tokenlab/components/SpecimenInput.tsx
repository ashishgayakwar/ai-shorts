import { motion, useReducedMotion } from "framer-motion";
import type { RefObject } from "react";

import type { SampleKey } from "../lib/samples";

interface SpecimenInputProps {
  inputText: string;
  isDissecting: boolean;
  isPulsing: boolean;
  charFlip: boolean;
  activeSample: SampleKey | null;
  isAnalyzeFiring: boolean;
  onInputChange: (next: string) => void;
  onSampleClick: (key: SampleKey) => void;
  onAnalyze: () => void;
  specimenRef: RefObject<HTMLElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const SAMPLE_LABELS: Array<{ key: SampleKey; label: string }> = [
  { key: "en", label: "English prose" },
  { key: "code", label: "Code snippet" },
  { key: "emoji", label: "Emoji & unicode" },
  { key: "tech", label: "Tech jargon" },
  { key: "numbers", label: "Numbers" },
];

export default function SpecimenInput({
  inputText,
  isDissecting,
  isPulsing,
  charFlip,
  activeSample,
  isAnalyzeFiring,
  onInputChange,
  onSampleClick,
  onAnalyze,
  specimenRef,
  textareaRef,
}: SpecimenInputProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      ref={specimenRef}
      className={`tl-specimen${isDissecting ? " is-dissecting" : ""}${isPulsing ? " is-pulsing" : ""}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="tl-specimen-header">
        <label htmlFor="tokenlab-input" className="tl-specimen-label" id="tokenlab-specimen-label">
          {isDissecting ? "DISSECTING · SCANNING SPECIMEN" : "SPECIMEN · ORIGINAL TEXT"}
        </label>
        <div className="tl-tags">
          <div className="tl-tag">
            <span className={`tl-dot${inputText.length > 0 ? " is-typing" : ""}`} />
            READY
          </div>
          <div className="tl-tag tl-char-tag">
            <span className={`tl-char-num${charFlip ? " is-flip" : ""}`}>{inputText.length}</span> CHARS
          </div>
        </div>
      </div>

      <textarea
        id="tokenlab-input"
        ref={textareaRef}
        value={inputText}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder="Paste any text here..."
        aria-labelledby="tokenlab-specimen-label"
      />

      <div className="tl-specimen-footer">
        <div className="tl-samples">
          {SAMPLE_LABELS.map((sample) => (
            <button
              key={sample.key}
              type="button"
              className={`tl-sample-chip${activeSample === sample.key ? " is-active" : ""}`}
              onClick={() => onSampleClick(sample.key)}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`tl-analyze-btn${isAnalyzeFiring ? " is-firing" : ""}`}
          onClick={onAnalyze}
          disabled={inputText.trim().length === 0}
        >
          Analyze <span className="tl-arr">→</span>
        </button>
      </div>
    </motion.section>
  );
}
