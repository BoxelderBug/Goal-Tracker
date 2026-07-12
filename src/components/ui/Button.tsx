import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "default" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent to-accent-strong text-on-accent border-transparent hover:brightness-105",
  default:
    "bg-accent-soft text-text border-border hover:bg-bg-soft",
  ghost:
    "bg-transparent text-text border-transparent hover:bg-accent-soft",
  danger:
    "bg-danger-soft text-danger border-danger/30 hover:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-sm rounded-lg",
  md: "px-4 py-2 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border font-medium transition active:brightness-95",
        "disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
