import {
  Course,
  Folder,
  Subject,
  DocumentItem,
  DocumentChunk,
  Question,
  Attempt,
  RecallSchedule,
  StudySession,
  AppSettings,
  SyncQueueItem,
  TutorMessage,
} from '../types';

const DB_NAME = 'StudyBuddyAI_DB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('subjects')) {
        const store = db.createObjectStore('subjects', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains('folders')) {
        const store = db.createObjectStore('folders', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
        store.createIndex('folderId', 'folderId', { unique: false });
      }
      if (!db.objectStoreNames.contains('chunks')) {
        const store = db.createObjectStore('chunks', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
        store.createIndex('documentId', 'documentId', { unique: false });
      }
      if (!db.objectStoreNames.contains('questions')) {
        const store = db.createObjectStore('questions', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains('attempts')) {
        const store = db.createObjectStore('attempts', { keyPath: 'id' });
        store.createIndex('questionId', 'questionId', { unique: false });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains('schedules')) {
        const store = db.createObjectStore('schedules', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('tutorMessages')) {
        const store = db.createObjectStore('tutorMessages', { keyPath: 'id' });
        store.createIndex('courseId', 'courseId', { unique: false });
      }
    };

    request.onsuccess = async () => {
      dbInstance = request.result;
      await cleanOldDemoData(dbInstance);
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Generic transaction helpers
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getById<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSettings(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    aiMode: 'auto',
    researchMode: false,
    defaultSessionDuration: 30,
    defaultQuestionCount: 10,
    defaultDifficulty: 'Mixed',
    notificationsEnabled: true,
    reminderSound: true,
    autoSync: true,
    wifiOnly: false,
    syncDocuments: false,
    theme: 'system',
    colorTheme: 'violet',
    reducedMotion: false,
    userName: 'Alex Chen',
    userEmail: 'alex.chen@studybuddy.ai',
  };
  try {
    const db = await openDB();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('app_settings');
    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...defaultSettings, ...req.result.value });
        } else {
          resolve(defaultSettings);
        }
      };
      req.onerror = () => resolve(defaultSettings);
    });
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  const db = await openDB();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  await new Promise<void>((resolve, reject) => {
    const req = store.put({ key: 'app_settings', value: updated });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return updated;
}

// Clean out any legacy demo biology/mitochondria data
async function cleanOldDemoData(db: IDBDatabase): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(
        ['courses', 'folders', 'documents', 'chunks', 'questions', 'schedules'],
        'readwrite'
      );

      const coursesStore = tx.objectStore('courses');
      const foldersStore = tx.objectStore('folders');
      const docsStore = tx.objectStore('documents');
      const chunksStore = tx.objectStore('chunks');
      const questionsStore = tx.objectStore('questions');
      const schedulesStore = tx.objectStore('schedules');

      // Purge specific hardcoded IDs
      coursesStore.delete('course-bio-101');
      foldersStore.delete('folder-organelles');
      docsStore.delete('doc-cell-bio-ch3');
      chunksStore.delete('chunk-bio-1');
      chunksStore.delete('chunk-bio-2');
      questionsStore.delete('q-bio-1');
      questionsStore.delete('q-bio-2');
      questionsStore.delete('q-bio-3');
      schedulesStore.delete('sched-1');

      // Scan courses for any item mentioning biology or mitochondria
      const reqCourses = coursesStore.getAll();
      reqCourses.onsuccess = () => {
        const courses = reqCourses.result || [];
        for (const c of courses) {
          const lower = (c.name || '').toLowerCase();
          if (
            lower.includes('biology') ||
            lower.includes('mitochondria') ||
            c.id === 'course-bio-101'
          ) {
            coursesStore.delete(c.id);
          }
        }
      };

      // Scan documents for any item mentioning mitochondria or biology
      const reqDocs = docsStore.getAll();
      reqDocs.onsuccess = () => {
        const docs = reqDocs.result || [];
        for (const d of docs) {
          const lower = (d.filename || '').toLowerCase();
          if (
            lower.includes('mitochondria') ||
            lower.includes('bioenergetics') ||
            d.courseId === 'course-bio-101' ||
            d.id === 'doc-cell-bio-ch3'
          ) {
            docsStore.delete(d.id);
          }
        }
      };

      // Scan chunks
      const reqChunks = chunksStore.getAll();
      reqChunks.onsuccess = () => {
        const chunksList = reqChunks.result || [];
        for (const ch of chunksList) {
          if (ch.courseId === 'course-bio-101' || ch.documentId === 'doc-cell-bio-ch3') {
            chunksStore.delete(ch.id);
          }
        }
      };

      // Scan questions
      const reqQuestions = questionsStore.getAll();
      reqQuestions.onsuccess = () => {
        const questionsList = reqQuestions.result || [];
        for (const q of questionsList) {
          const lower = (q.question || '').toLowerCase() + ' ' + (q.sourceCitation || '').toLowerCase();
          if (
            q.courseId === 'course-bio-101' ||
            lower.includes('mitochondria') ||
            lower.includes('chemiosmosis') ||
            lower.includes('atp synthase')
          ) {
            questionsStore.delete(q.id);
          }
        }
      };

      // Scan schedules
      const reqSchedules = schedulesStore.getAll();
      reqSchedules.onsuccess = () => {
        const scheds = reqSchedules.result || [];
        for (const s of scheds) {
          const lower = (s.title || '').toLowerCase();
          if (
            s.courseId === 'course-bio-101' ||
            lower.includes('mitochondria') ||
            lower.includes('chemiosmosis')
          ) {
            schedulesStore.delete(s.id);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function exportEntireDatabaseJSON(): Promise<string> {
  const [courses, folders, documents, chunks, questions, attempts, schedules, sessions, settings] = await Promise.all([
    getAll<Course>('courses'),
    getAll<Folder>('folders'),
    getAll<DocumentItem>('documents'),
    getAll<DocumentChunk>('chunks'),
    getAll<Question>('questions'),
    getAll<Attempt>('attempts'),
    getAll<RecallSchedule>('schedules'),
    getAll<StudySession>('sessions'),
    getSettings(),
  ]);

  const backupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      courses,
      folders,
      documents,
      chunks,
      questions,
      attempts,
      schedules,
      sessions,
      settings,
    },
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importDatabaseFromJSON(jsonString: string): Promise<void> {
  const parsed = JSON.parse(jsonString);
  const data = parsed.data || parsed;
  const db = await openDB();

  const stores: (keyof typeof data)[] = ['courses', 'folders', 'documents', 'chunks', 'questions', 'attempts', 'schedules', 'sessions'];

  for (const storeName of stores) {
    if (Array.isArray(data[storeName])) {
      const tx = db.transaction(storeName as string, 'readwrite');
      const store = tx.objectStore(storeName as string);
      for (const item of data[storeName]) {
        store.put(item);
      }
    }
  }

  if (data.settings) {
    await saveSettings(data.settings);
  }
}

export async function clearAllUserData(): Promise<void> {
  const db = await openDB();
  const stores = ['courses', 'folders', 'documents', 'chunks', 'questions', 'attempts', 'schedules', 'sessions', 'tutorMessages'];
  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
  }
}
