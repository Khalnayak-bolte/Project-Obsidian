import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useUIStore, type Theme } from "../stores/uiStore";

// ─── Context Value ────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSystemTheme = (): "dark" | "light" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const resolveTheme = (theme: Theme): "dark" | "light" =>
  theme === "system" ? getSystemTheme() : theme;

const applyTheme = (resolved: "dark" | "light"): void => {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const theme = useUIStore((s) => s.theme);
  const setThemeStore = useUIStore((s) => s.setTheme);

  const resolvedTheme = resolveTheme(theme);

  // Apply theme class to <html> whenever resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent): void => {
      applyTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme): void => {
      setThemeStore(newTheme);
    },
    [setThemeStore]
  );

  const toggleTheme = useCallback((): void => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setThemeStore(next);
  }, [resolvedTheme, setThemeStore]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
};

export default ThemeContext;
