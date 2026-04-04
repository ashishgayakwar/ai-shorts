import { Fragment } from "react";

import styles from "../council-gazette.module.css";
import type { BodyFontOption, BodySizeOption, ModelAnswer } from "../types";

type VoiceColumnProps = {
  answer: ModelAnswer;
  correspondentLabel: string;
  displayName: string;
  modelLine: string;
  dispatchLine: string;
  bodyFontOption: BodyFontOption;
  bodySizeOption: BodySizeOption;
};

type InlinePart = {
  text: string;
  bold: boolean;
};

function parseInlineBold(text: string): InlinePart[] {
  const pattern = /\*\*(.*?)\*\*/g;
  const out: InlinePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    out.push({ text: match[1], bold: true });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    out.push({ text: text.slice(lastIndex), bold: false });
  }

  return out;
}

function renderBody(body: string) {
  const paragraphs = body
    .split("\n\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph, idx) => {
    const parts = parseInlineBold(paragraph);
    return (
      <p key={`${paragraph.slice(0, 24)}-${idx}`}>
        {parts.map((part, partIdx) => (
          <Fragment key={`${part.text.slice(0, 12)}-${partIdx}`}>
            {part.bold ? <strong>{part.text}</strong> : part.text}
          </Fragment>
        ))}
      </p>
    );
  });
}

export function VoiceColumn({
  answer,
  correspondentLabel,
  displayName,
  modelLine,
  dispatchLine,
  bodyFontOption,
  bodySizeOption,
}: VoiceColumnProps) {
  const elapsedSeconds = typeof answer.elapsed === "number" ? (answer.elapsed / 1000).toFixed(1) : null;

  const fontClassByOption: Record<BodyFontOption, string> = {
    libre: styles.colBodyFontLibre,
    cormorant: styles.colBodyFontCormorant,
    playfair: styles.colBodyFontPlayfair,
    caveat: styles.colBodyFontCaveat,
    kalam: styles.colBodyFontKalam,
  };

  const sizeClassByOption: Record<BodySizeOption, string> = {
    16: styles.colBodySize16,
    18: styles.colBodySize18,
    21: styles.colBodySize21,
    24: styles.colBodySize24,
  };

  return (
    <article className={styles.voiceColumn}>
      <div className={styles.byline}>
        <div className={styles.bylineFrom}>{correspondentLabel}</div>
        <div className={styles.bylineName}>{displayName}</div>
        <div className={styles.bylineModel}>{modelLine}</div>
        <div className={styles.bylineStatus}>
          <span className={`${styles.statusSq} ${answer.status === "done" ? styles.statusSqDone : ""}`} />
          <span>{answer.status === "done" ? "Received" : "Transmission error"}</span>
        </div>
      </div>

      <h3 className={styles.colHeadline}>{answer.headline}</h3>
      <div
        className={`${styles.colBody} ${styles.dropCap} ${
          fontClassByOption[bodyFontOption]
        } ${sizeClassByOption[bodySizeOption]}`}
      >
        {renderBody(answer.body)}
      </div>
      <div className={styles.transmissionBar}>
        <span>{dispatchLine}</span>
        <span>{elapsedSeconds ? `Received in ${elapsedSeconds}s` : "—"}</span>
      </div>
    </article>
  );
}
