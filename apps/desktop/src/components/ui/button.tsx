import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent text-sm font-semibold tracking-[0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/55 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:ring-destructive/35 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary via-primary to-primary-hover text-primary-foreground border-primary/55 shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_12px_32px_-14px_var(--color-glow-primary)] hover:-translate-y-[1px] hover:from-primary-hover hover:to-primary hover:border-primary/80 hover:shadow-[0_1px_0_rgba(255,255,255,0.32)_inset,0_18px_38px_-12px_var(--color-glow-primary)] active:translate-y-0",
        destructive:
          "bg-gradient-to-br from-danger to-danger/85 text-white border-danger/55 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_12px_30px_-14px_var(--color-glow-danger)] hover:-translate-y-[1px] hover:border-danger/75 hover:shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_18px_36px_-12px_var(--color-glow-danger)] active:translate-y-0",
        outline:
          "bg-black/20 text-text-primary border-primary/35 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] hover:-translate-y-[1px] hover:bg-primary/16 hover:text-primary hover:border-primary/70 hover:shadow-[0_0_24px_-12px_var(--color-glow-primary)] active:translate-y-0",
        secondary:
          "bg-surface/90 text-text-primary border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] hover:-translate-y-[1px] hover:border-white/20 hover:bg-surface-hover active:translate-y-0",
        ghost:
          "text-text-secondary border-transparent hover:border-primary/35 hover:bg-primary/12 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
