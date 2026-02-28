import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
export function BlurFade({ children, className, delay = 0, duration = 0.4, yOffset = 8, }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-50px' });
    return (_jsx(motion.div, { ref: ref, className: className, initial: { opacity: 0, filter: 'blur(6px)', y: yOffset }, animate: inView
            ? { opacity: 1, filter: 'blur(0px)', y: 0 }
            : { opacity: 0, filter: 'blur(6px)', y: yOffset }, transition: { duration, delay, ease: 'easeOut' }, children: children }));
}
