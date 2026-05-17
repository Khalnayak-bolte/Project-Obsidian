/**
 * frontend/src/components/ui/Toast.tsx
 * Project: Obsidian
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;    // ms — 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export interface ToastOptions
  extends Omit<Toast, "id" | "type" | "title"> {
  title?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  error:   5000,
  warning: 4500,
  info:    4000,
  loading: 0,       // manual dismiss
};

const MAX_TOASTS = 5;

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (id: string, patch: Partial<Omit<Toast, "id">>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── useToast hook ────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");

  const toast = useCallback(
    (title: string, options: ToastOptions & { type?: ToastType } = {}) => {
      const { type = "info", ...rest } = options;
      return ctx.add({ type, title, ...rest });
    },
    [ctx]
  );

  const success = useCallback(
    (title: string, options?: ToastOptions) =>
      ctx.add({ type: "success", title, ...options }),
    [ctx]
  );

  const error = useCallback(
    (title: string, options?: ToastOptions) =>
      ctx.add({ type: "error", title, ...options }),
    [ctx]
  );

  const warning = useCallback(
    (title: string, options?: ToastOptions) =>
      ctx.add({ type: "warning", title, ...options }),
    [ctx]
  );

  const info = useCallback(
    (title: string, options?: ToastOptions) =>
      ctx.add({ type: "info", title, ...options }),
    [ctx]
  );

  const loading = useCallback(
    (title: string, options?: ToastOptions) =>
      ctx.add({ type: "loading", title, duration: 0, ...options }),
    [ctx]
  );

  const promise = useCallback(
    async <T,>(
      promiseFn: Promise<T>,
      messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) }
    ): Promise<T> => {
      const id = loading(messages.loading);
      try {
        const result = await promiseFn;
        const successMsg = typeof messages.success === "function"
          ? messages.success(result)
          : messages.success;
        ctx.update(id, { type: "success", title: successMsg, duration: DEFAULT_DURATION.success });
        return result;
      } catch (err) {
        const errorMsg = typeof messages.error === "function"
          ? messages.error(err)
          : messages.error;
        ctx.update(id, { type: "error", title: errorMsg, duration: DEFAULT_DURATION.error });
        throw err;
      }
    },
    [ctx, loading]
  );

  return {
    toast,
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss: ctx.dismiss,
    dismissAll: ctx.dismissAll,
  };
}

// ─── Toast icons ─────────────────────────────────────────────────────────────

function ToastIcon({ type }: { type: ToastType }) {
  const base = "h-4 w-4 shrink-0";

  if (type === "success") {
    return (
      <svg className={cn(base, "text-emerald-400")} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }

  if (type === "error") {
    return (
      <svg className={cn(base, "text-red-400")} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  }

  if (type === "warning") {
    return (
      <svg className={cn(base, "text-amber-400")} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }

  if (type === "loading") {
    return (
      <svg className={cn(base, "text-[#6D5EF5] animate-spin")} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }

  // info
  return (
    <svg className={cn(base, "text-[#a99cf7]")} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Toast left border color ──────────────────────────────────────────────────

const BORDER_CLASSES: Record<ToastType, string> = {
  success: "border-l-emerald-500",
  error:   "border-l-red-500",
  warning: "border-l-amber-500",
  info:    "border-l-[#6D5EF5]",
  loading: "border-l-[#6D5EF5]",
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onDismiss(toast.id);
      toast.onDismiss?.();
    }, 200);
  }, [onDismiss, toast]);

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-dismiss timer
  const duration = toast.duration ?? DEFAULT_DURATION[toast.type];
  useEffect(() => {
    if (duration === 0) return;
    timerRef.current = setTimeout(dismiss, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [duration, dismiss]);

  // Pause on hover
  const pauseTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const resumeTimer = () => {
    if (duration === 0) return;
    timerRef.current = setTimeout(dismiss, duration / 2);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      className={cn(
        "flex items-start gap-3 w-full max-w-sm",
        "bg-[#111827] border border-zinc-700/60 border-l-4 rounded-xl px-4 py-3",
        "shadow-lg shadow-black/30",
        "transition-all duration-200 ease-out",
        BORDER_CLASSES[toast.type],
        visible
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      )}
    >
      {/* Icon */}
      <div className="mt-0.5">
        <ToastIcon type={toast.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 leading-snug">
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick();
              dismiss();
            }}
            className="mt-1.5 text-xs font-medium text-[#a99cf7] hover:text-[#6D5EF5] transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors -mr-1"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
    </div>
  );
}

// ─── Position classes ─────────────────────────────────────────────────────────

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right":    "top-4 right-4 items-end",
  "top-left":     "top-4 left-4 items-start",
  "top-center":   "top-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-4 right-4 items-end",
  "bottom-left":  "bottom-4 left-4 items-start",
  "bottom-center":"bottom-4 left-1/2 -translate-x-1/2 items-center",
};

// ─── Toast Container ──────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: Toast[];
  position: ToastPosition;
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, position, onDismiss }: ToastContainerProps) {
  const isBottom = position.startsWith("bottom");

  return createPortal(
    <div
      aria-label="Notifications"
      className={cn(
        "fixed z-[9999] flex flex-col gap-2 pointer-events-none",
        POSITION_CLASSES[position],
        "[&>*]:pointer-events-auto"
      )}
    >
      {(isBottom ? [...toasts].reverse() : toasts).map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

// ─── Toast Provider ───────────────────────────────────────────────────────────

let toastCounter = 0;

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
}

export function ToastProvider({
  children,
  position = "top-right",
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((toast: Omit<Toast, "id">): string => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => {
      const next = [{ ...toast, id }, ...prev];
      return next.slice(0, MAX_TOASTS);
    });
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Toast, "id">>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, add, dismiss, dismissAll, update }}>
      {children}
      <ToastContainer toasts={toasts} position={position} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
