/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect } from "react";

type Theme = "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    try {
      localStorage.setItem("theme", "light");
    } catch { /* empty */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme: () => {}, resolvedTheme: "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
