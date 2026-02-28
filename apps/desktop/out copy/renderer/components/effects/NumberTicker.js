import { jsx as _jsx } from "react/jsx-runtime";
import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
export function NumberTicker({ value, className = '', style }) {
    const spring = useSpring(0, { stiffness: 80, damping: 20 });
    const display = useTransform(spring, (v) => Math.round(v).toString());
    useEffect(() => {
        spring.set(value);
    }, [spring, value]);
    return _jsx(motion.span, { className: className, style: style, children: display });
}
