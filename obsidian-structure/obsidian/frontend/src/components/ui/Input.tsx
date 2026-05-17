/**
 * frontend/src/components/ui/Input.tsx
 * Project: Obsidian
 */

import { forwardRef, useState, useId } from "react";
import { cn } from "../../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  rightAction?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
  autoGrow?: boolean;
  maxRows?: number;
}

// ─── Size styles ──────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "h-7 px-2.5 text-xs rounded-md",
  md: "h-9 px-3 text-sm rounded-lg",
  lg: "h-11 px-4 text-base rounded-lg",
};

const ICON_SIZE_CLASSES: Record<InputSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const ICON_PADDING_LEFT: Record<InputSize, string> = {
  sm: "pl-7",
  md: "pl-9",
  lg: "pl-11",
};

const ICON_PADDING_RIGHT: Record<InputSize, string> = {
  sm: "pr-7",
  md: "pr-9",
  lg: "pr-11",
};

const ICON_OFFSET_LEFT: Record<InputSize, string> = {
  sm: "left-2",
  md: "left-2.5",
  lg: "left-3",
};

const ICON_OFFSET_RIGHT: Record<InputSize, string> = {
  sm: "right-2",
  md: "right-2.5",
  lg: "right-3",
};

// ─── Base input classes ───────────────────────────────────────────────────────

const BASE_INPUT = cn(
  "w-full bg-[#0B0F19] border border-zinc-700/60 text-zinc-100 placeholder:text-zinc-500",
  "transition-colors duration-150",
  "focus:outline-none focus:border-[#6D5EF5]/70 focus:ring-2 focus:ring-[#6D5EF5]/20",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "autofill:bg-[#0B0F19]"
);

const ERROR_INPUT = "border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20";

// ─── Input component ──────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      rightAction,
      fullWidth = false,
      loading = false,
      className,
      id: externalId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const hasError = !!error;
    const isDisabled = disabled || loading;

    const inputEl = (
      <div className="relative flex items-center">
        {/* Left icon */}
        {leftIcon && (
          <span
            className={cn(
              "absolute flex items-center justify-center text-zinc-400 pointer-events-none z-10",
              ICON_SIZE_CLASSES[size],
              ICON_OFFSET_LEFT[size]
            )}
          >
            {leftIcon}
          </span>
        )}

        {/* Loading spinner (left) */}
        {loading && !leftIcon && (
          <span
            className={cn(
              "absolute flex items-center justify-center text-zinc-400 pointer-events-none z-10",
              ICON_SIZE_CLASSES[size],
              ICON_OFFSET_LEFT[size]
            )}
          >
            <svg
              className={cn("animate-spin", ICON_SIZE_CLASSES[size])}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        )}

        <input
          ref={ref}
          id={id}
          disabled={isDisabled}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={cn(
            BASE_INPUT,
            SIZE_CLASSES[size],
            hasError && ERROR_INPUT,
            (leftIcon || loading) && ICON_PADDING_LEFT[size],
            (rightIcon || rightAction) && ICON_PADDING_RIGHT[size],
            leftAddon && "rounded-l-none border-l-0",
            rightAddon && "rounded-r-none border-r-0",
            className
          )}
          {...props}
        />

        {/* Right icon */}
        {rightIcon && !rightAction && (
          <span
            className={cn(
              "absolute flex items-center justify-center text-zinc-400 pointer-events-none z-10",
              ICON_SIZE_CLASSES[size],
              ICON_OFFSET_RIGHT[size]
            )}
          >
            {rightIcon}
          </span>
        )}

        {/* Right action (clickable) */}
        {rightAction && (
          <span
            className={cn(
              "absolute flex items-center justify-center z-10",
              ICON_OFFSET_RIGHT[size]
            )}
          >
            {rightAction}
          </span>
        )}
      </div>
    );

    return (
      <div className={cn("flex flex-col gap-1", fullWidth ? "w-full" : "inline-flex")}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-zinc-300 leading-none"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-red-400" aria-hidden="true">*</span>
            )}
          </label>
        )}

        {/* Input with optional addons */}
        {leftAddon || rightAddon ? (
          <div className="flex items-stretch">
            {leftAddon && (
              <div
                className={cn(
                  "flex items-center px-3 bg-[#111827] border border-zinc-700/60 border-r-0",
                  "text-zinc-400 text-sm rounded-l-lg select-none whitespace-nowrap"
                )}
              >
                {leftAddon}
              </div>
            )}
            {inputEl}
            {rightAddon && (
              <div
                className={cn(
                  "flex items-center px-3 bg-[#111827] border border-zinc-700/60 border-l-0",
                  "text-zinc-400 text-sm rounded-r-lg select-none whitespace-nowrap"
                )}
              >
                {rightAddon}
              </div>
            )}
          </div>
        ) : (
          inputEl
        )}

        {/* Error or hint */}
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs text-red-400 leading-snug">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-xs text-zinc-500 leading-snug">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

// ─── PasswordInput ────────────────────────────────────────────────────────────

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, "type" | "rightIcon" | "rightAction">
>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      type={visible ? "text" : "password"}
      rightAction={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = "PasswordInput";

// ─── Textarea ─────────────────────────────────────────────────────────────────

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      fullWidth = false,
      resize = "vertical",
      className,
      id: externalId,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const hasError = !!error;

    const resizeClass = {
      none: "resize-none",
      vertical: "resize-y",
      horizontal: "resize-x",
      both: "resize",
    }[resize];

    return (
      <div className={cn("flex flex-col gap-1", fullWidth ? "w-full" : "inline-flex")}>
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-zinc-300 leading-none"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-red-400" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={cn(
            BASE_INPUT,
            "px-3 py-2 text-sm rounded-lg leading-relaxed",
            hasError && ERROR_INPUT,
            resizeClass,
            className
          )}
          {...props}
        />

        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs text-red-400 leading-snug">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-xs text-zinc-500 leading-snug">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// ─── SearchInput ──────────────────────────────────────────────────────────────

export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, "leftIcon" | "type">
>((props, ref) => (
  <Input
    ref={ref}
    type="search"
    leftIcon={
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    }
    {...props}
  />
));

SearchInput.displayName = "SearchInput";
