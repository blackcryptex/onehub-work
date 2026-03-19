"use client";

import * as React from "react";

type ButtonVariant = "default" | "primary" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

function cn(...inputs: Array<string | undefined | null | false>) {
  return inputs.filter(Boolean).join(" ");
}

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        try {
          (ref as React.MutableRefObject<T>).current = node;
        } catch {
          // ignore
        }
      }
    }
  };
}

type SlotProps = React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode };

const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, className, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return children as React.ReactNode as React.ReactElement | null;
    }

    const child = children as React.ReactElement;
    const mergedRef = composeRefs(forwardedRef, (child as any).ref);
    const mergedClassName = cn(className, (child.props as { className?: string }).className);

    return React.cloneElement(child, {
      ...child.props,
      ...slotProps,
      className: mergedClassName,
      ref: mergedRef,
    });
  }
);
Slot.displayName = "Slot";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "underline-offset-4 hover:underline text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 px-3",
  lg: "h-10 px-6",
  icon: "h-9 w-9",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

function buttonVariants(options?: { variant?: ButtonVariant; size?: ButtonSize }) {
  const { variant = "default", size = "default" } = options ?? {};
  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render child element as the clickable root while preserving child semantics. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button";
    const componentClassName = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
    return (
      <Comp
        ref={ref}
        className={componentClassName}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
