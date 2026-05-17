/**
 * frontend/src/components/ui/Dropdown.tsx
 * Project: Obsidian
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type KeyboardEvent,
} from "react";
import { cn } from "../../utils/cn";

// ─── Context ──────────────────────────────────────────────────────────────────

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("Dropdown compound components must be used inside <Dropdown>");
  return ctx;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DropdownPlacement =
  | "bottom-start"
  | "bottom-end"
  | "bottom"
  | "top-start"
  | "top-end"
  | "top";

export interface DropdownProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: DropdownPlacement;
  closeOnSelect?: boolean;
}

export interface DropdownTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: number | string;
  placement?: DropdownPlacement;
}

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
  shortcut?: string;
}

export interface DropdownLabelProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownSeparatorProps {
  className?: string;
}

// ─── Placement classes ────────────────────────────────────────────────────────

const PLACEMENT_CLASSES: Record<DropdownPlacement, string> = {
  "bottom-start": "top-full left-0 mt-1",
  "bottom-end":   "top-full right-0 mt-1",
  "bottom":       "top-full left-1/2 -translate-x-1/2 mt-1",
  "top-start":    "bottom-full left-0 mb-1",
  "top-end":      "bottom-full right-0 mb-1",
  "top":          "bottom-full left-1/2 -translate-x-1/2 mb-1",
};

// ─── Root Dropdown ────────────────────────────────────────────────────────────

export function Dropdown({
  children,
  open: controlledOpen,
  onOpenChange,
  closeOnSelect = true,
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Close on outside click
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, close }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const { open, setOpen } = useDropdownContext();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-expanded={open}
      className={cn("cursor-pointer select-none", className)}
      onClick={() => setOpen(!open)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(!open);
        }
      }}
    >
      {children}
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

export function DropdownContent({
  children,
  className,
  minWidth = 180,
  placement = "bottom-start",
}: DropdownContentProps) {
  const { open } = useDropdownContext();

  if (!open) return null;

  return (
    <div
      role="menu"
      aria-orientation="vertical"
      style={{ minWidth }}
      className={cn(
        "absolute z-50",
        "bg-[#111827] border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/40",
        "py-1.5 overflow-hidden",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        PLACEMENT_CLASSES[placement],
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Item ─────────────────────────────────────────────────────────────────────

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  icon,
  rightSlot,
  shortcut,
  className,
}: DropdownItemProps) {
  const { close } = useDropdownContext();

  function handleClick() {
    if (disabled) return;
    onClick?.();
    close();
  }

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg",
        "text-sm font-medium leading-none",
        "transition-colors duration-100 cursor-pointer select-none",
        danger
          ? "text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10"
          : "text-zinc-200 hover:bg-white/5 focus-visible:bg-white/5",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        "focus-visible:outline-none",
        className
      )}
    >
      {icon && (
        <span className="h-4 w-4 shrink-0 flex items-center justify-center text-zinc-400">
          {icon}
        </span>
      )}

      <span className="flex-1 truncate">{children}</span>

      {shortcut && (
        <span className="text-[10px] text-zinc-500 font-mono ml-auto pl-3">
          {shortcut}
        </span>
      )}

      {rightSlot && !shortcut && (
        <span className="ml-auto pl-3 text-zinc-400 shrink-0">{rightSlot}</span>
      )}
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

export function DropdownLabel({ children, className }: DropdownLabelProps) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 mx-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 select-none",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

export function DropdownSeparator({ className }: DropdownSeparatorProps) {
  return (
    <div
      role="separator"
      className={cn("my-1.5 border-t border-zinc-700/60", className)}
    />
  );
}

// ─── Convenience: simple select dropdown ──────────────────────────────────────

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SimpleDropdownProps<T extends string = string> {
  options: SelectOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  placeholder?: string;
  placement?: DropdownPlacement;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function SimpleDropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  placement = "bottom-start",
  className,
  triggerClassName,
  disabled = false,
}: SimpleDropdownProps<T>) {
  const selected = options.find((o) => o.value === value);

  return (
    <Dropdown placement={placement}>
      <DropdownTrigger
        className={cn(
          "flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium",
          "bg-[#111827] border border-zinc-700/60 text-zinc-200",
          "hover:border-zinc-500 transition-colors",
          disabled && "opacity-50 pointer-events-none",
          triggerClassName
        )}
      >
        {selected?.icon && (
          <span className="h-4 w-4 shrink-0 text-zinc-400">{selected.icon}</span>
        )}
        <span className={cn("flex-1 truncate", !selected && "text-zinc-500")}>
          {selected?.label ?? placeholder}
        </span>
        <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 6L8 9.5 11.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </DropdownTrigger>

      <DropdownContent placement={placement} className={className}>
        {options.map((option) => (
          <DropdownItem
            key={option.value}
            icon={option.icon}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            rightSlot={
              option.value === value ? (
                <svg className="h-3.5 w-3.5 text-[#6D5EF5]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3.5 3.5L13 4" />
                </svg>
              ) : undefined
            }
          >
            {option.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
