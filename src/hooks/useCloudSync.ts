import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, testConnection } from '../lib/firebase';
import {
  startRealtimeSync,
  reconcileData,
  subscribeToSyncStatus,
  getSyncStatus,
  getDeviceType,
  SyncStatusInfo,
} from '../lib/cloudSync';

export function useCloudSync(onDataChanged?: () => void) {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(getSyncStatus());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [deviceType] = useState<'PC' | 'Phone' | 'Tablet'>(getDeviceType());
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor auth state changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setAuthError(null);
        // Test connection
        await testConnection();
        // Start live sync
        startRealtimeSync(onDataChanged);
      }
    });

    const unsubStatus = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubAuth();
      unsubStatus();
    };
  }, [onDataChanged]);

  const signIn = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
      await reconcileData(onDataChanged);
      startRealtimeSync(onDataChanged);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setAuthError(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [onDataChanged]);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!user) return;
    await reconcileData(onDataChanged);
  }, [user, onDataChanged]);

  return {
    user,
    isAuthenticated: !!user,
    deviceType,
    syncStatus,
    isAuthenticating,
    authError,
    signIn,
    signOut,
    triggerSync,
  };
}
