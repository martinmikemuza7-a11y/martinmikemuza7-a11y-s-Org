import { ColorThemeId } from '../types';

export interface ColorThemeConfig {
  id: ColorThemeId;
  name: string;
  tagline: string;
  hex: string; // Primary hex code
  hexDark: string; // For dark mode accents
  tailwindName: string;
  previewGradient: string;
  // CSS variables injected into :root
  cssVars: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primarySubtle: string;
    ring: string;
    glow: string;
  };
  // Tailwind utility classes for quick components
  classes: {
    badge: string;
    activeNav: string;
    primaryButton: string;
    gradientHero: string;
    accentBorder: string;
    statGradient: string;
    textPrimary: string;
    bgSubtle: string;
  };
}

export const COLOR_THEMES: Record<ColorThemeId, ColorThemeConfig> = {
  violet: {
    id: 'violet',
    name: 'Amethyst Violet',
    tagline: 'Royal purple & deep violet tones',
    hex: '#8b5cf6',
    hexDark: '#a78bfa',
    tailwindName: 'violet',
    previewGradient: 'from-violet-500 via-purple-600 to-indigo-700',
    cssVars: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      primaryLight: '#ede9fe',
      primarySubtle: '#f5f3ff',
      ring: 'rgba(139, 92, 246, 0.4)',
      glow: 'rgba(139, 92, 246, 0.25)',
    },
    classes: {
      badge: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
      activeNav: 'bg-violet-600 text-white shadow-md shadow-violet-500/25 dark:bg-violet-600 dark:text-white',
      primaryButton: 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-500/30',
      gradientHero: 'from-violet-600 via-purple-600 to-indigo-800',
      accentBorder: 'border-violet-500 dark:border-violet-400',
      statGradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
      textPrimary: 'text-violet-600 dark:text-violet-400',
      bgSubtle: 'bg-violet-50 dark:bg-violet-950/30',
    },
  },
  blue: {
    id: 'blue',
    name: 'Ocean Sapphire',
    tagline: 'Vibrant cobalt & electric sky blue',
    hex: '#2563eb',
    hexDark: '#60a5fa',
    tailwindName: 'blue',
    previewGradient: 'from-blue-500 via-indigo-600 to-cyan-600',
    cssVars: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryLight: '#dbeafe',
      primarySubtle: '#eff6ff',
      ring: 'rgba(37, 99, 235, 0.4)',
      glow: 'rgba(37, 99, 235, 0.25)',
    },
    classes: {
      badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      activeNav: 'bg-blue-600 text-white shadow-md shadow-blue-500/25 dark:bg-blue-600 dark:text-white',
      primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/30',
      gradientHero: 'from-blue-600 via-indigo-600 to-sky-700',
      accentBorder: 'border-blue-500 dark:border-blue-400',
      statGradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      textPrimary: 'text-blue-600 dark:text-blue-400',
      bgSubtle: 'bg-blue-50 dark:bg-blue-950/30',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    tagline: 'Lush botanical emerald & fresh mint',
    hex: '#059669',
    hexDark: '#34d399',
    tailwindName: 'emerald',
    previewGradient: 'from-emerald-500 via-teal-600 to-green-700',
    cssVars: {
      primary: '#059669',
      primaryHover: '#047857',
      primaryLight: '#d1fae5',
      primarySubtle: '#ecfdf5',
      ring: 'rgba(5, 150, 105, 0.4)',
      glow: 'rgba(5, 150, 105, 0.25)',
    },
    classes: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      activeNav: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 dark:bg-emerald-600 dark:text-white',
      primaryButton: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/30',
      gradientHero: 'from-emerald-600 via-teal-600 to-green-800',
      accentBorder: 'border-emerald-500 dark:border-emerald-400',
      statGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      textPrimary: 'text-emerald-600 dark:text-emerald-400',
      bgSubtle: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber',
    tagline: 'Warm golden honey & fiery sunrise orange',
    hex: '#d97706',
    hexDark: '#fbbf24',
    tailwindName: 'amber',
    previewGradient: 'from-amber-500 via-orange-500 to-red-600',
    cssVars: {
      primary: '#d97706',
      primaryHover: '#b45309',
      primaryLight: '#fef3c7',
      primarySubtle: '#fffbeb',
      ring: 'rgba(217, 119, 6, 0.4)',
      glow: 'rgba(217, 119, 6, 0.25)',
    },
    classes: {
      badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      activeNav: 'bg-amber-600 text-white shadow-md shadow-amber-500/25 dark:bg-amber-600 dark:text-white',
      primaryButton: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-500/30',
      gradientHero: 'from-amber-600 via-orange-600 to-rose-700',
      accentBorder: 'border-amber-500 dark:border-amber-400',
      statGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
      textPrimary: 'text-amber-600 dark:text-amber-400',
      bgSubtle: 'bg-amber-50 dark:bg-amber-950/30',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose Blossom',
    tagline: 'Rich cranberry, ruby & radiant pink',
    hex: '#e11d48',
    hexDark: '#fb7185',
    tailwindName: 'rose',
    previewGradient: 'from-rose-500 via-pink-600 to-red-700',
    cssVars: {
      primary: '#e11d48',
      primaryHover: '#be123c',
      primaryLight: '#ffe4e6',
      primarySubtle: '#fff1f2',
      ring: 'rgba(225, 29, 72, 0.4)',
      glow: 'rgba(225, 29, 72, 0.25)',
    },
    classes: {
      badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      activeNav: 'bg-rose-600 text-white shadow-md shadow-rose-500/25 dark:bg-rose-600 dark:text-white',
      primaryButton: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/30',
      gradientHero: 'from-rose-600 via-pink-600 to-fuchsia-800',
      accentBorder: 'border-rose-500 dark:border-rose-400',
      statGradient: 'from-rose-500/10 via-pink-500/5 to-transparent',
      textPrimary: 'text-rose-600 dark:text-rose-400',
      bgSubtle: 'bg-rose-50 dark:bg-rose-950/30',
    },
  },
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    tagline: 'High-tech neon cyan & electric teal',
    hex: '#0891b2',
    hexDark: '#22d3ee',
    tailwindName: 'cyan',
    previewGradient: 'from-cyan-500 via-teal-600 to-blue-700',
    cssVars: {
      primary: '#0891b2',
      primaryHover: '#0e7490',
      primaryLight: '#cffafe',
      primarySubtle: '#ecfeff',
      ring: 'rgba(8, 145, 178, 0.4)',
      glow: 'rgba(8, 145, 178, 0.25)',
    },
    classes: {
      badge: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      activeNav: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25 dark:bg-cyan-600 dark:text-white',
      primaryButton: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-500/30',
      gradientHero: 'from-cyan-600 via-teal-600 to-blue-800',
      accentBorder: 'border-cyan-500 dark:border-cyan-400',
      statGradient: 'from-cyan-500/10 via-teal-500/5 to-transparent',
      textPrimary: 'text-cyan-600 dark:text-cyan-400',
      bgSubtle: 'bg-cyan-50 dark:bg-cyan-950/30',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Solar Neon',
    tagline: 'Ultra-vivid magenta, fuchsia & violet fusion',
    hex: '#c026d3',
    hexDark: '#e879f9',
    tailwindName: 'fuchsia',
    previewGradient: 'from-fuchsia-500 via-pink-600 to-amber-500',
    cssVars: {
      primary: '#c026d3',
      primaryHover: '#a21caf',
      primaryLight: '#fae8ff',
      primarySubtle: '#fdf4ff',
      ring: 'rgba(192, 38, 211, 0.4)',
      glow: 'rgba(192, 38, 211, 0.25)',
    },
    classes: {
      badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800',
      activeNav: 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25 dark:bg-fuchsia-600 dark:text-white',
      primaryButton: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-sm shadow-fuchsia-500/30',
      gradientHero: 'from-fuchsia-600 via-pink-600 to-amber-600',
      accentBorder: 'border-fuchsia-500 dark:border-fuchsia-400',
      statGradient: 'from-fuchsia-500/10 via-pink-500/5 to-transparent',
      textPrimary: 'text-fuchsia-600 dark:text-fuchsia-400',
      bgSubtle: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    },
  },
};

export const COLOR_THEME_LIST: ColorThemeConfig[] = Object.values(COLOR_THEMES);

export function getSavedColorTheme(): ColorThemeId {
  if (typeof window === 'undefined') return 'violet';
  try {
    const saved = localStorage.getItem('studybuddy_color_theme');
    if (saved && saved in COLOR_THEMES) {
      return saved as ColorThemeId;
    }
  } catch {}
  return 'violet';
}

export function applyColorTheme(themeId: ColorThemeId) {
  if (typeof document === 'undefined') return;
  const config = COLOR_THEMES[themeId] || COLOR_THEMES.violet;
  const root = document.documentElement;

  try {
    localStorage.setItem('studybuddy_color_theme', themeId);
  } catch {}

  root.setAttribute('data-color-theme', themeId);

  // Set CSS custom properties
  root.style.setProperty('--color-primary', config.cssVars.primary);
  root.style.setProperty('--color-primary-hover', config.cssVars.primaryHover);
  root.style.setProperty('--color-primary-light', config.cssVars.primaryLight);
  root.style.setProperty('--color-primary-subtle', config.cssVars.primarySubtle);
  root.style.setProperty('--color-theme-ring', config.cssVars.ring);
  root.style.setProperty('--color-theme-glow', config.cssVars.glow);

  // Update theme meta color tag for browser window header
  const isDark = root.classList.contains('dark');
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', isDark ? '#090d16' : config.hex);
  }
}
