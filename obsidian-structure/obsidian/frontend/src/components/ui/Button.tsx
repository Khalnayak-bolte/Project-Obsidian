/**
 * frontend/src/components/ui/Button.tsx
 * Project: Obsidian
 */

import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Spinner } from "./Spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "outline"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  active?: boolean;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#6D5EF5] text-white hover:bg-[#5a4dd4] active:bg-[#4a3fc7] shadow-sm shadow-[#6D5EF5]/20 border border-[#6D5EF5]/50",
  secondary:
    "bg-[#1F2937] text-zinc-200 hover:bg-[#263242] active:bg-[#1a2430] border border-zinc-700/60",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-white/5 active:bg-white/10 border border-transparent",
  danger:
    "bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm shadow-red-600/20 border border-red-500/50",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-sm shadow-emerald-600/20 border border-emerald-500/50",
  outline:
    "bg-transparent text-zinc-200 hover:bg-white/5 active:bg-white/10 border border-zinc-600 hover:border-zinc-500",
  link:
    "bg-transparent text-[#a99cf7] hover:text-[#6D5EF5] underline-offset-4 hover:underline border border-transparent p-0 h-auto",
};

const ACTIVE_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   "bg-[#4a3fc7] border-[#4a3fc7]/50",
  secondary: "bg-[#1a2430] border-zinc-600",
  ghost:     "bg-white/10",
  danger:    "bg-red-700 border-red-600/50",
  success:   "bg-emerald-700 border-emerald-600/50",
  outline:   "bg-white/10 border-zinc-500",
  link:      "text-[#6D5EF5]",
};

// ─── Size styles ──────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-[10px] gap-1 rounded",
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-base gap-2 rounded-lg",
  xl: "h-13 px-6 text-lg gap-2.5 rounded-xl",
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-5 w-5",
};

// ─── Button component ─────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      active = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "inline-flex items-center justify-center font-medium leading-none",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5EF5]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F19]",
          "select-none whitespace-nowrap",
          // Variant
          VARIANT_CLASSES[variant],
          // Active override
          active && ACTIVE_VARIANT_CLASSES[variant],
          // Size
          variant !== "link" && SIZE_CLASSES[size],
          // Full width
          fullWidth && "w-full",
          // Disabled
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Left icon or spinner */}
        {loading ? (
          <Spinner
            size={size === "xs" || size === "sm" ? "sm" : "md"}
            className={cn(ICON_SIZE_CLASSES[size], children || loadingText ? "mr-0" : "")}
          />
        ) : (
          leftIcon && (
            <span className={cn("shrink-0 flex items-center", ICON_SIZE_CLASSES[size])}>
              {leftIcon}
            </span>
          )
        )}

        {/* Label */}
        {(children || loadingText) && (
          <span>
            {loading && loadingText ? loadingText : children}
          </span>
        )}

        {/* Right icon */}
        {!loading && rightIcon && (
          <span className={cn("shrink-0 flex items-center", ICON_SIZE_CLASSES[size])}>
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// ─── IconButton ───────────────────────────────────────────────────────────────

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  active?: boolean;
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = "ghost",
      size = "md",
      loading = false,
      active = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const SQUARE_SIZE: Record<ButtonSize, string> = {
      xs: "h-6 w-6 rounded",
      sm: "h-7 w-7 rounded-md",
      md: "h-9 w-9 rounded-lg",
      lg: "h-11 w-11 rounded-lg",
      xl: "h-13 w-13 rounded-xl",
    };

    const ICON_SIZE: Record<ButtonSize, string> = {
      xs: "h-3 w-3",
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
      xl: "h-6 w-6",
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center shrink-0",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5EF5]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F19]",
          VARIANT_CLASSES[variant],
          SQUARE_SIZE[size],
          active && ACTIVE_VARIANT_CLASSES[variant],
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" className={ICON_SIZE[size]} />
        ) : (
          <span className={cn("flex items-center justify-center", ICON_SIZE[size])}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

// ─── ButtonGroup ──────────────────────────────────────────────────────────────

export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function ButtonGroup({
  children,
  className,
  orientation = "horizontal",
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex",
        orientation === "horizontal"
          ? "[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:-mr-px"
          : "flex-col [&>button]:rounded-none [&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:last-child)]:-mb-px",
        className
      )}
    >
      {children}
    </div>
  );
}
