import { motion } from "framer-motion";

import styles from "../council-gazette.module.css";
import type { BodyFontOption, BodySizeOption, CouncilResponse } from "../types";
import { EditorialSection } from "./EditorialSection";
import { VoiceColumn } from "./VoiceColumn";

type BroadsheetOutputProps = {
  result: CouncilResponse;
  onReset: () => void;
  bodyFontOption: BodyFontOption;
  bodySizeOption: BodySizeOption;
  onSetBodyFontOption: (option: BodyFontOption) => void;
  onSetBodySizeOption: (option: BodySizeOption) => void;
};

const FONT_OPTIONS: Array<{ value: BodyFontOption; label: string }> = [
  { value: "libre", label: "Classic" },
  { value: "cormorant", label: "Elegant" },
  { value: "playfair", label: "Editorial" },
  { value: "caveat", label: "Handwritten" },
  { value: "kalam", label: "Casual" },
];

const SIZE_OPTIONS: Array<{ value: BodySizeOption; label: string }> = [
  { value: 16, label: "S" },
  { value: 18, label: "M" },
  { value: 21, label: "L" },
  { value: 24, label: "XL" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function findAnswer(result: CouncilResponse, model: "gpt" | "deepseek" | "gemini") {
  return result.answers.find((answer) => answer.model === model);
}

export function BroadsheetOutput({
  result,
  onReset,
  bodyFontOption,
  bodySizeOption,
  onSetBodyFontOption,
  onSetBodySizeOption,
}: BroadsheetOutputProps) {
  const gpt = findAnswer(result, "gpt");
  const deepseek = findAnswer(result, "deepseek");
  const gemini = findAnswer(result, "gemini");

  if (!gpt || !deepseek || !gemini) {
    return null;
  }

  return (
    <section className={styles.broadsheet}>
      <div className={styles.questionBanner}>
        <span className={styles.bannerEyebrow}>Question Before the Council —</span>
        <span className={styles.bannerQ}>&quot;{result.question}&quot;</span>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderRule} />
        <span className={styles.sectionHeaderOrnament}>✦</span>
        <span className={styles.sectionHeaderLabel}>Dispatches from the correspondents</span>
        <span className={styles.sectionHeaderOrnament}>✦</span>
        <div className={styles.sectionHeaderRule} />
      </div>

      <div className={styles.typeToolbar}>
        <div className={styles.typeToolbarGroup}>
          <span className={styles.typeToolbarLabel}>Typeface</span>
          <div className={styles.typePills}>
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.typePill} ${bodyFontOption === option.value ? styles.typePillActive : ""}`}
                onClick={() => onSetBodyFontOption(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.typeToolbarGroup}>
          <span className={styles.typeToolbarLabel}>Size</span>
          <div className={styles.sizeRow}>
            {SIZE_OPTIONS.map((option, index) => (
              <div key={option.value} className={styles.sizeItem}>
                <button
                  type="button"
                  className={`${styles.sizeBtn} ${bodySizeOption === option.value ? styles.typePillActive : ""}`}
                  onClick={() => onSetBodySizeOption(option.value)}
                >
                  {option.label}
                </button>
                {index < SIZE_OPTIONS.length - 1 ? <span className={styles.sizeDot}>·</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div className={styles.threeColumns} variants={container} initial="hidden" animate="show">
        <motion.div variants={item}>
          <VoiceColumn
            answer={gpt}
            correspondentLabel="Correspondent I"
            displayName="GPT-4o"
            modelLine="OpenAI · San Francisco"
            dispatchLine="GPT-4o · OpenAI"
            bodyFontOption={bodyFontOption}
            bodySizeOption={bodySizeOption}
          />
        </motion.div>

        <div className={styles.colRule} />

        <motion.div variants={item}>
          <VoiceColumn
            answer={deepseek}
            correspondentLabel="Correspondent II"
            displayName="DeepSeek"
            modelLine="DeepSeek · Hangzhou"
            dispatchLine="DeepSeek · DeepSeek"
            bodyFontOption={bodyFontOption}
            bodySizeOption={bodySizeOption}
          />
        </motion.div>

        <div className={styles.colRule} />

        <motion.div variants={item}>
          <VoiceColumn
            answer={gemini}
            correspondentLabel="Correspondent III"
            displayName="Gemini"
            modelLine="Google DeepMind · Mountain View"
            dispatchLine="Gemini · Google DeepMind"
            bodyFontOption={bodyFontOption}
            bodySizeOption={bodySizeOption}
          />
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}>
        <EditorialSection synthesis={result.synthesis} />
      </motion.div>

      <div className={styles.paperFooter}>
        <span>The Council Gazette · Day 10 · 75 Products 75 Days · Ashish Gayakwar</span>
        <button type="button" className={styles.newQBtn} onClick={onReset}>
          ← New Question
        </button>
      </div>
    </section>
  );
}
