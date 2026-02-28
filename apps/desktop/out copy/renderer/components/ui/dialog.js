import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
function Dialog({ ...props }) {
    return _jsx(DialogPrimitive.Root, { "data-slot": "dialog", ...props });
}
function DialogTrigger({ ...props }) {
    return _jsx(DialogPrimitive.Trigger, { "data-slot": "dialog-trigger", ...props });
}
function DialogPortal({ ...props }) {
    return _jsx(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props });
}
function DialogClose({ ...props }) {
    return _jsx(DialogPrimitive.Close, { "data-slot": "dialog-close", ...props });
}
function DialogOverlay({ className, ...props }) {
    return (_jsx(DialogPrimitive.Overlay, { "data-slot": "dialog-overlay", className: cn("fixed inset-0 z-[48] bg-black/70 backdrop-blur-sm", className), ...props }));
}
function DialogContent({ className, children, showCloseButton = true, ...props }) {
    return (_jsxs(DialogPortal, { "data-slot": "dialog-portal", children: [_jsx(DialogOverlay, {}), _jsxs(DialogPrimitive.Content, { "data-slot": "dialog-content", className: cn("fixed left-1/2 top-1/2 z-[50] -translate-x-1/2 -translate-y-1/2 grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] gap-4 rounded-xl border border-white/12 bg-[var(--color-glass)] p-6 text-text-primary shadow-[0_30px_70px_-34px_rgba(0,0,0,0.95),0_0_42px_-24px_var(--color-glow-primary)] backdrop-blur-xl outline-none overflow-y-auto before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/12 sm:max-w-lg", className), ...props, children: [children, showCloseButton && (_jsxs(DialogPrimitive.Close, { "data-slot": "dialog-close", className: "absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md border border-transparent text-text-secondary opacity-80 transition-all hover:border-primary/35 hover:bg-primary/12 hover:text-primary hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", children: [_jsx(XIcon, {}), _jsx("span", { className: "sr-only", children: "Close" })] }))] })] }));
}
function DialogHeader({ className, ...props }) {
    return (_jsx("div", { "data-slot": "dialog-header", className: cn("flex flex-col gap-2 text-center sm:text-left", className), ...props }));
}
function DialogFooter({ className, showCloseButton = false, children, ...props }) {
    return (_jsxs("div", { "data-slot": "dialog-footer", className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className), ...props, children: [children, showCloseButton && (_jsx(Button, { variant: "outline", asChild: true, children: _jsx(DialogPrimitive.Close, { children: "Close" }) }))] }));
}
function DialogTitle({ className, ...props }) {
    return (_jsx(DialogPrimitive.Title, { "data-slot": "dialog-title", className: cn("text-lg leading-none font-semibold tracking-tight text-text-primary", className), ...props }));
}
function DialogDescription({ className, ...props }) {
    return (_jsx(DialogPrimitive.Description, { "data-slot": "dialog-description", className: cn("text-sm leading-relaxed text-text-secondary", className), ...props }));
}
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, };
