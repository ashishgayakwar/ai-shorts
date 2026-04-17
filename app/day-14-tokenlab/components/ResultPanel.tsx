import { motion, useReducedMotion } from "framer-motion";

import type { MethodKey, Token } from "../lib/tokenizers";
import TokenChip from "./TokenChip";

interface ResultPanelProps {
  methodNumber: number;
  method: MethodKey;
  title: string;
  subtitle: string;
  tokens: Token[];
  panelIndex: number;
  unique: number;
  charsPerToken: string;
  highlightedKeys: Set<string>;
  hasHover: boolean;
  onHoverStart: (token: Token, tokenKey: string) => void;
  onHoverEnd: () => void;
  registerRef: (tokenKey: string, node: HTMLSpanElement | null) => void;
}

export default function ResultPanel({
  methodNumber,
  method,
  title,
  subtitle,
  tokens,
  panelIndex,
  unique,
  charsPerToken,
  highlightedKeys,
  hasHover,
  onHoverStart,
  onHoverEnd,
  registerRef,
}: ResultPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className="tl-panel"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 0.5,
        delay: prefersReducedMotion ? 0 : 0.35 + panelIndex * 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <header className="tl-panel-head">
        <div className="tl-panel-num">METHOD 0{methodNumber}</div>
        <div className="tl-panel-title">
          {title} <small>· {subtitle}</small>
        </div>
        <div className="tl-panel-stats">
          <div className="tl-stat">
            <span className="k">TOKENS</span>
            <span className="v">{tokens.length}</span>
          </div>
          <div className="tl-stat">
            <span className="k">CHARS/TOK</span>
            <span className="v">{charsPerToken}</span>
          </div>
          <div className="tl-stat">
            <span className="k">UNIQUE</span>
            <span className="v">{unique}</span>
          </div>
        </div>
      </header>

      <div className="tl-panel-body">
        <div className="tl-tokens">
          {tokens.map((token, tokenIndex) => {
            const tokenKey = `${method}-${tokenIndex}`;
            return (
              <TokenChip
                key={tokenKey}
                token={token}
                tokenIndex={tokenIndex}
                panelIndex={panelIndex}
                tokenKey={tokenKey}
                highlighted={highlightedKeys.has(tokenKey)}
                dimmed={hasHover && !highlightedKeys.has(tokenKey)}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
                registerRef={registerRef}
              />
            );
          })}
        </div>
      </div>
    </motion.article>
  );
}
