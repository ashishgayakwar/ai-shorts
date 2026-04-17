import { motion, useReducedMotion } from "framer-motion";

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="tl-hero">
      <motion.div
        className="tl-day-badge"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <b>14</b>
        SPECIMEN
        <br />
        NO. 014
      </motion.div>

      <div className="tl-eyebrow">
        <span className="tl-eyebrow-dash" />
        A FIELD GUIDE TO TOKENIZATION
      </div>

      <h1>
        {["How the", "machine ", "your words."].map((line, index) => (
          <motion.span
            key={line}
            className="tl-line"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24, filter: "blur(12px)" }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.15 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {index === 1 ? (
              <>
                machine <em>reads</em>
              </>
            ) : (
              line
            )}
          </motion.span>
        ))}
      </h1>

      <motion.p
        className="tl-lede"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        Before a language model does anything, it chops your text into tokens. Different methods chop
        differently. Paste a sentence and watch four classic tokenizers cut the same text four different ways.
      </motion.p>
    </section>
  );
}
