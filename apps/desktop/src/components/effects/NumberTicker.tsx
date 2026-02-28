import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';

interface NumberTickerProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export function NumberTicker({ value, className = '', style }: NumberTickerProps) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className} style={style}>{display}</motion.span>;
}
