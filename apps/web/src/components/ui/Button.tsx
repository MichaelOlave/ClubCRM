import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

type Props = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-zinc-950 text-white hover:bg-zinc-800",
  secondary: "bg-amber-100 text-amber-950 hover:bg-amber-200",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-4 text-sm",
};

export function buttonClassName({
  className,
  disabled,
  size = "md",
  variant = "primary",
}: Omit<Props, "children" | "href" | "type">): string {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition",
    variantClasses[variant],
    sizeClasses[size],
    disabled && "pointer-events-none opacity-50",
    className
  );
}

export function Button({
  children,
  className,
  disabled,
  href,
  size = "md",
  type = "button",
  variant = "primary",
}: Props) {
  const classes = buttonClassName({ className, disabled, size, variant });

  if (href) {
    return (
      <Link aria-disabled={disabled || undefined} className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} type={type}>
      {children}
    </button>
  );
}
