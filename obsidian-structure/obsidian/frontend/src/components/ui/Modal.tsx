/**
 * frontend/src/components/ui/Modal.tsx
 * Project: Obsidian
 */

import {
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { Button } from "./Button";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

export interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right" | "between";
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("Modal sub-components must be used inside <Modal>");
  return ctx;
}

// ─── Size classes ─────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<ModalSize, string> = {
  xs:   "max-w-xs",
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-2xl",
  full: "max-w-[95vw] max-h-[95vh]",
};

// ─── Focus trap ───────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const el = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus first focusable element
    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    focusable[0]?.focus();

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusableEls = Array.from(
        el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);

    return () => {
      el.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active, ref]);
}

// ─── Modal Root ───────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  children,
  size = "md",
  closeOnOverlay = true,
  closeOnEsc = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    function handle(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, closeOnEsc, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOverlay && e.target === e.currentTarget) onClose();
    },
    [closeOnOverlay, onClose]
  );

  if (!open) return null;

  return createPortal(
    <ModalContext.Provider value={{ onClose }}>
      {/* Overlay */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          "bg-black/60 backdrop-blur-sm",
          "animate-in fade-in-0 duration-150"
        )}
        onClick={handleOverlayClick}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          className={cn(
            "relative w-full",
            SIZE_CLASSES[size],
            "bg-[#111827] border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/50",
            "flex flex-col max-h-[90vh]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  );
}

// ─── Modal Header ─────────────────────────────────────────────────────────────

export function ModalHeader({ children, onClose, className }: ModalHeaderProps) {
  const { onClose: ctxClose } = useModalContext();
  const handleClose = onClose ?? ctxClose;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 py-4 border-b border-zinc-700/60 shrink-0",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {typeof children === "string" ? (
          <h2 className="text-base font-semibold text-zinc-100 truncate">
            {children}
          </h2>
        ) : (
          children
        )}
      </div>

      <button
        type="button"
        onClick={handleClose}
        aria-label="Close modal"
        className={cn(
          "ml-3 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center",
          "text-zinc-400 hover:text-zinc-200 hover:bg-white/5",
          "transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5EF5]/60"
        )}
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  );
}

// ─── Modal Body ───────────────────────────────────────────────────────────────

export function ModalBody({
  children,
  className,
  scrollable = true,
}: ModalBodyProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 flex-1 min-h-0",
        scrollable && "overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Modal Footer ─────────────────────────────────────────────────────────────

const FOOTER_ALIGN: Record<NonNullable<ModalFooterProps["align"]>, string> = {
  left:    "justify-start",
  center:  "justify-center",
  right:   "justify-end",
  between: "justify-between",
};

export function ModalFooter({
  children,
  className,
  align = "right",
}: ModalFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-6 py-4 border-t border-zinc-700/60 shrink-0",
        FOOTER_ALIGN[align],
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>{title}</ModalHeader>

      <ModalBody>
        <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          size="sm"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Drawer (slide-in from side) ──────────────────────────────────────────────

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right";
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  children,
  side = "right",
  width = "w-80",
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handle(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "absolute top-0 bottom-0 flex flex-col",
          "bg-[#111827] border-zinc-700/60 shadow-2xl",
          side === "right"
            ? "right-0 border-l animate-in slide-in-from-right duration-200"
            : "left-0 border-r animate-in slide-in-from-left duration-200",
          width,
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
