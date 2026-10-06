import { cn } from "@/lib/utils";

/** Responsive bento layout: 1 col mobile, 3 cols desktop with an optional tall first card. */
export function BentoGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("grid auto-rows-[minmax(16rem,auto)] grid-cols-1 gap-5 md:grid-cols-3", className)}>{children}</div>;
}
