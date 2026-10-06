import { cn } from "@/lib/utils";

/** Semantic page section with consistent vertical rhythm. */
export function Section({
  id,
  className,
  children,
  containerClassName,
}: {
  id: string;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("relative py-24 md:py-32 lg:py-40", className)}>
      <div className={cn("container-page relative", containerClassName)}>{children}</div>
    </section>
  );
}
