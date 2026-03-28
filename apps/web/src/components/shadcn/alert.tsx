import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-[1.5rem] border px-4 py-3 text-sm leading-6", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      destructive: "border-destructive/20 bg-destructive/10 text-destructive",
      info: "border-info-border bg-info text-info-foreground",
      success: "border-success-border bg-success text-success-foreground",
      warning: "border-warning-border bg-warning text-warning-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
