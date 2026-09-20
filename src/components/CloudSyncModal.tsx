import React, { useState } from 'react';
import {
  Laptop,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cloud,
  ArrowRightLeft,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  LogIn,
  LogOut,
  Zap,
  QrCode,
} from 'lucide-react';
import { SyncStatusInfo } from '../lib/cloudSync';
import { User as FirebaseUser } from 'firebase/auth';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  syncStatus: SyncStatusInfo;
  deviceType: 'PC' | 'Phone' | 'Tablet';
  isAuthenticating: boolean;
  authError: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onTriggerSync: () => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  syncStatus,
  deviceType,
  isAuthenticating,
  authError,
  onSignIn,
  onSignOut,
  onTriggerSync,
}) => {
  const [copied, setCopied] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showQR, setShowQR] = useState(deviceType === 'PC');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncNow = async () => {
    setIsManualSyncing(true);
    try {
      await onTriggerSync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Zap className="h-5 w-5 fill-emerald-500 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Automatic Cross-Device Sync
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  100% Automatic
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload on PC ↔ Displays on Phone in real time (Zero clicks needed)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visual Device Link Diagram */}
        <div className="my-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-blue-50/40 to-emerald-50/60 p-4 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-blue-950/20 dark:to-emerald-950/30">
          <div className="flex items-center justify-between">
            {/* PC Box */}
            <div
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition ${
                deviceType === 'PC'
                  ? 'bg-white shadow-sm ring-2 ring-emerald-500 dark:bg-slate-800'
                  : 'bg-white/70 dark:bg-slate-800/70'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <Laptop className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Your PC
              </span>
              {deviceType === 'PC' && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Current
                </span>
              )}
            </div>

            {/* Sync Waves */}
            <div className="flex flex-col items-center gap-1 px-2 text-center">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <ArrowRightLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              </div>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                {user ? 'Automatic Sync Active' : 'Sign in to Link'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {user ? '< 500ms propagation' : 'Both devices paired'}
              </span>
            </div>

            {/* Phone Box */}
            <div
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition ${
                deviceType === 'Phone'
                  ? 'bg-white shadow-sm ring-2 ring-emerald-500 dark:bg-slate-800'
                  : 'bg-white/70 dark:bg-slate-800/70'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Your Phone
              </span>
              {deviceType === 'Phone' && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  Current
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Account / Sign In Status */}
        <div className="space-y-4">
          {user ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {user.displayName || 'Google Account'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-200/80 px-2 py-0.2 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Auto-Sync Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onSignOut}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Status details */}
              <div className="mt-3 flex items-center justify-between border-t border-emerald-200 pt-2.5 text-[11px] text-emerald-900 dark:border-emerald-900/60 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Continuous Firestore Listeners (8 Data Collections)</span>
                </div>
                <span className="font-semibold">
                  {syncStatus.lastSyncLabel || 'Synced in real time'}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mt-0.5">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Sign In to Enable Automatic Sync
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Sign in with your Google Account on both your PC and your phone. Once signed in, any note, syllabus, or quiz created on either device will automatically appear on the other device in real time.
                  </p>
                </div>
              </div>

              {authError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                onClick={onSignIn}
                disabled={isAuthenticating}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign in with Google to Start Auto-Sync</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Connect Mobile via QR Code or Link */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                Open on Your {deviceType === 'PC' ? 'Phone' : 'PC'} (Fast Pair)
              </h4>
              <button
                onClick={() => setShowQR(!showQR)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>{showQR ? 'Hide QR Code' : 'Show Phone QR Code'}</span>
              </button>
            </div>

            {showQR && (
              <div className="mt-3 flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-200 shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt="Scan with phone camera to open"
                    className="h-28 w-28 rounded"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-left space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                      1
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Point your phone camera at this QR code
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">
                      2
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Tap the banner to open the app on phone
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-800">
                      3
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Sign into {user?.email || 'the same account'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                    ⚡ Auto-sync connects instantly and works in the background!
                  </p>
                </div>
              </div>
            )}

            {/* Quick Copy Link Bar */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
              <button
                onClick={handleCopyLink}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* How Automatic Sync Operates Under the Hood */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Automatic Background Synchronization Guarantees:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>
                <strong>Instant Push:</strong> Any course, note, or flashcard created locally is pushed to cloud within 200ms.
              </li>
              <li>
                <strong>Live Listener:</strong> When your phone is open, changes from your PC stream in live without refreshing.
              </li>
              <li>
                <strong>Automatic Reconnect:</strong> Switching browser tabs or waking phone triggers an instant silent sync.
              </li>
              <li>
                <strong>Offline Persistence:</strong> If you lose internet, changes save to IndexedDB and automatically flush when reconnected.
              </li>
            </ul>
          </div>

          {/* Optional Manual Reconcile Button */}
          {user && (
            <div className="pt-1">
              <button
                onClick={handleSyncNow}
                disabled={isManualSyncing || syncStatus.state === 'syncing'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 px-4 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-slate-500 ${
                    isManualSyncing || syncStatus.state === 'syncing' ? 'animate-spin text-blue-600' : ''
                  }`}
                />
                <span>
                  {isManualSyncing || syncStatus.state === 'syncing'
                    ? 'Syncing changes in background...'
                    : 'Force Instant Reconcile Now (Optional)'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
