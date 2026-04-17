import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

import type { MethodKey } from "../lib/tokenizers";

interface VerdictItem {
  method: MethodKey;
  label: string;
  count: number;
  max: number;
  index: number;
}

interface VerdictCardProps {
  show: boolean;
  items: VerdictItem[];
}

function CountNumber({ value, delay }: { value: number; delay: number }) {
  const prefersReducedMotion = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (latest) => Math.round(latest));

  useEffect(() => {
    mv.set(prefersReducedMotion ? value : 0);
    if (prefersReducedMotion) return;
    const controls = animate(mv, value, {
      duration: 0.7,
      delay,
      ease: [0.25, 1, 0.5, 1],
    });
    return () => controls.stop();
  }, [delay, mv, prefersReducedMotion, value]);

  return <motion.span>{rounded}</motion.span>;
}

export default function VerdictCard({ show, items }: VerdictCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      className="tl-insight"
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 0.7,
        delay: prefersReducedMotion ? 0 : 2.75,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="tl-eyebrow-d">AT A GLANCE</div>
      <h3>
        Fewer tokens means <em>faster, cheaper, smarter</em> models. This is why subword tokenization won.
      </h3>

      <div className="tl-rows">
        {items.map((item) => {
          const pct = item.max > 0 ? (item.count / item.max) * 100 : 0;
          return (
            <div className="tl-row" key={item.method}>
              <div className="tl-name-group">
                <div className="tl-count">
                  <CountNumber value={item.count} delay={prefersReducedMotion ? 0 : 2.95 + item.index * 0.08} />
                </div>
                <div className="tl-name">{item.label}</div>
              </div>
              <div className="tl-bar">
                <motion.span
                  initial={false}
                  animate={{ width: show ? `${pct}%` : "0%" }}
                  transition={{
                    duration: prefersReducedMotion ? 0.01 : 0.8,
                    delay: prefersReducedMotion ? 0 : 3 + item.index * 0.12,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
