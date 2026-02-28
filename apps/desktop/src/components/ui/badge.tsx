import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em] transition-all duration-200 [&>svg]:size-3 [&>svg]:pointer-events-none backdrop-blur-sm focus-visible:ring-[3px] focus-visible:ring-ring/55 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:ring-destructive/35 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-primary/16 text-primary shadow-[0_0_14px_-8px_var(--color-glow-primary)] [a&]:hover:border-primary/60 [a&]:hover:bg-primary/22",
        secondary:
          "border-white/10 bg-surface/85 text-text-secondary [a&]:hover:border-white/20 [a&]:hover:text-text-primary",
        destructive:
          "border-danger/45 bg-danger/18 text-danger shadow-[0_0_14px_-8px_var(--color-glow-danger)] [a&]:hover:border-danger/65 [a&]:hover:bg-danger/24",
        outline:
          "border-primary/35 bg-transparent text-primary [a&]:hover:border-primary/60 [a&]:hover:bg-primary/12",
        ghost:
          "border-transparent text-text-secondary [a&]:hover:border-primary/30 [a&]:hover:bg-primary/12 [a&]:hover:text-primary",
        link: "border-transparent text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
