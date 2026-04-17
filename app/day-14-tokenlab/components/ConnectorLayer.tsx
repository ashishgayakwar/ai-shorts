import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ConnectorLayerProps {
  sourceKey: string | null;
  targetKeys: string[];
  getElementByKey: (key: string) => HTMLElement | null;
}

interface Connector {
  id: string;
  d: string;
}

export default function ConnectorLayer({ sourceKey, targetKeys, getElementByKey }: ConnectorLayerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const shouldShow = Boolean(sourceKey) && targetKeys.length > 1;
  const stableTargets = useMemo(() => [...targetKeys].sort(), [targetKeys]);

  const measure = useCallback(() => {
    if (!sourceKey) {
      setConnectors([]);
      return;
    }

    const sourceEl = getElementByKey(sourceKey);
    if (!sourceEl) {
      setConnectors([]);
      return;
    }

    const src = sourceEl.getBoundingClientRect();
    const srcX = src.left + src.width / 2 + window.scrollX;
    const srcY = src.top + src.height / 2 + window.scrollY;

    const next: Connector[] = [];

    for (const key of stableTargets) {
      if (key === sourceKey) continue;
      const targetEl = getElementByKey(key);
      if (!targetEl) continue;

      const rect = targetEl.getBoundingClientRect();
      const tx = rect.left + rect.width / 2 + window.scrollX;
      const ty = rect.top + rect.height / 2 + window.scrollY;
      const midY = (srcY + ty) / 2;
      const d = `M ${srcX} ${srcY} C ${srcX} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
      next.push({ id: `${sourceKey}->${key}`, d });
    }

    setSize({ width: window.innerWidth, height: document.documentElement.scrollHeight });
    setConnectors(next);
  }, [getElementByKey, sourceKey, stableTargets]);

  useEffect(() => {
    if (!shouldShow) return;
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [measure, shouldShow]);

  useEffect(() => {
    const onResize = () => {
      setConnectors([]);
      setSize({ width: window.innerWidth, height: document.documentElement.scrollHeight });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        measure();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [measure, shouldShow]);

  const visibleConnectors = shouldShow ? connectors : [];

  return (
    <svg
      className={`tl-connector-layer${visibleConnectors.length > 0 ? " is-active" : ""}`}
      width={size.width || undefined}
      height={size.height || undefined}
      style={{ width: size.width || undefined, height: size.height || undefined }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {visibleConnectors.map((connector) => (
          <motion.path
            key={connector.id}
            d={connector.d}
            initial={prefersReducedMotion ? false : { opacity: 0, strokeDashoffset: 200 }}
            animate={prefersReducedMotion ? undefined : { opacity: 0.45, strokeDashoffset: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.4, ease: [0.76, 0, 0.24, 1] }}
          />
        ))}
      </AnimatePresence>
    </svg>
  );
}
