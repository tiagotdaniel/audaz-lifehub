import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "auto";

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; }

const ThemeContext = createContext<ThemeCtx>({ theme: "dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try { return (localStorage.getItem("lifehub-theme") as Theme) || "dark"; } catch { return "dark"; }
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("lifehub-theme", t); } catch { /* noop */ }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else if (theme === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (!isDark) root.setAttribute("data-theme", "light");
      const listener = (e: MediaQueryListEvent) => {
        if (!e.matches) root.setAttribute("data-theme", "light");
        else root.removeAttribute("data-theme");
      };
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
