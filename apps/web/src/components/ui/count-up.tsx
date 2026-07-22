"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Animated numeric counter. Counts from 0 → `value` once on mount (and again
 * whenever `value` changes), respecting reduced-motion preferences.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 0.9,
  prefix = "",
  suffix = "",
  format,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }

    const controls = animate(prev.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  const text = format
    ? format(display)
    : `${prefix}${display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

  return <span className={className}>{text}</span>;
}
