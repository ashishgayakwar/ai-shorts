import { motion, useReducedMotion } from "framer-motion";

export default function Masthead() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.header
      className="tl-masthead"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.span
        className="tl-masthead-rule"
        initial={prefersReducedMotion ? false : { scaleX: 0 }}
        animate={prefersReducedMotion ? undefined : { scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
      />
      <div>
        <b>TOKENLAB</b> — specimen analysis
      </div>
      <div className="tl-masthead-right">
        <span>DAY 14 / 75</span>
        <span>75 PRODUCTS 75 DAYS</span>
        <span>A. GAYAKWAR</span>
      </div>
    </motion.header>
  );
}
