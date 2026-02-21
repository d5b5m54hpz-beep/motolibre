"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (n: number) => string;
}

/**
 * Cuenta animadamente desde 0 hasta `value` al montar el componente.
 * Usa Motion (Framer Motion v11) para la interpolación.
 */
export function AnimatedNumber({
  value,
  duration = 1.2,
  className,
  formatFn,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo — snap to final
      onUpdate(latest) {
        setDisplay(latest);
      },
    });

    return () => controls.stop();
  }, [value, duration]);

  const formatted = formatFn ? formatFn(display) : Math.round(display).toString();

  return (
    <span ref={nodeRef} className={className}>
      {formatted}
    </span>
  );
}
