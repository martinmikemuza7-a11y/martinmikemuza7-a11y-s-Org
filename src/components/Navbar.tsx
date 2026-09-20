import React, { useState, useRef, useEffect } from 'react';
import { AIStatus, AppSettings, ThemeMode, ColorThemeId } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { NotificationManager } from '../lib/notifications';
import { COLOR_THEME_LIST, COLOR_THEMES } from '../lib/themes';
import {
  Sparkles,
  Wifi,
  WifiOff,
  Cpu,
  RefreshCw,
  Bell,
  Download,
  CheckCircle,
  HelpCircle,
  Sun,
  Moon,
  Laptop,
  Palette,
  Check,
  Cloud,
  ArrowRightLeft,
  Smartphone,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  aiStatus: AIStatus;
  onRefreshStatus: () => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt?: number;
  isAutoSyncActive?: boolean;
  lastSyncLabel?: string;
  settings: AppSettings | null;
  onOpenSettings: () => void;
  onUpdateTheme?: (theme: ThemeMode) => void;
  onUpdateColorTheme?: (colorTheme: ColorThemeId) => void;
  activeTabTitle?: string;
  user?: FirebaseUser | null;
  deviceType?: 'PC' | 'Phone' | 'Tablet';
  onOpenCloudSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  aiStatus,
  onRefreshStatus,
  onTriggerSync,
  isSyncing,
  lastSyncedAt,
  isAutoSyncActive,
  lastSyncLabel,
  settings,
  onOpenSettings,
  onUpdateTheme,
  onUpdateColorTheme,
  activeTabTitle,
  user,
  deviceType = 'PC',
  onOpenCloudSync,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const currentTheme = settings?.theme || 'system';
  const currentColorTheme: ColorThemeId = settings?.colorTheme || 'violet';
  const activeColorConfig = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.violet;

  // Close palette menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPaletteMenu(false);
      }
    };
    if (showPaletteMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [showPaletteMenu]);

  const handleRequestNotifs = async () => {
    const granted = await NotificationManager.requestPermission();
    setNotifGranted(granted);
    if (granted) {
      NotificationManager.notify(
        'StudyBuddy Notifications Active',
        'You will now receive scheduled Active Recall revision reminders.'
      );
    }
  };

  const getStatusBadge = () => {
    switch (aiStatus) {
      case 'online':
        return {
          icon: <Wifi className="w-3.5 h-3.5 text-emerald-500" />,
          dotColor: 'bg-emerald-500 animate-pulse',
          title: 'Online AI (Gemini 3.8)',
          label: 'Online AI',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        };
      case 'offline_ai':
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-amber-500" />,
          dotColor: 'bg-amber-500',
          title: 'Offline AI (Local Engine)',
          label: 'Offline AI',
          textColor: 'text-amber-700 dark:text-amber-300',
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        };
      case 'offline_none':
      default:
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-slate-400" />,
          dotColor: 'bg-slate-400',
          title: 'Offline — AI Paused',
          label: 'Offline',
          textColor: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <header className="sticky top-0 z-40 w-full border-b-3 border-slate-900 bg-white shadow-2d dark:border-slate-700 dark:bg-slate-900 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Logo with 2D Styling */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-400 text-slate-950 shadow-2d-sm dark:border-slate-700 animate-brain-wave">
            <Sparkles className="h-6 w-6 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                StudyBuddy<span className="text-amber-500">.AI</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-amber-300 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-2xs">
                🧠 Gemini Thinking
              </span>
            </div>
            <p className="hidden text-xs font-bold text-slate-600 dark:text-slate-400 sm:block">
              Course-Isolated RAG & Active Recall • Beginner Friendly
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Quick Toggle: Desktop Segmented Control */}
          {onUpdateTheme && (
            <div className="hidden md:flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-800/90">
              <button
                onClick={() => onUpdateTheme('light')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  currentTheme === 'light'
                    ? 'bg-white text-amber-600 shadow-xs font-semibold dark:bg-slate-700 dark:text-amber-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Switch to Light Theme"
                aria-label="Light theme"
              >
                <Sun className="h-3.5 w-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => onUpdateTheme('dark')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  currentTheme === 'dark'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-700 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Switch to Dark Theme"
                aria-label="Dark theme"
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => onUpdateTheme('system')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  currentTheme === 'system'
                    ? 'bg-white text-purple-600 shadow-xs font-semibold dark:bg-slate-700 dark:text-purple-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Sync with System Theme"
                aria-label="System theme"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Auto</span>
              </button>
            </div>
          )}

          {/* Theme Quick Toggle: Mobile 1-Tap Toggle */}
          {onUpdateTheme && (
            <button
              onClick={() => {
                const isCurrentlyDark =
                  typeof document !== 'undefined'
                    ? document.documentElement.classList.contains('dark')
                    : currentTheme === 'dark';
                onUpdateTheme(isCurrentlyDark ? 'light' : 'dark');
              }}
              className="flex md:hidden items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition"
              title={`Active: ${currentTheme}. Tap to toggle light/dark theme.`}
              aria-label="Toggle Light and Dark Mode"
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : currentTheme === 'light' ? (
                <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Laptop className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              )}
            </button>
          )}

          {/* Color Palette Quick Selector */}
          {onUpdateColorTheme && (
            <div className="relative" ref={paletteRef}>
              <button
                onClick={() => setShowPaletteMenu(!showPaletteMenu)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
                title={`Active Theme: ${activeColorConfig.name}. Tap to change app colors.`}
                aria-label="App Color Palette"
              >
                <Palette className="h-3.5 w-3.5" style={{ color: activeColorConfig.hex }} />
                <span className="hidden lg:inline text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  {activeColorConfig.name.split(' ')[0]}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15 dark:ring-white/20 shadow-2xs"
                  style={{ backgroundColor: activeColorConfig.hex }}
                />
              </button>

              {/* Color Themes Popover Menu */}
              {showPaletteMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Palette className="h-4 w-4 text-violet-500" />
                        Color Palette
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Select a vibrant theme for the whole app
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    {COLOR_THEME_LIST.map((th) => {
                      const isSelected = currentColorTheme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            onUpdateColorTheme(th.id);
                            setShowPaletteMenu(false);
                          }}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-700'
                              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-4 w-4 rounded-full shadow-2xs bg-gradient-to-tr ${th.previewGradient} ring-1 ring-black/10 dark:ring-white/10`}
                            />
                            <div className="text-left">
                              <div className="font-semibold text-xs leading-tight">{th.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                {th.tagline}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Indicator Chip */}
          <div className="relative">
            <button
              onClick={() => setShowStatusHelp(!showStatusHelp)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${badge.bg} ${badge.textColor} hover:opacity-90`}
              title="Click to view AI engine status details"
            >
              <span className={`h-2 w-2 rounded-full ${badge.dotColor}`} />
              <span className="hidden sm:inline">{badge.label}</span>
              <HelpCircle className="h-3 w-3 opacity-60" />
            </button>

            {/* Status Tooltip Modal */}
            {showStatusHelp && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Engine Connectivity
                  </span>
                  <button
                    onClick={() => {
                      onRefreshStatus();
                      setShowStatusHelp(false);
                    }}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Check now
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-100">Online AI:</strong> Full Gemini 3.8 Flash model via secure backend for deep reasoning & question generation.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-100">Offline AI:</strong> Local BM25 ranking & heuristic semantic evaluator running directly on device.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStatusHelp(false);
                    onOpenSettings();
                  }}
                  className="mt-3 w-full rounded-lg bg-slate-100 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                >
                  Configure AI Settings
                </button>
              </div>
            )}
          </div>

          {/* Automatic Cross-Device Sync (PC ↔ Phone) Status Indicator */}
          {onOpenCloudSync && (
            <button
              onClick={onOpenCloudSync}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-2xs ${
                user
                  ? 'border-emerald-300 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'border-blue-300 bg-blue-50/90 text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200'
              }`}
              title={
                user
                  ? `Automatic Sync Active (${user.email}). All changes on PC and Phone synchronize automatically in real time.`
                  : 'Turn on automatic real-time sync between PC and Phone'
              }
            >
              {user ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="hidden sm:inline leading-none font-bold">
                      ⚡ Auto-Sync Active
                    </span>
                    <span className="sm:hidden leading-none font-bold">
                      ⚡ Auto-Sync
                    </span>
                    <span className="hidden md:inline text-[9px] font-medium text-emerald-700 dark:text-emerald-300/80 leading-tight mt-0.5">
                      {isSyncing ? 'Syncing...' : (lastSyncLabel || 'Real-time (PC ↔ Phone)')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="hidden sm:inline leading-none font-bold">
                      ⚡ Enable Auto-Sync
                    </span>
                    <span className="sm:hidden leading-none font-bold">
                      Auto-Sync
                    </span>
                    <span className="hidden md:inline text-[9px] font-medium text-blue-600 dark:text-blue-300/80 leading-tight mt-0.5">
                      PC ↔ Phone Pairing
                    </span>
                  </div>
                </>
              )}
            </button>
          )}

          {/* Discreet Re-sync icon for testing */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title={lastSyncedAt ? `Auto-sync heartbeat active. Click to force instant reconcile.` : 'Reconcile now'}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          </button>

          {/* Notifications Permission */}
          {!notifGranted && (
            <button
              onClick={handleRequestNotifs}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
              title="Enable revision reminders"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Alerts</span>
            </button>
          )}

          {/* PWA In-App Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
