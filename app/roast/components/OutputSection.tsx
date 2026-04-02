"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import type { RoastInput, RoastResult } from "../types";
import RoastPanel from "./RoastPanel";
import styles from "../roast.module.css";

interface OutputSectionProps {
  result: RoastResult;
  input: RoastInput;
  onReset: () => void;
}

const BASE_DELAY_MS = 420;
const AFTER_PANELS_DELAY_MS = 6 * BASE_DELAY_MS;

export default function OutputSection({ result, input, onReset }: OutputSectionProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `My idea just got roasted.\n\n"${input.idea}"\n\nThe verdict was not kind.\n\nDay 08 of @AshishGayakwar's 75 Products 75 Days\n#ProductManagement #AIPM #BuildInPublic`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors in UI
    }
  };

  const contextTags = [input.audience, input.stage, input.risk].filter(
    (value): value is string => Boolean(value)
  );

  return (
    <div className={styles.output}>
      <motion.div
        className={styles.dossier}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <div className={styles.dosStamp}>EXHIBIT A — IDEA UNDER TRIAL</div>
        <div className={styles.dosIdea}>&quot;{input.idea}&quot;</div>
        <div className={styles.dosTags}>
          {contextTags.length > 0 ? (
            contextTags.map((tag) => (
              <div key={tag} className={styles.dtag}>
                {tag}
              </div>
            ))
          ) : (
            <div className={styles.dtag}>NO CONTEXT — BOLD MOVE</div>
          )}
        </div>
      </motion.div>

      <div className={styles.chaosGrid}>
        {result.exhibits.map((exhibit, panelIndex) => (
          <RoastPanel
            key={`${panelIndex}-${exhibit.tag}`}
            exhibit={exhibit}
            panelIndex={panelIndex}
            animationDelay={panelIndex * BASE_DELAY_MS}
          />
        ))}
      </div>

      <motion.div
        className={styles.verdictRow}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: (AFTER_PANELS_DELAY_MS + 100) / 1000 }}
      >
        <div className={styles.scoreBlock}>
          <div className={styles.scoreBang}>!</div>
          <div className={styles.scoreLbl}>OFFICIAL VERDICT</div>
          <div className={styles.scoreLine}>{result.score.line}</div>
          <div className={styles.scoreIdx}>BRUTALITY INDEX: {result.score.index}/100</div>
        </div>
        <div className={styles.circleBadge}>
          <div className={styles.cbNum}>{result.score.index}</div>
          <div className={styles.cbLbl}>/ 100</div>
        </div>
      </motion.div>

      <motion.div
        className={styles.redemption}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: (AFTER_PANELS_DELAY_MS + 600) / 1000 }}
      >
        <div className={styles.redArrowBig}>↑</div>
        <div className={styles.redContent}>
          <span className={styles.redFlag}>BUT WAIT — THE DEFENCE SPEAKS</span>
          <div className={styles.redTitle}>{result.defence.title}</div>
          <div className={styles.redBody}>{result.defence.body}</div>
        </div>
        <div className={styles.smileyDeco}>:)</div>
      </motion.div>

      <motion.div
        className={styles.closing}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: (AFTER_PANELS_DELAY_MS + 1000) / 1000 }}
      >
        <div className={styles.closeTxt}>
          Now stop reading this
          <br />
          and go validate it.
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.obtn} onClick={handleShare}>
            {copied ? "COPIED!" : "SHARE ↗"}
          </button>
          <button type="button" className={`${styles.obtn} ${styles.obtnGhost}`} onClick={onReset}>
            ← TRY ANOTHER
          </button>
        </div>
      </motion.div>
    </div>
  );
}
