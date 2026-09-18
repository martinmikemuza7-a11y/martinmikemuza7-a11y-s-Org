import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Monitor,
  Globe,
  Download,
  CheckCircle2,
  ShieldCheck,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  Share2,
  AlertCircle,
  PackageCheck,
  FolderArchive,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const DownloadsView: React.FC = () => {
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'android' | 'windows' | 'pwabuilder' | 'offline' | null>(null);
  const [downloadTriggered, setDownloadTriggered] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleDownloadFile = (filename: string, label: string) => {
    setDownloadTriggered(label);
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

  const toggleSection = (section: 'android' | 'windows' | 'pwabuilder' | 'offline') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // PWABuilder generator link pre-filled with live app URL
  const pwabuilderUrl = `https://www.pwabuilder.com/?url=${encodeURIComponent(window.location.origin)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-amber-300 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-2d-sm">
          <ShieldCheck className="h-4 w-4" />
          <span>Real App Installation • Android & PC</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          Install StudyBuddy AI on your Devices
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
          Run distraction-free with zero browser tabs. Works 100% offline with local IndexedDB storage, course-isolated RAG, and scheduled active recall.
        </p>
      </div>

      {/* Iframe Notice & One-Click Full Tab Launcher */}
      {isInIframe && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-2d rounded-2xl border-2 border-slate-900 bg-amber-100 p-5 shadow-2d flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:border-slate-700 dark:bg-amber-950/40"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 text-slate-950 font-black shadow-2d-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                Installing from AI Studio Preview?
              </h2>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                Web browsers intentionally restrict direct app installations inside editor iframes for security. Open the app in its own browser tab to enable 1-tap installation on Android & PC.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={copyAppUrl}
              className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3.5 py-2 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-slate-100 transition cursor-pointer dark:bg-slate-800 dark:text-white dark:border-slate-700"
            >
              {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copiedUrl ? 'URL Copied!' : 'Copy App Link'}</span>
            </motion.button>

            <motion.a
              href={window.location.origin}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-2d hover:bg-amber-300 transition cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open in Full Tab (Install Ready)</span>
            </motion.a>
          </div>
        </motion.div>
      )}

      {/* Download Alert Toast */}
      {downloadTriggered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-2d rounded-xl border-2 border-slate-900 bg-emerald-100 p-4 text-slate-950 shadow-2d flex items-center justify-between dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-black">
              Downloading {downloadTriggered}... Check your browser downloads folder.
            </span>
          </div>
          <span className="text-xs font-mono font-black">v1.0.0</span>
        </motion.div>
      )}

      {/* Primary 2-Platform Core Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Android Installation Card */}
        <div className="card-2d flex flex-col justify-between rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-emerald-200 text-slate-950 font-black shadow-2d-sm">
                <Smartphone className="h-6 w-6" />
              </div>
              <span className="rounded-full border-2 border-slate-900 bg-emerald-100 px-3 py-0.5 text-xs font-black text-slate-950 shadow-2d-sm">
                Android (Native WebAPK)
              </span>
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
              Install on Android
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
              Android turns StudyBuddy AI into a real native app package (WebAPK) with home screen icon, app drawer entry, and full offline storage.
            </p>

            <div className="mt-4 space-y-2 rounded-xl border-2 border-slate-900 bg-emerald-50/60 p-3.5 text-xs text-slate-900 font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 font-bold shrink-0" />
                <span>Zero sideloading warnings or dangerous APK permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 font-bold shrink-0" />
                <span>Full screen standalone app (no browser search bar)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 font-bold shrink-0" />
                <span>Offline-first IndexedDB database & active recall alarms</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-emerald-200 p-2.5 text-xs font-black text-slate-950 shadow-2d-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>StudyBuddy AI is Installed on this Device</span>
              </div>
            ) : isInstallable ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={install}
                className="btn-2d flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 shadow-2d hover:bg-emerald-200 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>1-Tap Install on Android Device</span>
              </motion.button>
            ) : (
              <div className="space-y-2">
                <motion.a
                  href={window.location.origin}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-2d flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d hover:bg-amber-300 transition cursor-pointer text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open App in Android Chrome to Install</span>
                </motion.a>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleSection('android')}
              className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-black text-slate-800 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white cursor-pointer"
            >
              <span>{expandedSection === 'android' ? 'Hide Android Instructions' : 'View Android Step-by-Step Guide'}</span>
              {expandedSection === 'android' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {expandedSection === 'android' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border-2 border-slate-900 bg-slate-50 p-4 text-xs font-medium text-slate-900 space-y-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <p className="font-black text-slate-950 dark:text-white">How to install on Android in 15 seconds:</p>
                  <p>1. Open <strong className="font-bold underline cursor-pointer" onClick={copyAppUrl}>this link</strong> in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on your phone.</p>
                  <p>2. Tap the three dots (<strong>⋮</strong>) in the top-right corner of Chrome.</p>
                  <p>3. Tap <strong>&quot;Install app&quot;</strong> (or <strong>&quot;Add to Home screen&quot;</strong>).</p>
                  <p>4. Android will automatically compile and install the real native <strong>WebAPK</strong> onto your phone!</p>
                  <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-bold">Need a standalone .APK file?</span>
                    <button
                      type="button"
                      onClick={() => toggleSection('pwabuilder')}
                      className="text-[11px] font-black text-blue-600 hover:underline cursor-pointer"
                    >
                      Use PWABuilder →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. Windows PC Desktop Card */}
        <div className="card-2d flex flex-col justify-between rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-blue-200 text-slate-950 font-black shadow-2d-sm">
                <Monitor className="h-6 w-6" />
              </div>
              <span className="rounded-full border-2 border-slate-900 bg-blue-100 px-3 py-0.5 text-xs font-black text-slate-950 shadow-2d-sm">
                Windows 10 & 11 Desktop
              </span>
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
              Install on Windows PC
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
              Runs as a standalone desktop application with its own native window, taskbar pin, and desktop shortcut.
            </p>

            <div className="mt-4 space-y-2 rounded-xl border-2 border-slate-900 bg-blue-50/60 p-3.5 text-xs text-slate-900 font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600 font-bold shrink-0" />
                <span>Starts instantly with no background bloatware or heavy installers</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600 font-bold shrink-0" />
                <span>Dedicated desktop window with native OS borders</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600 font-bold shrink-0" />
                <span>Works on Windows 10, 11, macOS, and Linux</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-blue-200 p-2.5 text-xs font-black text-slate-950 shadow-2d-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Desktop App is Installed</span>
              </div>
            ) : isInstallable ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={install}
                className="btn-2d flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-blue-300 px-4 py-3 text-xs font-black text-slate-950 shadow-2d hover:bg-blue-200 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Install Windows Desktop App</span>
              </motion.button>
            ) : (
              <div className="space-y-2">
                <motion.a
                  href={window.location.origin}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-2d flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d hover:bg-amber-300 transition cursor-pointer text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in Microsoft Edge / Chrome to Install</span>
                </motion.a>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleSection('windows')}
              className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-black text-slate-800 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white cursor-pointer"
            >
              <span>{expandedSection === 'windows' ? 'Hide Windows Instructions' : 'View Windows Step-by-Step Guide'}</span>
              {expandedSection === 'windows' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {expandedSection === 'windows' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border-2 border-slate-900 bg-slate-50 p-4 text-xs font-medium text-slate-900 space-y-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <p className="font-black text-slate-950 dark:text-white">How to install on Windows PC:</p>
                  <p>1. Open this app in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>.</p>
                  <p>2. Look at the right side of the address bar for the <strong>Install</strong> icon (computer with down arrow or +).</p>
                  <p>3. Or click menu (<strong>⋮</strong> or <strong>...</strong>) → <strong>Apps</strong> → <strong>&quot;Install StudyBuddy AI&quot;</strong>.</p>
                  <p>4. Click <strong>Install</strong>. Windows will add desktop and Start menu shortcuts!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Standalone Package Generator: PWABuilder (Official Microsoft & Google Tool) */}
      <div className="card-2d rounded-2xl border-2 border-slate-900 bg-purple-50/60 p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-purple-300 text-slate-950 font-black shadow-2d-sm">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-purple-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950 mb-1">
                <span>Free Cloud Packaging</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                Generate Signed Android APK or Windows MSIX/EXE via PWABuilder
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-xl">
                Need a standalone .APK file for Google Play or a .MSIX/.EXE installer for Windows? PWABuilder (an open-source tool developed by Microsoft and Google) compiles your app into store-ready signed packages in 60 seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <motion.a
              href={pwabuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="btn-2d flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-purple-300 px-4 py-2.5 text-xs font-black text-slate-950 shadow-2d hover:bg-purple-200 transition cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Package on PWABuilder →</span>
            </motion.a>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-900/30 bg-white p-3 dark:bg-slate-800 dark:border-slate-700">
            <span className="font-black text-slate-950 dark:text-white block mb-0.5">Step 1: Open PWABuilder</span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">Click the button above with your app URL pre-filled.</span>
          </div>
          <div className="rounded-xl border border-slate-900/30 bg-white p-3 dark:bg-slate-800 dark:border-slate-700">
            <span className="font-black text-slate-950 dark:text-white block mb-0.5">Step 2: Choose Platform</span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">Select &quot;Android (APK/AAB)&quot; or &quot;Windows (MSIX/EXE)&quot;.</span>
          </div>
          <div className="rounded-xl border border-slate-900/30 bg-white p-3 dark:bg-slate-800 dark:border-slate-700">
            <span className="font-black text-slate-950 dark:text-white block mb-0.5">Step 3: Download Package</span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">Download your real compiled, signed installation package.</span>
          </div>
        </div>
      </div>

      {/* Offline Starter Bundle & Documentation Downloads */}
      <div className="card-2d rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-2d dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FolderArchive className="h-5 w-5 text-slate-900 dark:text-white" />
            <h3 className="font-black text-sm sm:text-base text-slate-950 dark:text-white">
              Official Downloads & Offline Bundles
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">Verified Binaries</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-2d rounded-xl border-2 border-slate-900 bg-slate-50 p-4 shadow-2d-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-950 dark:text-white flex items-center gap-1.5">
                  <FolderArchive className="h-4 w-4 text-amber-500" />
                  <span>Offline Web App Bundle (.zip)</span>
                </span>
                <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-black text-slate-950">
                  ZIP Archive
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                Complete self-contained offline web package containing client assets, icons, manifest, and step-by-step installation guides.
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleDownloadFile('StudyBuddyAI-Offline-Package-v1.0.0.zip', 'Offline Web App Bundle (.zip)')}
              className="btn-2d mt-4 flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-900 bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-amber-300 transition cursor-pointer"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Download Offline Bundle (.zip)</span>
            </motion.button>
          </div>

          <div className="card-2d rounded-xl border-2 border-slate-900 bg-slate-50 p-4 shadow-2d-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-950 dark:text-white flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  <span>Installation & Packaging Manual (.txt)</span>
                </span>
                <span className="rounded bg-blue-200 px-2 py-0.5 text-[10px] font-black text-slate-950">
                  TXT Guide
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                Plain-text guide detailing Android WebAPK setup, Windows desktop shortcut instructions, and Capacitor/Electron compilation.
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleDownloadFile('INSTALL-GUIDE.txt', 'Installation Guide (.txt)')}
              className="btn-2d mt-4 flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3.5 py-2 text-xs font-black text-slate-950 shadow-2d-sm hover:bg-slate-100 transition cursor-pointer dark:bg-slate-900 dark:text-white dark:border-slate-700"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Download Installation Guide (.txt)</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
