'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolved: 'light',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lecture du thème persisté dès l'init (SSR-safe) — évite un setState dans l'effet.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === 'undefined'
      ? 'system'
      : ((localStorage.getItem('lilia-theme') as Theme) ?? 'system'),
  );
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTheme(t: Theme) {
    const html = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = t === 'dark' || (t === 'system' && prefersDark);
    html.classList.toggle('dark', isDark);
    setResolved(isDark ? 'dark' : 'light');
  }

  function setTheme(t: Theme) {
    localStorage.setItem('lilia-theme', t);
    setThemeState(t);
    applyTheme(t);
  }

  // Listen to system pref changes when on 'system' mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
