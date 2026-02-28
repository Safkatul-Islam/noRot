"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
function TooltipProvider({ delayDuration = 0, ...props }) {
    return (_jsx(TooltipPrimitive.Provider, { "data-slot": "tooltip-provider", delayDuration: delayDuration, ...props }));
}
function Tooltip({ ...props }) {
    return _jsx(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props });
}
function TooltipTrigger({ ...props }) {
    return _jsx(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({ className, sideOffset = 0, children, ...props }) {
    return (_jsx(TooltipPrimitive.Portal, { children: _jsxs(TooltipPrimitive.Content, { "data-slot": "tooltip-content", sideOffset: sideOffset, className: cn("z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-lg border border-white/12 bg-[var(--color-glass)] px-3 py-1.5 text-xs text-text-primary text-balance shadow-[0_18px_35px_-20px_rgba(0,0,0,0.95),0_0_22px_-14px_var(--color-glow-primary)] backdrop-blur-md animate-in fade-in-0 zoom-in-[0.92] duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-in data-[side=bottom]:slide-in-from-top-3 data-[side=left]:slide-in-from-right-3 data-[side=right]:slide-in-from-left-3 data-[side=top]:slide-in-from-bottom-3", className), ...props, children: [children, _jsx(TooltipPrimitive.Arrow, { className: "bg-[var(--color-glass)] fill-[var(--color-glass)] z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })] }) }));
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
