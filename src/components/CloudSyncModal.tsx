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
  UploadCloud,
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

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                PC & Phone Cross-Device Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload on PC ↔ Shows on Phone instantly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visual Device Link Diagram */}
        <div className="my-5 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 p-4 dark:border-blue-950 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30">
          <div className="flex items-center justify-between">
            {/* PC Box */}
            <div className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition ${
              deviceType === 'PC'
                ? 'bg-white shadow-sm ring-2 ring-blue-500 dark:bg-slate-800'
                : 'bg-white/60 dark:bg-slate-800/60'
            }`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <Laptop className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Your PC
              </span>
              {deviceType === 'PC' && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  This Device
                </span>
              )}
            </div>

            {/* Sync Waves */}
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
              </div>
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                {user ? 'Real-Time Sync' : 'Sign in to Link'}
              </span>
            </div>

            {/* Phone Box */}
            <div className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition ${
              deviceType === 'Phone'
                ? 'bg-white shadow-sm ring-2 ring-blue-500 dark:bg-slate-800'
                : 'bg-white/60 dark:bg-slate-800/60'
            }`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Your Phone
              </span>
              {deviceType === 'Phone' && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  This Device
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Account / Sign In Status */}
        <div className="space-y-4">
          {user ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {user.displayName || 'Google Account'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Linked
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onSignOut}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Status details */}
              <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 pt-2.5 text-[11px] text-slate-600 dark:border-emerald-900/60 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud Sync Active (Firestore)</span>
                </div>
                <span>
                  {syncStatus.lastSyncedAt
                    ? `Synced ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}`
                    : 'Up to date'}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mt-0.5">
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Link Your Google Account to Sync
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sign in with the same Google Account on both your PC and your phone. All uploaded notes, syllabi, and practice tests will synchronize in real time.
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
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Instructions to open on the other device */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-blue-600" />
              How to Open on Your {deviceType === 'PC' ? 'Phone' : 'PC'}
            </h4>
            <ol className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside">
              <li>
                Open the app URL in your mobile browser or PC.
              </li>
              <li>
                Sign into the same Google Account: <strong>{user?.email || 'your email'}</strong>.
              </li>
              <li>
                Upload any lecture, PDF, or note on one device — it will show on the other automatically!
              </li>
            </ol>

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
                className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Trigger Action */}
          {user && (
            <div className="pt-1">
              <button
                onClick={handleSyncNow}
                disabled={isManualSyncing || syncStatus.state === 'syncing'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 text-blue-600 ${
                    isManualSyncing || syncStatus.state === 'syncing' ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {isManualSyncing || syncStatus.state === 'syncing'
                    ? 'Synchronizing Cloud & Local Store...'
                    : 'Force Sync Now (Reconcile PC & Phone)'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
