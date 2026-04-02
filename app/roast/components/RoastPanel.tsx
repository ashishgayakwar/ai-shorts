"use client";

import { motion } from "framer-motion";

import type { RoastExhibit } from "../types";
import styles from "../roast.module.css";

interface RoastPanelProps {
  exhibit: RoastExhibit;
  panelIndex: number;
  animationDelay: number;
}

const skulls = ["", "☠", "☠☠", "☠☠☠"];
const decoSymbols = ["✕", "→", "", "!", "☹", "⚡"];
const panelRotations = [-1, 0.5, 1.2, -0.8, 0.6, -0.4];
const panelNudges = [
  "TEST WITH 5 USERS THIS WEEK.",
  "NAME ONE DEFENSIBLE EDGE NOW.",
  "RUN A PRICE SENSITIVITY CHECK.",
  "CUT SCOPE TO A SINGLE USE CASE.",
  "MEASURE WEEK-2 RETENTION EARLY.",
  "LIST BLOCKERS BEFORE BUILDING.",
];

export default function RoastPanel({ exhibit, panelIndex, animationDelay }: RoastPanelProps) {
  const cardClass = `${styles.panel} ${styles[`panel${panelIndex + 1}`]}`;
  const decoSymbol = decoSymbols[panelIndex] ?? "";
  const rotate = panelRotations[panelIndex] ?? 0;
  const shouldShowNudge = exhibit.body.trim().length < 78;
  const nudge = panelNudges[panelIndex] ?? "VALIDATE BEFORE BUILD.";

  return (
    <motion.div
      className={cardClass}
      initial={{ opacity: 0, y: 20, rotate }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 0.45,
        delay: animationDelay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {panelIndex === 2 ? <div className={styles.circleDeco} /> : <div className={styles.deco}>{decoSymbol}</div>}

      <span className={styles.cardTag}>{exhibit.tag}</span>
      <div className={styles.cardVerdict}>{exhibit.verdict}</div>
      <div className={styles.cardBody}>{exhibit.body}</div>
      {shouldShowNudge ? <div className={styles.cardNudge}>NEXT MOVE: {nudge}</div> : null}
      <div className={styles.skullR}>{skulls[exhibit.brutality]}</div>
    </motion.div>
  );
}
