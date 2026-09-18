import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Monitor,
  Globe,
  Download,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  FileCode,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Laptop,
  Check,
  Copy,
} from 'lucide-react';

export const DownloadsView: React.FC = () => {
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<'android' | 'windows' | 'pwa' | null>(null);
  const [downloadTriggered, setDownloadTriggered] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownloadFile = (filename: string, label: string) => {
    setDownloadTriggered(label);
    // Create download anchor
    const link = document.createElement('a');
    link.href = `/releases/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadTriggered(null);
    }, 4000);
  };

  const toggleGuide = (guide: 'android' | 'windows' | 'pwa') => {
    setExpandedGuide(expandedGuide === guide ? null : guide);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20 md:pb-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <ShieldCheck className="h-4 w-4" />
          <span>Cross-Platform Distribution • v1.0.0</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Get StudyBuddy AI for your devices
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Enjoy a distraction-free, privacy-first study companion. 100% offline-capable with local IndexedDB storage, course-isolated RAG, and scheduled active recall.
        </p>
      </div>

      {downloadTriggered && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">
              Downloading {downloadTriggered}... Check your browser's download manager.
            </span>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">v1.0.0</span>
        </div>
      )}

      {/* 3 Major Platforms Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Android Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Smartphone className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Android APK
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Android Package
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Install directly on your phone or tablet. Includes background notification alarms for active recall sessions.
            </p>

            <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Offline-first IndexedDB database</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Capacitor native Android bridge</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Size: ~18.5 MB</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => handleDownloadFile('studybuddy-ai-v1.0.0.apk', 'Android APK')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Download .APK (v1.0.0)</span>
            </button>

            <button
              onClick={() => toggleGuide('android')}
              className="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <span>Installation Steps</span>
              {expandedGuide === 'android' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {expandedGuide === 'android' && (
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1.5 dark:bg-slate-800 dark:text-slate-300">
                <p>1. Tap the download button above.</p>
                <p>2. Open your device's <strong>Downloads</strong> folder.</p>
                <p>3. Tap <code>studybuddy-ai-v1.0.0.apk</code> and tap <strong>Install</strong>.</p>
                <p>4. If asked, enable <em>"Allow from this source"</em>.</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-[10px] text-slate-400">Build command:</span>
                  <div className="flex items-center justify-between font-mono bg-slate-900 text-slate-200 p-1.5 rounded mt-1">
                    <span>npm run build:android</span>
                    <button onClick={() => copyToClipboard('npm run build:android', 'apk')}>
                      {copiedCmd === 'apk' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Windows Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Monitor className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Windows .exe
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Windows Desktop
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Native desktop application with dedicated window frame, local file dialogs, and instant startup.
            </p>

            <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-blue-600" />
                <span>Electron wrapper & NSIS installer</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-blue-600" />
                <span>Fast local document text extraction</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-blue-600" />
                <span>Architecture: x64 / Windows 10 & 11</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => handleDownloadFile('StudyBuddyAI-Setup-1.0.0.exe', 'Windows Installer')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-700 active:scale-95 transition"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Download .EXE (v1.0.0)</span>
            </button>

            <button
              onClick={() => toggleGuide('windows')}
              className="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <span>Installation Steps</span>
              {expandedGuide === 'windows' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {expandedGuide === 'windows' && (
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1.5 dark:bg-slate-800 dark:text-slate-300">
                <p>1. Download <code>StudyBuddyAI-Setup-1.0.0.exe</code>.</p>
                <p>2. Double-click the installer to launch setup.</p>
                <p>3. Follow on-screen prompts to place a shortcut on Desktop and Start Menu.</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-[10px] text-slate-400">Build command:</span>
                  <div className="flex items-center justify-between font-mono bg-slate-900 text-slate-200 p-1.5 rounded mt-1">
                    <span>npm run build:windows</span>
                    <button onClick={() => copyToClipboard('npm run build:windows', 'win')}>
                      {copiedCmd === 'win' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Web / PWA Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <Globe className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Web PWA
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Progressive Web App
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Runs in Chrome, Edge, Safari, Firefox. Add to home screen for full offline access without any download.
            </p>

            <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600" />
                <span>Service Worker offline caching</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600" />
                <span>Instant launch & zero download size</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600" />
                <span>Works on iOS, macOS, Chromebook, Linux</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-purple-50 p-2.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Installed (Standalone Mode)</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-purple-700 active:scale-95 transition"
              >
                <Download className="h-4 w-4" />
                <span>Install Web App</span>
              </button>
            ) : (
              <div className="rounded-xl border border-slate-200 p-2.5 text-center text-xs text-slate-500 dark:border-slate-800">
                Use browser menu to "Install App" or "Add to Home Screen"
              </div>
            )}

            <button
              onClick={() => toggleGuide('pwa')}
              className="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <span>Browser Instructions</span>
              {expandedGuide === 'pwa' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {expandedGuide === 'pwa' && (
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1.5 dark:bg-slate-800 dark:text-slate-300">
                <p><strong>Chrome / Edge:</strong> Click the install icon in the address bar or click ⋮ → "Install StudyBuddy AI".</p>
                <p><strong>Safari (iOS):</strong> Tap the Share button → "Add to Home Screen".</p>
                <p><strong>Safari (macOS Sonoma+):</strong> File → "Add to Dock".</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Release Verification & SHA-256 Hashes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <span>Release Integrity & Verification (v1.0.0)</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          All distribution binaries are deterministically built from source with no external tracking or telemetry.
        </p>

        <div className="mt-4 space-y-3 font-mono text-[11px]">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/80">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Android APK (v1.0.0):</span>
            <div className="mt-1 text-slate-500 break-all select-all">
              SHA256: 4e91bc43a79d031802bcf1b54a72810f63c8091d3202158ef6917631174ef819
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/80">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Windows Installer (v1.0.0):</span>
            <div className="mt-1 text-slate-500 break-all select-all">
              SHA256: a819df51cb289e618903c72b810931af8812c70014efbc0891238914619ea011
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
