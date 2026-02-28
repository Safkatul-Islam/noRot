import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
function Card({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card", className: cn("relative flex flex-col gap-6 overflow-hidden rounded-xl border border-white/6 bg-[var(--color-glass)] py-6 text-text-primary shadow-[0_24px_44px_-34px_rgba(0,0,0,0.95)] backdrop-blur-md before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/10", className), ...props }));
}
function CardHeader({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-header", className: cn("relative z-10 @container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className), ...props }));
}
function CardTitle({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-title", className: cn("text-sm leading-none font-semibold", className), ...props }));
}
function CardDescription({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-description", className: cn("text-muted-foreground text-sm", className), ...props }));
}
function CardAction({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-action", className: cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className), ...props }));
}
function CardContent({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-content", className: cn("relative z-10 px-6", className), ...props }));
}
function CardFooter({ className, ...props }) {
    return (_jsx("div", { "data-slot": "card-footer", className: cn("relative z-10 flex items-center px-6 [.border-t]:pt-6", className), ...props }));
}
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, };
