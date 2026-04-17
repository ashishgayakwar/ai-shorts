import { motion, useReducedMotion } from "framer-motion";

interface TryAnotherCTAProps {
  show: boolean;
  onTryAnother: () => void;
}

export default function TryAnotherCTA({ show, onTryAnother }: TryAnotherCTAProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="tl-try-another"
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 0.7,
        delay: prefersReducedMotion ? 0 : 3.4,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className="tl-ta-rule" />
      <button type="button" className="tl-ta-btn" onClick={onTryAnother}>
        <span>Try another specimen</span>
        <span className="tl-ta-arr">→</span>
      </button>
      <div className="tl-ta-rule" />
    </motion.div>
  );
}
