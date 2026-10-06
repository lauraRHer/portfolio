import { cn } from "@/lib/utils";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  containerClassName?: string;
};

/**
 * Pill link with a gradient light travelling around its border.
 * CSS-only (conic gradient rotation); stops under reduced motion.
 */
export function MovingBorderLink({ children, className, containerClassName, ...props }: Props) {
  return (
    <a
      {...props}
      className={cn("group relative inline-flex overflow-hidden rounded-full p-px", containerClassName)}
    >
      <span
        aria-hidden
        className="absolute inset-[-200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg,transparent_0%,#8b5cf6_15%,#22d3ee_30%,transparent_45%)] group-hover:animate-[spin_1.6s_linear_infinite] motion-reduce:animate-none [html[data-motion=reduce]_&]:animate-none"
      />
      <span
        className={cn(
          "relative inline-flex items-center gap-2 rounded-full bg-space-900/95 px-6 py-3 font-medium text-ink backdrop-blur transition-colors group-hover:bg-space-800/95",
          className,
        )}
      >
        {children}
      </span>
    </a>
  );
}
