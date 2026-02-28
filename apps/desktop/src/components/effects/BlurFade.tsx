import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
}

export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.4,
  yOffset = 8,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: 'blur(6px)', y: yOffset }}
      animate={
        inView
          ? { opacity: 1, filter: 'blur(0px)', y: 0 }
          : { opacity: 0, filter: 'blur(6px)', y: yOffset }
      }
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
