import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AIStatus, ThemeMode, ColorThemeId } from '../types';
import {
  saveSettings,
  exportEntireDatabaseJSON,
  importDatabaseFromJSON,
  clearAllUserData,
} from '../lib/db';
import { NotificationManager } from '../lib/notifications';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { COLOR_THEME_LIST, COLOR_THEMES } from '../lib/themes';
import {
  Settings,
  Cpu,
  Globe,
  Bell,
  Volume2,
  RefreshCw,
  Smartphone,
  Monitor,
  Download,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
  User,
  Trash2,
  Upload,
  HardDrive,
  Check,
  Sparkles,
  ShieldCheck,
  Accessibility,
  Palette,
  Cloud,
  ArrowRightLeft,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface SettingsViewProps {
  settings: AppSettings;
  aiStatus: AIStatus;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onUpdateTheme: (theme: ThemeMode) => void;
  onUpdateColorTheme?: (colorTheme: ColorThemeId) => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt?: number;
  onOpenDownloads?: () => void;
  onDataReset?: () => void;
  user?: FirebaseUser | null;
  onOpenCloudSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  aiStatus,
  onUpdateSettings,
  onUpdateTheme,
  onUpdateColorTheme,
  onTriggerSync,
  isSyncing,
  lastSyncedAt,
  onOpenDownloads,
  onDataReset,
  user,
  onOpenCloudSync,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ used: number; total: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'general' | 'sync' | 'ai' | 'study' | 'storage' | 'platforms'
  >('general');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isInstallable, install, isInstalled } = usePWAInstall();

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Load storage estimate
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageUsage({
            used: Math.round(est.usage / (1024 * 1024)),
            total: Math.round(est.quota / (1024 * 1024)),
          });
        }
      });
    }
  }, []);

  const handleToggle = async (key: keyof AppSettings) => {
    const updated = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(updated);
    const saved = await saveSettings(updated);
    onUpdateSettings(saved);
    flashSaved();
  };

  const handleChange = async (key: keyof AppSettings, val: any) => {
    const updated = { ...localSettings, [key]: val };
    setLocalSettings(updated);
    const saved = await saveSettings(updated);
    onUpdateSettings(saved);
    flashSaved();
  };

  const handleThemeChange = async (theme: ThemeMode) => {
    onUpdateTheme(theme);
    await handleChange('theme', theme);
  };

  const handleColorThemeChange = async (colorTheme: ColorThemeId) => {
    if (onUpdateColorTheme) {
      onUpdateColorTheme(colorTheme);
    }
    await handleChange('colorTheme', colorTheme);
  };

  const flashSaved = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestChime = () => {
    NotificationManager.playSoundSuccess();
  };

  // Database Backup & Restore Handlers
  const handleExportDatabase = async () => {
    try {
      const jsonString = await exportEntireDatabaseJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studybuddy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export database backup.');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Restoring backup...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await importDatabaseFromJSON(text);
        setImportStatus('Backup restored successfully!');
        setTimeout(() => {
          setImportStatus(null);
          if (onDataReset) onDataReset();
          else window.location.reload();
        }, 1200);
      } catch (err: any) {
        setImportStatus(`Restore failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    await clearAllUserData();
    setShowClearConfirm(false);
    if (onDataReset) {
      onDataReset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Preferences & System Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control appearance, AI intelligence modes, local storage quota, and backup routines.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        {[
          { id: 'general' as const, label: 'Account & Appearance', icon: User },
          { id: 'sync' as const, label: 'PC & Phone Sync', icon: ArrowRightLeft },
          { id: 'ai' as const, label: 'AI Engine', icon: Cpu },
          { id: 'study' as const, label: 'Study & Recall', icon: Bell },
          { id: 'storage' as const, label: 'Local Database & Backup', icon: Database },
          { id: 'platforms' as const, label: 'Platform & Install', icon: Smartphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'sync' && user && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB: PC & Phone Cross-Device Sync */}
      {activeSettingsTab === 'sync' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-sm dark:border-blue-900/60 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100 dark:border-blue-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    PC & Phone Cross-Device Synchronization
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Seamless two-way cloud persistence powered by Google Cloud Firestore
                  </p>
                </div>
              </div>

              {onOpenCloudSync && (
                <button
                  onClick={onOpenCloudSync}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 cursor-pointer"
                >
                  <Cloud className="h-4 w-4" />
                  <span>{user ? 'Manage Sync & Account' : 'Connect PC & Phone Sync'}</span>
                </button>
              )}
            </div>

            {/* Sync State Box */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Account Status</div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      user ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {user ? user.email : 'Not linked'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sync Frequency</div>
                <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                  Instant Real-Time (onSnapshot)
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Conflict Handling</div>
                <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                  Last-Write Wins + Local Cache
                </div>
              </div>
            </div>

            {/* How Cross-Device Sync Works */}
            <div className="mt-6 rounded-xl bg-white p-5 shadow-2xs dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                How PC ↔ Phone Synchronization Works
              </h3>
              <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>
                  <strong className="text-slate-900 dark:text-white">Sign in with Google on both devices:</strong> Open this web app on your laptop or PC and on your phone browser.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">Upload materials on PC:</strong> Drag and drop your PDFs, lecture notes, and slide decks from your computer.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">Immediate Mobile Access:</strong> Your courses, documents, chunked text, and generated flashcards will automatically appear on your phone within seconds.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">Review on your Phone:</strong> Take study sessions or answer recall quizzes while commuting. Your scores, weak topics, and spaced repetition schedules sync back to your PC!
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Account & Appearance */}
      {activeSettingsTab === 'general' && (
        <div className="space-y-6">
          {/* User Profile Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                Student Profile (Stored Locally)
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name / Preferred Name
                </label>
                <input
                  type="text"
                  value={localSettings.userName || ''}
                  onChange={(e) => handleChange('userName', e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email (Optional for cloud sync)
                </label>
                <input
                  type="email"
                  value={localSettings.userEmail || ''}
                  onChange={(e) => handleChange('userEmail', e.target.value)}
                  placeholder="alex@university.edu"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Profile details are kept private and stored locally on this device.
            </p>
          </div>

          {/* Theme & Appearance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Sun className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                Appearance & Theme
              </h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Interface Theme
                </label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'light' as ThemeMode, label: 'Light Mode', desc: 'Clean high contrast', icon: Sun, color: 'text-amber-500' },
                    { id: 'dark' as ThemeMode, label: 'Dark Mode', desc: 'Low-light comfort', icon: Moon, color: 'text-blue-600 dark:text-blue-400' },
                    { id: 'system' as ThemeMode, label: 'System Match', desc: 'Matches device', icon: Laptop, color: 'text-purple-600 dark:text-purple-400' },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = localSettings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleThemeChange(t.id)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-4 text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-500/40 shadow-xs dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${t.color}`} />
                        <span className="font-bold text-sm">{t.label}</span>
                        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Palette & Accent Tone */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Color Palette & Accent Tone
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose vibrant color accents for buttons, icons, highlights, and active states.
                    </p>
                  </div>
                  {localSettings.colorTheme && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: `${COLOR_THEMES[localSettings.colorTheme]?.hex || '#7c3aed'}20`,
                        color: COLOR_THEMES[localSettings.colorTheme]?.hex || '#7c3aed',
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: COLOR_THEMES[localSettings.colorTheme]?.hex || '#7c3aed' }}
                      />
                      Active: {COLOR_THEMES[localSettings.colorTheme]?.name || 'Violet'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {COLOR_THEME_LIST.map((th) => {
                    const isSelected = (localSettings.colorTheme || 'violet') === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => handleColorThemeChange(th.id)}
                        className={`group relative flex items-start gap-3 rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-50/90 dark:bg-slate-800/80 shadow-sm ring-2'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                        }`}
                        style={{
                          borderColor: isSelected ? th.hex : undefined,
                          ringColor: isSelected ? `${th.hex}50` : undefined,
                        }}
                      >
                        {/* Gradient preview circle */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${th.previewGradient} text-white shadow-sm ring-1 ring-black/10`}
                        >
                          {isSelected ? (
                            <Check className="h-5 w-5 stroke-[2.5]" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-white/90" />
                          )}
                        </div>

                        {/* Theme details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {th.name}
                            </span>
                            {isSelected && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: th.hex }}
                              >
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {th.tagline}
                          </p>
                          {/* Mini accent pills demo */}
                          <div className="mt-2 flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-6 rounded-full"
                              style={{ backgroundColor: th.hex }}
                            />
                            <span
                              className="h-1.5 w-3 rounded-full opacity-60"
                              style={{ backgroundColor: th.hex }}
                            />
                            <span
                              className="h-1.5 w-1.5 rounded-full opacity-30"
                              style={{ backgroundColor: th.hex }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reduced Motion Accessibility */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-white">
                    <Accessibility className="h-4 w-4 text-blue-600" />
                    <span>Reduced Motion</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Minimize UI transitions and animations for motion sensitivity.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.reducedMotion}
                  onChange={() => handleToggle('reducedMotion')}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI Engine */}
      {activeSettingsTab === 'ai' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Cpu className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                AI Provider & Intelligence Mode
              </h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Operational Mode
                </label>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: 'auto',
                      title: 'Auto (Recommended)',
                      desc: 'Uses Cloud Gemini 3.8 when online; auto-falls back to Local on-device AI when offline.',
                    },
                    {
                      id: 'online_only',
                      title: 'Online Only',
                      desc: 'Strictly requires cloud connection. Maximum reasoning depth and question generation.',
                    },
                    {
                      id: 'offline_only',
                      title: 'Offline Only',
                      desc: 'Runs zero external network calls. 100% on-device heuristic BM25 & semantic matching.',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleChange('aiMode', m.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        localSettings.aiMode === m.id
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500 dark:bg-blue-950/30'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        {m.title}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Web Research Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Web Research Grounding
                  </span>
                  <p className="text-[11px] text-slate-500">
                    When course notes do not contain the answer, allow AI Tutor to search the live web for verified academic context.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.researchMode}
                  onChange={() => handleToggle('researchMode')}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Study & Recall Preferences */}
      {activeSettingsTab === 'study' && (
        <div className="space-y-6">
          {/* Notifications & Audio Feedback */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Bell className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                Notifications & Audio Feedback
              </h2>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Active Recall Revision Reminders
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Deliver browser or native system notifications when spaced repetition sessions are due.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.notificationsEnabled}
                  onChange={() => handleToggle('notificationsEnabled')}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Interactive Sound Effects
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Play audio cues on correct question answers, quiz completions, and timer expiration.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestChime}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Test Chime
                  </button>
                  <input
                    type="checkbox"
                    checked={localSettings.reminderSound}
                    onChange={() => handleToggle('reminderSound')}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Study Defaults */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Study Session Defaults
            </h2>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Session Duration
                </label>
                <select
                  value={localSettings.defaultSessionDuration}
                  onChange={(e) => handleChange('defaultSessionDuration', Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value={15}>15 Minutes (Micro session)</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={45}>45 Minutes (Extended)</option>
                  <option value={60}>60 Minutes (Deep focus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Question Count per Session
                </label>
                <select
                  value={localSettings.defaultQuestionCount}
                  onChange={(e) => handleChange('defaultQuestionCount', Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Local Database & Storage Management */}
      {activeSettingsTab === 'storage' && (
        <div className="space-y-6">
          {/* Storage Quota Usage */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <HardDrive className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                IndexedDB Local Storage Quota
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Estimated Device Usage</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {storageUsage ? `${storageUsage.used} MB used of ~${storageUsage.total} MB` : 'Calculating...'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: storageUsage ? `${Math.min(100, (storageUsage.used / Math.max(1, storageUsage.total)) * 100)}%` : '5%',
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                All notes, course structures, RAG chunks, and questions are persisted in your local browser sandbox and will never expire unless cleared.
              </p>
            </div>
          </div>

          {/* Backup, Export & Restore */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Database className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                Database Backup & Portability
              </h2>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Export your entire study database (courses, documents, questions, schedules, history) as a single JSON file, or restore an existing backup.
            </p>

            {importStatus && (
              <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {importStatus}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportDatabase}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
              >
                <Download className="h-4 w-4" />
                <span>Export Full Backup (JSON)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
              >
                <Upload className="h-4 w-4" />
                <span>Restore Backup (JSON)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          </div>

          {/* Danger Zone: Clear Data */}
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2 pb-3 border-b border-red-100 dark:border-red-900/50">
              <Trash2 className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-sm text-red-900 dark:text-red-300">
                Danger Zone: Reset Local Data
              </h2>
            </div>

            <p className="mt-3 text-xs text-red-700 dark:text-red-400">
              Permanently deletes all courses, documents, extracted chunks, question banks, study sessions, and schedules from this device.
            </p>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All User Data</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Platform & Native Packages */}
      {activeSettingsTab === 'platforms' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Cross-Platform Packages
                </h2>
              </div>
              {onOpenDownloads && (
                <button
                  onClick={onOpenDownloads}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Open Downloads Center</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="font-semibold text-xs text-emerald-600 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  <span>Android (.apk)</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Direct installable release APK. Complete offline storage with Capacitor.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="font-semibold text-xs text-blue-600 flex items-center gap-1.5">
                  <Monitor className="h-4 w-4" />
                  <span>Windows (.exe)</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Standalone desktop installer with Electron and native window controls.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="font-semibold text-xs text-purple-600 flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  <span>Web PWA</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {isInstalled ? 'Running in Standalone Mode.' : 'Zero-install offline caching via Service Worker.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Cloud Synchronization
                </h2>
              </div>
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Automatic Background Sync
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Sync completed study sessions and revisions when online.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.autoSync}
                  onChange={() => handleToggle('autoSync')}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    Sync Original Documents (Cloud Opt-in)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Upload raw PDFs/notes to cloud storage. Off by default for maximum privacy.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.syncDocuments}
                  onChange={() => handleToggle('syncDocuments')}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>

              {lastSyncedAt && (
                <p className="text-[11px] text-slate-400">
                  Last synchronized: {new Date(lastSyncedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete All Local Data?
              </h3>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              This action cannot be undone. All your uploaded course materials, questions, notes, and progress logs stored in this browser will be wiped.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
