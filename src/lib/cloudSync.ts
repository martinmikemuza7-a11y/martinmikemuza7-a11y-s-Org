import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import {
  getAll,
  putItem,
  deleteItem,
  getById,
} from './db';
import {
  Course,
  Folder,
  DocumentItem,
  DocumentChunk,
  Question,
  RecallSchedule,
  StudySession,
} from '../types';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncedAt: number | null;
  itemsSynced: number;
  errorMessage?: string;
  isOnline: boolean;
  currentUserEmail: string | null;
}

let activeListeners: Unsubscribe[] = [];
let syncState: SyncState = 'idle';
let lastSyncedTime: number | null = null;
let statusListeners: ((status: SyncStatusInfo) => void)[] = [];

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
  statusListeners.forEach((l) => l(status));
}

export function getSyncStatus(): SyncStatusInfo {
  return {
    state: syncState,
    lastSyncedAt: lastSyncedTime,
    itemsSynced: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    currentUserEmail: auth.currentUser?.email || null,
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
 * Starts real-time bidirectional synchronization for an authenticated user.
 * Whenever documents, courses, or notes are uploaded from another device (e.g. PC or Phone),
 * the snapshot listeners fire and write to local IndexedDB, then trigger onDataUpdated.
 */
export function startRealtimeSync(onDataUpdated?: () => void): () => void {
  stopRealtimeSync();

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
  ];

  collectionsToSync.forEach(({ name, storeName }) => {
    const colPath = `users/${uid}/${name}`;
    const colRef = collection(db, 'users', uid, name);

    try {
      const unsub = onSnapshot(
        colRef,
        async (snapshot) => {
          let updatedAny = false;
          for (const change of snapshot.docChanges()) {
            const data = change.doc.data();
            const docId = change.doc.id;

            if (change.type === 'added' || change.type === 'modified') {
              // Store locally in IndexedDB
              await putItem(storeName, data);
              updatedAny = true;
            } else if (change.type === 'removed') {
              await deleteItem(storeName, docId);
              updatedAny = true;
            }
          }

          if (updatedAny && onDataUpdated) {
            onDataUpdated();
          }
          setSyncState('synced');
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, colPath);
          setSyncState('error');
        }
      );

      activeListeners.push(unsub);
    } catch (err) {
      console.warn(`Failed to bind real-time listener for ${colPath}`, err);
    }
  });

  // Perform an initial full bidirectional reconciliation
  reconcileData(onDataUpdated).catch((err) => {
    console.error('Initial reconciliation error:', err);
  });

  return stopRealtimeSync;
}

export function stopRealtimeSync(): void {
  activeListeners.forEach((unsub) => unsub());
  activeListeners = [];
}

/**
 * Reconciles both ways: uploads any local-only items to cloud,
 * and downloads any cloud-only items to local.
 */
export async function reconcileData(onDataUpdated?: () => void): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  setSyncState('syncing');
  const uid = user.uid;

  try {
    // 1. Upload local data to cloud (PC -> Cloud or Phone -> Cloud)
    const [courses, folders, documents, chunks, questions, schedules, sessions] = await Promise.all([
      getAll<Course>('courses'),
      getAll<Folder>('folders'),
      getAll<DocumentItem>('documents'),
      getAll<DocumentChunk>('chunks'),
      getAll<Question>('questions'),
      getAll<RecallSchedule>('schedules'),
      getAll<StudySession>('sessions'),
    ]);

    // Push local items to Firestore in chunked batches
    for (const course of courses) {
      const path = `users/${uid}/courses/${course.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'courses', course.id), { ...course, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    for (const folder of folders) {
      const path = `users/${uid}/folders/${folder.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'folders', folder.id), { ...folder, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    for (const d of documents) {
      const path = `users/${uid}/documents/${d.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'documents', d.id), { ...d, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    for (const chunk of chunks) {
      const path = `users/${uid}/chunks/${chunk.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'chunks', chunk.id), { ...chunk, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    for (const q of questions) {
      const path = `users/${uid}/questions/${q.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'questions', q.id), { ...q, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    for (const s of schedules) {
      const path = `users/${uid}/schedules/${s.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'schedules', s.id), { ...s, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    for (const sess of sessions) {
      const path = `users/${uid}/sessions/${sess.id}`;
      try {
        await setDoc(doc(db, 'users', uid, 'sessions', sess.id), { ...sess, userId: uid }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
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
    ];

    for (const c of collectionsToFetch) {
      const colPath = `users/${uid}/${c.name}`;
      try {
        const snap = await getDocs(collection(db, 'users', uid, c.name));
        for (const docSnap of snap.docs) {
          await putItem(c.store, docSnap.data());
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, colPath);
      }
    }

    setSyncState('synced');
    if (onDataUpdated) {
      onDataUpdated();
    }
  } catch (err) {
    console.error('Reconciliation failed:', err);
    setSyncState('error');
  }
}

// -------------------------------------------------------------
// Direct upload helpers called when users take action in the app
// -------------------------------------------------------------

export async function syncUploadCourse(course: Course): Promise<void> {
  await putItem('courses', course);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/courses/${course.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'courses', course.id), {
        ...course,
        userId: user.uid,
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function syncDeleteCourse(courseId: string): Promise<void> {
  await deleteItem('courses', courseId);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/courses/${courseId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'courses', courseId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
}

export async function syncUploadDocument(docItem: DocumentItem, chunks: DocumentChunk[] = []): Promise<void> {
  // 1. Local IndexedDB
  await putItem('documents', docItem);
  for (const chunk of chunks) {
    await putItem('chunks', chunk);
  }

  // 2. Cloud Firestore (Instant PC <-> Phone propagation)
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/documents/${docItem.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'documents', docItem.id), {
        ...docItem,
        userId: user.uid,
      }, { merge: true });

      // Save chunks
      for (const chunk of chunks) {
        const chunkPath = `users/${user.uid}/chunks/${chunk.id}`;
        await setDoc(doc(db, 'users', user.uid, 'chunks', chunk.id), {
          ...chunk,
          userId: user.uid,
        }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function syncDeleteDocument(documentId: string): Promise<void> {
  await deleteItem('documents', documentId);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/documents/${documentId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'documents', documentId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
}

export async function syncUploadQuestion(question: Question): Promise<void> {
  await putItem('questions', question);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/questions/${question.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'questions', question.id), {
        ...question,
        userId: user.uid,
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function syncDeleteQuestion(questionId: string): Promise<void> {
  await deleteItem('questions', questionId);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/questions/${questionId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'questions', questionId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }
}

export async function syncUploadFolder(folder: Folder): Promise<void> {
  await putItem('folders', folder);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/folders/${folder.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'folders', folder.id), {
        ...folder,
        userId: user.uid,
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function syncUploadSchedule(schedule: RecallSchedule): Promise<void> {
  await putItem('schedules', schedule);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/schedules/${schedule.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'schedules', schedule.id), {
        ...schedule,
        userId: user.uid,
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}

export async function syncUploadSession(session: StudySession): Promise<void> {
  await putItem('sessions', session);
  const user = auth.currentUser;
  if (user) {
    const path = `users/${user.uid}/sessions/${session.id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'sessions', session.id), {
        ...session,
        userId: user.uid,
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}
