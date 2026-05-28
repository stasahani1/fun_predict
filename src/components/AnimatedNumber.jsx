import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function AnimatedNumber({
  value,
  format = "percent",
  className = "",
}) {
  const spring = useSpring(value, { stiffness: 200, damping: 30 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) => {
    if (format === "percent") return `${Math.round(v)}%`;
    if (format === "currency") return `$${v.toFixed(2)}`;
    return String(Math.round(v));
  });

  return (
    <motion.span className={`tabular-nums ${className}`}>
      {display}
    </motion.span>
  );
}
