import React, { useState } from 'react';
import {
  Home,
  BookOpen,
  GraduationCap,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Wifi,
  WifiOff,
  Cpu,
  RefreshCw,
  Palette,
  ArrowRightLeft,
  Cloud,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { AIStatus, AppSettings, ThemeMode, ColorThemeId } from '../types';
import { COLOR_THEME_LIST, COLOR_THEMES } from '../lib/themes';

export type NavTab =
  | 'home'
  | 'courses'
  | 'study'
  | 'recall'
  | 'tutor'
  | 'progress'
  | 'settings'
  | 'downloads';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingRecallCount?: number;
  aiStatus: AIStatus;
  settings: AppSettings | null;
  onUpdateTheme: (theme: ThemeMode) => void;
  onUpdateColorTheme?: (colorTheme: ColorThemeId) => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  user?: FirebaseUser | null;
  onOpenCloudSync?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingRecallCount = 0,
  aiStatus,
  settings,
  onUpdateTheme,
  onUpdateColorTheme,
  onTriggerSync,
  isSyncing,
  user,
  onOpenCloudSync,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  const currentColorTheme: ColorThemeId = settings?.colorTheme || 'violet';
  const activeColorConfig = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.violet;

  // Desktop primary sidebar navigation items
  const mainNavItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'courses' as NavTab, label: 'Courses', icon: BookOpen },
    { id: 'study' as NavTab, label: 'Study', icon: GraduationCap },
    { id: 'recall' as NavTab, label: 'Review', icon: Calendar, badge: pendingRecallCount },
    { id: 'tutor' as NavTab, label: 'Ask AI', icon: MessageSquare },
  ];

  const secondaryNavItems = [
    { id: 'progress' as NavTab, label: 'Progress', icon: BarChart3 },
    { id: 'downloads' as NavTab, label: 'Install App', icon: Download },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  // Mobile bottom bar items: 5 core tabs
  const mobileNavItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'courses' as NavTab, label: 'Courses', icon: BookOpen },
    { id: 'study' as NavTab, label: 'Study', icon: GraduationCap },
    { id: 'recall' as NavTab, label: 'Review', icon: Calendar, badge: pendingRecallCount },
    { id: 'tutor' as NavTab, label: 'Ask AI', icon: MessageSquare },
  ];

  const getStatusIndicator = () => {
    switch (aiStatus) {
      case 'online':
        return {
          icon: <Wifi className="h-3.5 w-3.5 text-emerald-500" />,
          label: 'Online AI',
          color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        };
      case 'offline_ai':
        return {
          icon: <Cpu className="h-3.5 w-3.5 text-amber-500" />,
          label: 'Local Offline AI',
          color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        };
      case 'offline_none':
      default:
        return {
          icon: <WifiOff className="h-3.5 w-3.5 text-slate-400" />,
          label: 'Offline (AI Paused)',
          color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const status = getStatusIndicator();

  return (
    <>
      {/* Desktop Left Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
          <div
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${activeColorConfig.previewGradient} text-white shadow-md shadow-violet-500/20`}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  StudyBuddy<span style={{ color: activeColorConfig.hex }}>.AI</span>
                </span>
                <span className="text-[10px] font-medium text-slate-500">Offline & Online</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Core Study
              </div>
            )}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${activeColorConfig.hex}18`,
                          color: activeColorConfig.hex,
                        }
                      : undefined
                  }
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? 'font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    style={isActive ? { color: activeColorConfig.hex } : undefined}
                    className={`h-5 w-5 flex-shrink-0 transition ${
                      isActive ? '' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`ml-auto flex items-center justify-center rounded-full bg-red-500 font-bold text-white ${
                        isCollapsed
                          ? 'absolute top-1 right-1 h-2 w-2 p-0 text-[0px]'
                          : 'px-2 py-0.5 text-[10px]'
                      }`}
                    >
                      {isCollapsed ? '' : item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Tools & Settings
              </div>
            )}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${activeColorConfig.hex}18`,
                          color: activeColorConfig.hex,
                        }
                      : undefined
                  }
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? 'font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    style={isActive ? { color: activeColorConfig.hex } : undefined}
                    className={`h-5 w-5 flex-shrink-0 transition ${
                      isActive ? '' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer: AI Status, Theme Toggle, Color Palette & User Info */}
        <div className="border-t border-slate-100 p-3 dark:border-slate-800 space-y-2">
          {/* AI Status Badge */}
          <div
            className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition ${status.color} ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={`Status: ${status.label}`}
          >
            {status.icon}
            {!isCollapsed && <span className="truncate font-medium">{status.label}</span>}
          </div>

          {/* Quick Color Accent Palette Bar */}
          {onUpdateColorTheme && !isCollapsed && (
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5 px-0.5">
                <span className="flex items-center gap-1.5">
                  <Palette className="h-3 w-3" style={{ color: activeColorConfig.hex }} />
                  <span>Color Theme</span>
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded-full"
                  style={{
                    backgroundColor: `${activeColorConfig.hex}20`,
                    color: activeColorConfig.hex,
                  }}
                >
                  {activeColorConfig.name.split(' ')[0]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 px-0.5">
                {COLOR_THEME_LIST.map((th) => {
                  const isSel = currentColorTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => onUpdateColorTheme(th.id)}
                      className={`h-5 w-5 rounded-full transition cursor-pointer ${
                        isSel
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-115 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: th.hex,
                      }}
                      title={`${th.name}: ${th.tagline}`}
                      aria-label={th.name}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Theme Switcher in Desktop Sidebar */}
          {!isCollapsed ? (
            <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
              <button
                onClick={() => onUpdateTheme('light')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-medium transition ${
                  (settings?.theme || 'system') === 'light'
                    ? 'bg-white text-amber-600 shadow-xs font-semibold dark:bg-slate-700 dark:text-amber-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Light mode"
                aria-label="Light mode"
              >
                <Sun className="h-3.5 w-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => onUpdateTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-medium transition ${
                  (settings?.theme || 'system') === 'dark'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-700 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Dark mode"
                aria-label="Dark mode"
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => onUpdateTheme('system')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-medium transition ${
                  (settings?.theme || 'system') === 'system'
                    ? 'bg-white text-purple-600 shadow-xs font-semibold dark:bg-slate-700 dark:text-purple-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="System auto match"
                aria-label="System mode"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Auto</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const isCurrentlyDark =
                  typeof document !== 'undefined'
                    ? document.documentElement.classList.contains('dark')
                    : (settings?.theme || 'system') === 'dark';
                onUpdateTheme(isCurrentlyDark ? 'light' : 'dark');
              }}
              className="flex w-full items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition"
              title="Toggle Light/Dark Theme"
              aria-label="Toggle Light/Dark Theme"
            >
              {(settings?.theme || 'system') === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          )}

          {/* Cross-Device Sync (PC & Phone) Mini Bar */}
          {onOpenCloudSync && !isCollapsed && (
            <button
              onClick={onOpenCloudSync}
              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                user
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
              }`}
            >
              <div className="flex items-center gap-2">
                {user ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <Cloud className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
                <span className="truncate">{user ? 'PC ↔ Phone Synced' : 'Sync PC & Phone'}</span>
              </div>
              <ArrowRightLeft className="h-3 w-3 opacity-60" />
            </button>
          )}

          {/* User mini profile card */}
          {!isCollapsed && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {settings?.userName ? settings.userName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {settings?.userName || 'Student'}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">Local Profile</p>
                </div>
              </div>
              <button
                onClick={() => onSelectTab('settings')}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 core tabs + "More") */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t-2 border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div className="flex h-16 items-center justify-around px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setShowMobileMore(false);
                  onSelectTab(item.id);
                }}
                style={isActive ? { color: activeColorConfig.hex } : undefined}
                className={`relative flex flex-col items-center justify-center p-1 min-h-[44px] min-w-[44px] transition cursor-pointer ${
                  isActive ? 'font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="mt-1 text-[10px]">{item.label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-1 h-1 w-4 rounded-full"
                    style={{ backgroundColor: activeColorConfig.hex }}
                  />
                )}
              </button>
            );
          })}

          {/* "More" Trigger */}
          <button
            onClick={() => setShowMobileMore(!showMobileMore)}
            style={
              showMobileMore || ['progress', 'settings', 'downloads'].includes(activeTab)
                ? { color: activeColorConfig.hex }
                : undefined
            }
            className={`relative flex flex-col items-center justify-center p-1 min-h-[44px] min-w-[44px] transition cursor-pointer ${
              showMobileMore || ['progress', 'settings', 'downloads'].includes(activeTab)
                ? 'font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="mt-1 text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer Modal */}
      {showMobileMore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 md:hidden animate-in fade-in duration-150">
          <div
            className="relative rounded-t-3xl border-t-2 border-slate-300 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: activeColorConfig.hex }} />
                <span className="text-sm font-bold text-slate-900 dark:text-white">More Options</span>
              </div>
              <button
                onClick={() => setShowMobileMore(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-1">
              {onOpenCloudSync && (
                <button
                  onClick={() => {
                    setShowMobileMore(false);
                    onOpenCloudSync();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-semibold transition cursor-pointer mb-2 ${
                    user
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>PC ↔ Phone Sync</span>
                        {user && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                      <p className="text-[11px] font-normal opacity-80">
                        {user ? 'Connected and syncing live' : 'Link phone with PC'}
                      </p>
                    </div>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 opacity-60" />
                </button>
              )}

              <button
                onClick={() => {
                  setShowMobileMore(false);
                  onSelectTab('progress');
                }}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <span>Progress & Analytics</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileMore(false);
                  onSelectTab('downloads');
                }}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="h-5 w-5 text-emerald-500" />
                <span>Install Apps (Android, Windows, PWA)</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileMore(false);
                  onSelectTab('settings');
                }}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Settings className="h-5 w-5 text-purple-500" />
                <span>Settings & Preferences</span>
              </button>
            </div>

            {/* Quick Actions in Mobile Drawer: Color Theme, Theme & Sync */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {/* Color Palette in Mobile Drawer */}
              {onUpdateColorTheme && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5" style={{ color: activeColorConfig.hex }} />
                      Color Palette
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${activeColorConfig.hex}20`,
                        color: activeColorConfig.hex,
                      }}
                    >
                      {activeColorConfig.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 py-1">
                    {COLOR_THEME_LIST.map((th) => {
                      const isSel = currentColorTheme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => onUpdateColorTheme(th.id)}
                          className={`h-7 w-7 rounded-full transition cursor-pointer flex items-center justify-center ${
                            isSel
                              ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110 shadow-sm'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: th.hex,
                          }}
                          title={th.name}
                          aria-label={th.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">Theme</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <button
                    onClick={() => onUpdateTheme('light')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
                      (settings?.theme || 'system') === 'light'
                        ? 'bg-white shadow-xs text-amber-600 font-semibold dark:bg-slate-700 dark:text-amber-400'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                    title="Light mode"
                    aria-label="Light mode"
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => onUpdateTheme('dark')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
                      (settings?.theme || 'system') === 'dark'
                        ? 'bg-white shadow-xs text-blue-600 font-semibold dark:bg-slate-700 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                    title="Dark mode"
                    aria-label="Dark mode"
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => onUpdateTheme('system')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition ${
                      (settings?.theme || 'system') === 'system'
                        ? 'bg-white shadow-xs text-purple-600 font-semibold dark:bg-slate-700 dark:text-purple-400'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                    title="System auto match"
                    aria-label="System theme"
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Cloud Sync</span>
                <button
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1 text-blue-600 font-semibold disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
