import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import {
  getAll,
  putItem,
  deleteItem,
  deleteOriginalFile,
  subscribeToDBChanges,
} from './db';
import {
  Course,
  Folder,
  DocumentItem,
  DocumentChunk,
  Question,
  RecallSchedule,
  StudySession,
  Attempt,
} from '../types';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncedAt: number | null;
  itemsSynced: number;
  errorMessage?: string;
  isOnline: boolean;
  currentUserEmail: string | null;
  isAutoSyncActive: boolean;
  deviceType: 'PC' | 'Phone' | 'Tablet';
  lastSyncLabel: string;
}

let activeListeners: Unsubscribe[] = [];
let heartbeatInterval: any = null;
let lifecycleBound = false;
let syncState: SyncState = 'idle';
let lastSyncedTime: number | null = null;
let statusListeners: ((status: SyncStatusInfo) => void)[] = [];
let isApplyingRemoteChanges = false;
let boundDataUpdateCallback: (() => void) | undefined = undefined;

// Determine current device type
export function getDeviceType(): 'PC' | 'Phone' | 'Tablet' {
  if (typeof window === 'undefined') return 'PC';
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android.*mobile|ipod/.test(ua)) return 'Phone';
  if (/ipad|tablet|android(?!.*mobile)/.test(ua)) return 'Tablet';
  return 'PC';
}

export function subscribeToSyncStatus(listener: (status: SyncStatusInfo) => void): () => void {
  statusListeners.push(listener);
  listener(getSyncStatus());
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}

function notifyStatus() {
  const status = getSyncStatus();
  statusListeners.forEach((l) => {
    try {
      l(status);
    } catch (e) {
      console.error('Error notifying sync listener:', e);
    }
  });
}

function computeLastSyncLabel(state: SyncState, lastTime: number | null): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Offline (local changes queued)';
  }
  if (!auth.currentUser) {
    return 'Not paired — Sign in to auto-sync';
  }
  if (state === 'syncing') {
    return 'Auto-syncing in real time...';
  }
  if (!lastTime) {
    return 'Auto-sync active';
  }
  const diffSec = Math.floor((Date.now() - lastTime) / 1000);
  if (diffSec < 10) return 'Auto-synced just now';
  if (diffSec < 60) return `Auto-synced ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Auto-synced ${diffMin}m ago`;
  return `Auto-synced at ${new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function getSyncStatus(): SyncStatusInfo {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    state: syncState,
    lastSyncedAt: lastSyncedTime,
    itemsSynced: 0,
    isOnline,
    currentUserEmail: auth.currentUser?.email || null,
    isAutoSyncActive: !!auth.currentUser && isOnline,
    deviceType: getDeviceType(),
    lastSyncLabel: computeLastSyncLabel(syncState, lastSyncedTime),
  };
}

export function setSyncState(state: SyncState, errorMsg?: string) {
  syncState = state;
  if (state === 'synced') {
    lastSyncedTime = Date.now();
  }
  notifyStatus();
}

/**
 * Hook to automatically upload any local mutations (create/update/delete)
 * immediately to Firestore in the background.
 */
let dbChangesSubscribed = false;
function initDBMutationWatcher() {
  if (dbChangesSubscribed) return;
  dbChangesSubscribed = true;

  subscribeToDBChanges(async (storeName, op, data) => {
    // If this change originated from a remote snapshot, ignore to prevent echo loop
    if (isApplyingRemoteChanges) return;

    const user = auth.currentUser;
    if (!user || !navigator.onLine) return;

    const validCollections = [
      'courses',
      'folders',
      'documents',
      'chunks',
      'questions',
      'schedules',
      'sessions',
      'attempts',
    ];
    if (!validCollections.includes(storeName)) return;

    const id = op === 'put' ? data?.id : data;
    if (!id || typeof id !== 'string') return;

    const uid = user.uid;
    const docPath = `users/${uid}/${storeName}/${id}`;

    try {
      setSyncState('syncing');
      if (op === 'put') {
        let itemToSave = { ...data, userId: uid };
        // Protect from Firestore 1MB doc ceiling if previewUrl is unusually large
        if (storeName === 'documents' && itemToSave.previewUrl && itemToSave.previewUrl.length > 400000) {
          itemToSave = { ...itemToSave, previewUrl: itemToSave.previewUrl.slice(0, 200000) };
        }
        await setDoc(doc(db, 'users', uid, storeName, id), itemToSave, { merge: true });
      } else if (op === 'delete') {
        await deleteDoc(doc(db, 'users', uid, storeName, id));
      }
      setSyncState('synced');
    } catch (err) {
      console.warn(`[Auto-Sync] Background push error for ${docPath}:`, err);
      // Non-fatal; reconciliation will resolve on next sync cycle
      setSyncState('error', err instanceof Error ? err.message : String(err));
    }
  });
}

/**
 * Starts continuous real-time bidirectional automatic synchronization.
 * Listeners on all 8 collections immediately reflect PC changes on Phone,
 * and Phone changes on PC within ~200ms.
 */
export function startRealtimeSync(onDataUpdated?: () => void): () => void {
  stopRealtimeSync();
  initDBMutationWatcher();
  boundDataUpdateCallback = onDataUpdated;

  const user = auth.currentUser;
  if (!user) {
    setSyncState('idle');
    return () => {};
  }

  setSyncState('syncing');
  const uid = user.uid;

  const collectionsToSync: Array<{
    name: string;
    storeName: string;
  }> = [
    { name: 'courses', storeName: 'courses' },
    { name: 'folders', storeName: 'folders' },
    { name: 'documents', storeName: 'documents' },
    { name: 'chunks', storeName: 'chunks' },
    { name: 'questions', storeName: 'questions' },
    { name: 'schedules', storeName: 'schedules' },
    { name: 'sessions', storeName: 'sessions' },
    { name: 'attempts', storeName: 'attempts' },
  ];

  collectionsToSync.forEach(({ name, storeName }) => {
    const colPath = `users/${uid}/${name}`;
    const colRef = collection(db, 'users', uid, name);

    try {
      const unsub = onSnapshot(
        colRef,
        async (snapshot) => {
          let updatedAny = false;
          // Set flag to prevent local change watcher from re-uploading incoming snapshot data
          isApplyingRemoteChanges = true;
          try {
            for (const change of snapshot.docChanges()) {
              const data = change.doc.data();
              const docId = change.doc.id;

              if (change.type === 'added' || change.type === 'modified') {
                await putItem(storeName, data);
                updatedAny = true;
              } else if (change.type === 'removed') {
                await deleteItem(storeName, docId);
                updatedAny = true;
              }
            }
          } catch (err) {
            console.error(`[Auto-Sync] Error applying remote change for ${colPath}:`, err);
          } finally {
            isApplyingRemoteChanges = false;
          }

          if (updatedAny && boundDataUpdateCallback) {
            boundDataUpdateCallback();
          }
          setSyncState('synced');
        },
        (error) => {
          console.warn(`[Auto-Sync] Snapshot error for ${colPath}:`, error);
          setSyncState('error');
        }
      );

      activeListeners.push(unsub);
    } catch (err) {
      console.warn(`[Auto-Sync] Failed to bind real-time listener for ${colPath}:`, err);
    }
  });

  // Attach lifecycle triggers once (window focus, visibility, network reconnect)
  bindLifecycleSync();

  // Perform immediate silent reconciliation on startup/sign-in
  reconcileData(onDataUpdated).catch((err) => {
    console.warn('[Auto-Sync] Initial reconciliation finished with warning:', err);
  });

  // Start periodic background heartbeat check every 20 seconds
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (auth.currentUser && navigator.onLine) {
      reconcileData(boundDataUpdateCallback).catch(() => {});
    }
  }, 20000);

  return stopRealtimeSync;
}

/**
 * Binds browser window and network lifecycle events for hands-free auto-sync.
 */
function bindLifecycleSync() {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;

  const triggerAutoSync = () => {
    if (auth.currentUser && navigator.onLine) {
      reconcileData(boundDataUpdateCallback).catch(() => {});
    }
  };

  // When switching between phone and PC, or tab focus returns
  window.addEventListener('focus', triggerAutoSync);

  // When phone is unlocked or browser tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerAutoSync();
    }
  });

  // When internet connection is restored
  window.addEventListener('online', () => {
    notifyStatus();
    triggerAutoSync();
  });

  window.addEventListener('offline', () => {
    notifyStatus();
  });
}

export function stopRealtimeSync(): void {
  activeListeners.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  activeListeners = [];

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Reconciles local IndexedDB with Firestore in both directions:
 * 1. Uploads any local-only records to Firestore.
 * 2. Downloads any remote-only records from Firestore to IndexedDB.
 */
export async function reconcileData(onDataUpdated?: () => void): Promise<void> {
  const user = auth.currentUser;
  if (!user || !navigator.onLine) {
    setSyncState(navigator.onLine ? 'idle' : 'offline');
    return;
  }

  setSyncState('syncing');
  const uid = user.uid;

  try {
    // 1. Fetch all local datasets
    const [courses, folders, documents, chunks, questions, schedules, sessions, attempts] = await Promise.all([
      getAll<Course>('courses'),
      getAll<Folder>('folders'),
      getAll<DocumentItem>('documents'),
      getAll<DocumentChunk>('chunks'),
      getAll<Question>('questions'),
      getAll<RecallSchedule>('schedules'),
      getAll<StudySession>('sessions'),
      getAll<Attempt>('attempts'),
    ]);

    // Push local items to Firestore
    for (const course of courses) {
      await setDoc(doc(db, 'users', uid, 'courses', course.id), { ...course, userId: uid }, { merge: true });
    }
    for (const folder of folders) {
      await setDoc(doc(db, 'users', uid, 'folders', folder.id), { ...folder, userId: uid }, { merge: true });
    }
    for (const d of documents) {
      await setDoc(doc(db, 'users', uid, 'documents', d.id), { ...d, userId: uid }, { merge: true });
    }
    for (const chunk of chunks) {
      await setDoc(doc(db, 'users', uid, 'chunks', chunk.id), { ...chunk, userId: uid }, { merge: true });
    }
    for (const q of questions) {
      await setDoc(doc(db, 'users', uid, 'questions', q.id), { ...q, userId: uid }, { merge: true });
    }
    for (const s of schedules) {
      await setDoc(doc(db, 'users', uid, 'schedules', s.id), { ...s, userId: uid }, { merge: true });
    }
    for (const sess of sessions) {
      await setDoc(doc(db, 'users', uid, 'sessions', sess.id), { ...sess, userId: uid }, { merge: true });
    }
    for (const att of attempts) {
      await setDoc(doc(db, 'users', uid, 'attempts', att.id), { ...att, userId: uid }, { merge: true });
    }

    // 2. Fetch remote documents from Cloud into local IndexedDB
    const collectionsToFetch = [
      { name: 'courses', store: 'courses' },
      { name: 'folders', store: 'folders' },
      { name: 'documents', store: 'documents' },
      { name: 'chunks', store: 'chunks' },
      { name: 'questions', store: 'questions' },
      { name: 'schedules', store: 'schedules' },
      { name: 'sessions', store: 'sessions' },
      { name: 'attempts', store: 'attempts' },
    ];

    isApplyingRemoteChanges = true;
    try {
      for (const c of collectionsToFetch) {
        const snap = await getDocs(collection(db, 'users', uid, c.name));
        for (const docSnap of snap.docs) {
          await putItem(c.store, docSnap.data());
        }
      }
    } finally {
      isApplyingRemoteChanges = false;
    }

    setSyncState('synced');
    if (onDataUpdated) {
      onDataUpdated();
    }
  } catch (err) {
    console.error('[Auto-Sync] Reconciliation failed:', err);
    setSyncState('error', err instanceof Error ? err.message : String(err));
  }
}

// -------------------------------------------------------------
// Explicit helper functions (maintained for backward compatibility)
// -------------------------------------------------------------

export async function syncUploadCourse(course: Course): Promise<void> {
  await putItem('courses', course);
}

export async function syncDeleteCourse(courseId: string): Promise<void> {
  await deleteItem('courses', courseId);
}

export async function syncUploadDocument(docItem: DocumentItem, chunks: DocumentChunk[] = []): Promise<void> {
  await putItem('documents', docItem);
  for (const chunk of chunks) {
    await putItem('chunks', chunk);
  }
}

export async function syncDeleteDocument(documentId: string): Promise<void> {
  await deleteItem('documents', documentId);
  try {
    await deleteOriginalFile(documentId);
  } catch (err) {
    console.warn('Failed to clean up original file on document delete:', err);
  }
}

export async function syncUploadQuestion(question: Question): Promise<void> {
  await putItem('questions', question);
}

export async function syncDeleteQuestion(questionId: string): Promise<void> {
  await deleteItem('questions', questionId);
}

export async function syncUploadFolder(folder: Folder): Promise<void> {
  await putItem('folders', folder);
}

export async function syncUploadSchedule(schedule: RecallSchedule): Promise<void> {
  await putItem('schedules', schedule);
}

export async function syncUploadSession(session: StudySession): Promise<void> {
  await putItem('sessions', session);
}
