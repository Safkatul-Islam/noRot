"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-xl border border-white/8 bg-black/25 p-1.5 text-text-secondary backdrop-blur-sm group-data-[orientation=horizontal]/tabs:h-10 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 rounded-none border-transparent bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-200 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:text-text-primary",
        "group-data-[variant=default]/tabs-list:data-[state=active]:border-white/12 group-data-[variant=default]/tabs-list:data-[state=active]:bg-surface/85 group-data-[variant=default]/tabs-list:data-[state=active]:text-primary group-data-[variant=default]/tabs-list:data-[state=active]:shadow-[0_0_22px_-14px_var(--color-glow-primary)]",
        "group-data-[variant=line]/tabs-list:rounded-md group-data-[variant=line]/tabs-list:data-[state=active]:text-primary",
        "after:absolute after:opacity-0 after:transition-opacity after:bg-primary group-data-[orientation=horizontal]/tabs:after:inset-x-3 group-data-[orientation=horizontal]/tabs:after:bottom-[-8px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=horizontal]/tabs:after:rounded-full group-data-[orientation=vertical]/tabs:after:inset-y-1.5 group-data-[orientation=vertical]/tabs:after:-right-2 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[orientation=vertical]/tabs:after:rounded-full group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
