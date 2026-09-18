import { useEffect } from 'react';
import { ThemeMode, ColorThemeId } from '../types';
import { applyColorTheme, getSavedColorTheme } from '../lib/themes';

export { getSavedColorTheme, applyColorTheme };

export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem('studybuddy_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {}
  return 'system';
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  try {
    localStorage.setItem('studybuddy_theme', theme);
  } catch {}

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  // Update mobile status bar and browser frame color to match active color theme
  const activeColorTheme = getSavedColorTheme();
  applyColorTheme(activeColorTheme);
}

export function useThemeEffect(theme: ThemeMode, colorTheme: ColorThemeId = 'violet') {
  useEffect(() => {
    applyTheme(theme);
    applyColorTheme(colorTheme);

    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        applyTheme('system');
        applyColorTheme(colorTheme);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, colorTheme]);
}


