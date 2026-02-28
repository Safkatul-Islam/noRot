import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useScoreStore } from '@/stores/score-store';
import { toFocusScore, getFocusBand } from '@norot/shared';
import { NumberTicker } from '@/components/effects/NumberTicker';
const SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CENTER = SIZE / 2;
const ARC_DEGREES = 270;
const START_ANGLE = 135;
const GLOW_STROKE_WIDTH = STROKE_WIDTH + 8;
const ARC_CIRCUMFERENCE = 2 * Math.PI * RADIUS * (ARC_DEGREES / 360);
const MIN_ARC_SCORE = Math.ceil((GLOW_STROKE_WIDTH / ARC_CIRCUMFERENCE) * 100);
/* Outer decorative ring (thin, dashed, slowly rotating) */
const OUTER_RADIUS = RADIUS + 14;
const OUTER_STROKE = 1.5;
/* Inner decorative ring (very thin, static, depth marker) */
const INNER_RADIUS = RADIUS - 16;
function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
function describeCircle(cx, cy, r) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
}
export function ScoreGauge() {
    const rawScore = useScoreStore((s) => s.currentScore);
    const focusScore = toFocusScore(rawScore);
    const band = useMemo(() => getFocusBand(focusScore), [focusScore]);
    const color = band.color;
    const label = band.label;
    const bgArc = describeArc(CENTER, CENTER, RADIUS, START_ANGLE, START_ANGLE + ARC_DEGREES);
    const scoreAngle = START_ANGLE + (focusScore / 100) * ARC_DEGREES;
    const fgArc = focusScore > 0 ? describeArc(CENTER, CENTER, RADIUS, START_ANGLE, scoreAngle) : '';
    const isTinyArc = focusScore > 0 && focusScore < MIN_ARC_SCORE;
    const dotPos = isTinyArc ? polarToCartesian(CENTER, CENTER, RADIUS, START_ANGLE) : null;
    const outerCircle = describeCircle(CENTER, CENTER, OUTER_RADIUS);
    const innerCircle = describeCircle(CENTER, CENTER, INNER_RADIUS);
    return (_jsx("div", { className: "relative flex flex-col items-center justify-center", children: _jsxs("div", { className: "relative", children: [_jsxs("svg", { width: SIZE + 32, height: SIZE + 32, viewBox: `${-16} ${-16} ${SIZE + 32} ${SIZE + 32}`, children: [_jsxs("defs", { children: [_jsxs("filter", { id: "arc-neon", x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "5", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsxs("filter", { id: "ring-glow", x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "2", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("g", { style: { transformOrigin: `${CENTER}px ${CENTER}px`, animation: 'orbit-slow 20s linear infinite' }, children: _jsx("path", { d: outerCircle, fill: "none", stroke: "rgba(255,255,255,0.06)", strokeWidth: OUTER_STROKE, strokeDasharray: "4 8" }) }), _jsx("path", { d: innerCircle, fill: "none", stroke: "rgba(255,255,255,0.04)", strokeWidth: 0.5 }), _jsx("circle", { cx: CENTER, cy: CENTER, r: INNER_RADIUS - 4, fill: "none", stroke: "rgba(255,255,255,0.03)", strokeWidth: 0.5 }), _jsx("path", { d: bgArc, fill: "none", stroke: "rgba(255,255,255,0.06)", strokeWidth: STROKE_WIDTH, strokeLinecap: "round" }), isTinyArc && dotPos && (_jsxs(_Fragment, { children: [_jsx(motion.circle, { cx: dotPos.x, cy: dotPos.y, r: GLOW_STROKE_WIDTH / 2, fill: color, filter: "url(#arc-neon)", initial: { opacity: 0 }, animate: { opacity: 0.25 }, transition: { type: 'spring', stiffness: 80, damping: 20 } }), _jsx(motion.circle, { cx: dotPos.x, cy: dotPos.y, r: STROKE_WIDTH / 2, fill: color, filter: "url(#ring-glow)", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { type: 'spring', stiffness: 80, damping: 20 } })] })), !isTinyArc && focusScore > 0 && (_jsx(motion.path, { d: fgArc, fill: "none", stroke: color, strokeWidth: GLOW_STROKE_WIDTH, strokeLinecap: "round", filter: "url(#arc-neon)", opacity: 0.25, initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { type: 'spring', stiffness: 80, damping: 20, bounce: 0 } })), !isTinyArc && focusScore > 0 && (_jsx(motion.path, { d: fgArc, fill: "none", stroke: color, strokeWidth: STROKE_WIDTH, strokeLinecap: "round", filter: "url(#ring-glow)", initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { type: 'spring', stiffness: 80, damping: 20, bounce: 0 } })), _jsx("text", { x: CENTER, y: CENTER + 32, textAnchor: "middle", dominantBaseline: "central", style: {
                                fontSize: 11,
                                fontWeight: 600,
                                fill: color,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                opacity: 0.8,
                            }, children: label })] }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center pb-6", children: _jsx(NumberTicker, { value: focusScore, className: "text-5xl font-bold", style: {
                            color,
                            textShadow: `0 0 20px ${color}60, 0 0 40px ${color}30`,
                        } }) })] }) }));
}
