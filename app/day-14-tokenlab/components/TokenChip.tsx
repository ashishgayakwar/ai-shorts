import { motion, useReducedMotion } from "framer-motion";

import type { Token } from "../lib/tokenizers";

interface TokenChipProps {
  token: Token;
  tokenIndex: number;
  panelIndex: number;
  tokenKey: string;
  highlighted: boolean;
  dimmed: boolean;
  onHoverStart: (token: Token, tokenKey: string) => void;
  onHoverEnd: () => void;
  registerRef: (tokenKey: string, node: HTMLSpanElement | null) => void;
}

export default function TokenChip({
  token,
  tokenIndex,
  panelIndex,
  tokenKey,
  highlighted,
  dimmed,
  onHoverStart,
  onHoverEnd,
  registerRef,
}: TokenChipProps) {
  const prefersReducedMotion = useReducedMotion();
  const shown = (token.isSpace ? "·" : token.text).replace(/Ġ/g, "␣");

  return (
    <motion.span
      ref={(node) => registerRef(tokenKey, node)}
      className={`tl-tok${token.isSpace ? " is-space" : ""}${token.isSpecial ? " is-special" : ""}${highlighted ? " is-hl" : ""}${dimmed ? " is-dimmed" : ""}`}
      data-c={tokenIndex % 6}
      onMouseEnter={() => onHoverStart(token, tokenKey)}
      onMouseLeave={onHoverEnd}
      onTouchStart={() => onHoverStart(token, tokenKey)}
      onTouchEnd={onHoverEnd}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 0.28,
        delay: prefersReducedMotion ? 0 : panelIndex * 0.45 + 0.65 + tokenIndex * 0.025,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      <span>{shown}</span>
      <span className="tl-id">{token.id}</span>
    </motion.span>
  );
}
