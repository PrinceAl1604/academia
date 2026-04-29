import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — Cook-OS-flavored refresh.
 *
 * Visual changes:
 *  • Default radius drops from `rounded-4xl` (full pill) to `rounded-md`.
 *    Pill-shaped badges everywhere read as "Slack chips"; the
 *    rectangular-with-soft-corners look reads more like "build label" /
 *    "version tag" — fits a serious tool aesthetic.
 *  • New `pill` variant restores the rounded-full look for cases where
 *    the chip is genuinely status-like (online indicator, count badge).
 *  • New `mono` variant for metadata badges — uses Geist Mono, tighter
 *    padding, no fill, just an outline. For prices, durations, version
 *    strings, "v2.4" labels, etc.
 *  • Default fill is now `bg-secondary` (one step up from bg) instead
 *    of `bg-primary` — because primary-filled badges tend to compete
 *    with primary-filled buttons. Use `variant="primary"` when you
 *    actually want the brand accent.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/30 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        primary:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "bg-muted text-foreground [a]:hover:bg-muted/80",
        destructive:
          "bg-destructive/15 text-destructive focus-visible:ring-destructive/30 [a]:hover:bg-destructive/25",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Pill = original rounded-full chip style, for status indicators
        pill: "rounded-full bg-secondary text-secondary-foreground",
        // Mono = monospace metadata label — for prices, durations, version
        // strings, ID badges. Outlined-only, no fill.
        mono: "font-mono tracking-tight border-border/80 text-muted-foreground hover:text-foreground hover:border-border",
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
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
