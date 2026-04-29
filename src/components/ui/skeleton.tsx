import { cn } from "@/lib/utils"

/**
 * Skeleton — subtler pulse for the dark theme.
 *
 * The previous `bg-muted` solid pulse was readable but visually loud
 * against the new warm-charcoal palette: each block flashed between two
 * fixed states. The new approach uses a horizontal gradient sweep with
 * a slower animation curve, which reads as "loading" rather than
 * "blinking" and matches the calmer Cook-OS aesthetic.
 *
 * `animate-pulse` is preserved as a fallback class so consumers that
 * append their own state-driven animations don't break.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted/70",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
