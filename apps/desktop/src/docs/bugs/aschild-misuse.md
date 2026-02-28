# Bug Pattern: `asChild` on Custom Wrapper Components

## What the error looks like

React crashes with a DOM nesting error or a blank/broken dialog. The console may show:
- "Expected a single child element" from Radix Slot
- Hydration or DOM mismatch warnings
- The component simply fails to render, with no visible dialog

## Why it happens

Radix UI's `asChild` prop uses `Slot` internally to replace the primitive's rendered element with its child element. This works correctly when applied to **raw Radix primitives** (e.g., `DialogPrimitive.Content`, `DialogPrimitive.Close`).

However, our shadcn/ui wrappers (like `DialogContent` in `ui/dialog.tsx`) are **not** raw primitives. They are custom React components that render additional elements around the primitive (e.g., `DialogPortal` and `DialogOverlay`). When `asChild` is passed via `{...props}` spread down to the inner `DialogPrimitive.Content`, it causes the primitive to try to merge with a child element in an unexpected context, breaking the component tree.

### Correct usage

```tsx
// OK: asChild on a raw Radix primitive
<DialogPrimitive.Close asChild>
  <Button variant="outline">Close</Button>
</DialogPrimitive.Close>

// OK: asChild on Slot-based components (Button, Badge)
<Button asChild>
  <a href="/link">Click me</a>
</Button>
```

### Incorrect usage

```tsx
// BAD: asChild on a custom wrapper that renders extra elements
<DialogContent asChild>
  <motion.div>...</motion.div>
</DialogContent>
```

## How to detect it automatically

1. Search for `asChild` on any shadcn/ui wrapper component (those in `components/ui/`):
   ```
   grep -n 'asChild' apps/desktop/src/components/*.tsx apps/desktop/src/pages/*.tsx
   ```
2. If `asChild` appears on a component imported from `@/components/ui/dialog` (like `DialogContent`, `DialogHeader`, etc.), it is likely a bug.
3. The safe targets for `asChild` are: components that explicitly accept and handle `asChild` via `Slot` (e.g., `Button`, `Badge`), or raw `DialogPrimitive.*` components.

## Fix

Remove the `asChild` prop from the wrapper component. If you need animation on the dialog content, wrap the children in the animation component instead of trying to replace the dialog's root element.

## Instance fixed

- `apps/desktop/src/components/InterventionDialog.tsx` line 40 — removed `asChild` from `<DialogContent>`.
