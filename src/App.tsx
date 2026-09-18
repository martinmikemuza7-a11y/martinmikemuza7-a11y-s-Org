import React, { useState, useEffect, useCallback } from 'react';
import {
  Course,
  Folder,
  DocumentItem,
  DocumentChunk,
  Question,
  Attempt,
  RecallSchedule,
  StudySession,
  AppSettings,
  AIStatus,
  ThemeMode,
  ColorThemeId,
} from './types';
import { getAll, getSettings, saveSettings, openDB } from './lib/db';
import { determineAIStatus } from './lib/ai-engine';
import { NotificationManager } from './lib/notifications';
import {
  useThemeEffect,
  getSavedTheme,
  applyTheme,
  getSavedColorTheme,
  applyColorTheme,
} from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { Navigation, NavTab } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { CoursesView } from './components/CoursesView';
import { StudySessionView } from './components/StudySessionView';
import { RecallScheduleView } from './components/RecallScheduleView';
import { AITutorView } from './components/AITutorView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { DownloadsView } from './components/DownloadsView';
import { QuestionGenModal } from './components/QuestionGenModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { useCloudSync } from './hooks/useCloudSync';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [courses, setCourses] = useState<Course[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [schedules, setSchedules] = useState<RecallSchedule[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [aiStatus, setAIStatus] = useState<AIStatus>('offline_ai');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & context states
  const [questionGenCourseId, setQuestionGenCourseId] = useState<string | null>(null);
  const [studyContext, setStudyContext] = useState<{ courseId?: string; duration?: number } | null>(null);
  const [selectedCourseForView, setSelectedCourseForView] = useState<string | undefined>(undefined);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);

  // Refresh all local data from IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      await openDB();
      const [
        loadedCourses,
        loadedFolders,
        loadedDocs,
        loadedChunks,
        loadedQuestions,
        loadedAttempts,
        loadedSchedules,
        loadedSessions,
        loadedSettings,
      ] = await Promise.all([
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

      setCourses(loadedCourses);
      setFolders(loadedFolders);
      setDocuments(loadedDocs);
      setChunks(loadedChunks);
      setQuestions(loadedQuestions);
      setAttempts(loadedAttempts);
      setSchedules(loadedSchedules);
      setSessions(loadedSessions.sort((a, b) => b.createdAt - a.createdAt));
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Failed to load database items:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cross-device Cloud Sync Hook (PC ↔ Phone)
  const {
    user,
    syncStatus,
    isAuthenticating,
    deviceType,
    authError,
    signIn,
    signOut,
    triggerSync,
  } = useCloudSync(refreshAllData);

  // Apply theme & color palette effect based on active settings or saved local storage preference
  const activeTheme = settings?.theme || getSavedTheme();
  const activeColorTheme = settings?.colorTheme || getSavedColorTheme();
  useThemeEffect(activeTheme, activeColorTheme);

  // Update AI engine connectivity status
  const checkStatus = useCallback(async () => {
    const status = await determineAIStatus();
    setAIStatus(status);
  }, []);

  // Initial load & listeners
  useEffect(() => {
    refreshAllData();
    checkStatus();

    const handleOnline = () => checkStatus();
    const handleOffline = () => setAIStatus('offline_ai');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Schedule periodic recall check (every 30 seconds)
    const recallInterval = setInterval(() => {
      if (schedules.length > 0) {
        NotificationManager.checkUpcomingSchedules(schedules, (dueSched) => {
          setStudyContext({ courseId: dueSched.courseId, duration: 15 });
          setActiveTab('study');
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(recallInterval);
    };
  }, [refreshAllData, checkStatus, schedules]);

  // Cloud Sync handler (triggers real-time Firestore sync & reconciliation)
  const handleTriggerSync = async () => {
    if (!navigator.onLine) {
      alert('Cannot sync while offline. Changes are saved locally and will sync when reconnected.');
      return;
    }

    if (user) {
      setIsSyncing(true);
      try {
        await triggerSync();
        await refreshAllData();
        setLastSyncedAt(Date.now());
      } catch (err) {
        console.warn('Sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setShowCloudSyncModal(true);
    }
  };

  // Quick Study trigger from any view
  const handleStartStudy = (courseId: string, durationMinutes = 30) => {
    setStudyContext({ courseId, duration: durationMinutes });
    setActiveTab('study');
  };

  const handleUpdateTheme = async (theme: ThemeMode) => {
    applyTheme(theme);
    try {
      localStorage.setItem('studybuddy_theme', theme);
    } catch {}
    if (settings) {
      const updated = { ...settings, theme };
      setSettings(updated);
      try {
        await saveSettings(updated);
      } catch (err) {
        console.warn('Failed to persist theme setting:', err);
      }
    }
  };

  const handleUpdateColorTheme = async (colorTheme: ColorThemeId) => {
    applyColorTheme(colorTheme);
    try {
      localStorage.setItem('studybuddy_color_theme', colorTheme);
    } catch {}
    if (settings) {
      const updated = { ...settings, colorTheme };
      setSettings(updated);
      try {
        await saveSettings(updated);
      } catch (err) {
        console.warn('Failed to persist color theme setting:', err);
      }
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Initializing StudyBuddy AI Engine...
          </span>
        </div>
      </div>
    );
  }

  const pendingRecallCount = schedules.filter((s) => s.enabled).length;
  const currentGenCourse = courses.find((c) => c.id === questionGenCourseId) || courses[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* Desktop Sidebar & Mobile Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'study') setStudyContext(null);
        }}
        pendingRecallCount={pendingRecallCount}
        aiStatus={aiStatus}
        settings={settings}
        onUpdateTheme={handleUpdateTheme}
        onUpdateColorTheme={handleUpdateColorTheme}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        user={user}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
      />

      {/* Main App Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar
          aiStatus={aiStatus}
          onRefreshStatus={checkStatus}
          onTriggerSync={handleTriggerSync}
          isSyncing={isSyncing}
          lastSyncedAt={lastSyncedAt}
          settings={settings}
          onOpenSettings={() => setActiveTab('settings')}
          onUpdateTheme={handleUpdateTheme}
          onUpdateColorTheme={handleUpdateColorTheme}
          activeTabTitle={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          user={user}
          deviceType={deviceType}
          onOpenCloudSync={() => setShowCloudSyncModal(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'home' && (
              <HomeView
                courses={courses}
                documents={documents}
                questions={questions}
                schedules={schedules}
                recentSessions={sessions}
                aiStatus={aiStatus}
                colorTheme={activeColorTheme}
                onUpdateColorTheme={handleUpdateColorTheme}
                onNavigate={(tab, params) => {
                  if (params?.courseId) setSelectedCourseForView(params.courseId);
                  setActiveTab(tab);
                }}
                onStartStudy={handleStartStudy}
                user={user}
                deviceType={deviceType}
                onOpenCloudSync={() => setShowCloudSyncModal(true)}
              />
            )}

            {activeTab === 'courses' && (
              <CoursesView
                courses={courses}
                folders={folders}
                documents={documents}
                chunks={chunks}
                questions={questions}
                selectedCourseId={selectedCourseForView}
                onRefreshData={refreshAllData}
                onStartStudy={handleStartStudy}
                onOpenQuestionGen={(courseId) => setQuestionGenCourseId(courseId)}
                onOpenTutor={(courseId) => {
                  setSelectedCourseForView(courseId);
                  setActiveTab('tutor');
                }}
              />
            )}

            {activeTab === 'study' && (
              <StudySessionView
                courses={courses}
                questions={questions}
                chunks={chunks}
                initialCourseId={studyContext?.courseId}
                initialDuration={studyContext?.duration || settings.defaultStudyMinutes || 30}
                onRefreshData={refreshAllData}
                onScheduleRecall={(courseId, title) => {
                  setActiveTab('recall');
                }}
                onDone={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'recall' && (
              <RecallScheduleView
                courses={courses}
                schedules={schedules}
                questions={questions}
                attempts={attempts}
                onRefreshData={refreshAllData}
                onStartRecall={handleStartStudy}
              />
            )}

            {activeTab === 'tutor' && (
              <AITutorView
                courses={courses}
                initialCourseId={selectedCourseForView}
                settings={settings}
                aiStatus={aiStatus}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressView
                courses={courses}
                sessions={sessions}
                attempts={attempts}
                questions={questions}
                onStartStudy={handleStartStudy}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                aiStatus={aiStatus}
                onUpdateSettings={setSettings}
                onUpdateTheme={handleUpdateTheme}
                onUpdateColorTheme={handleUpdateColorTheme}
                onTriggerSync={handleTriggerSync}
                isSyncing={isSyncing}
                lastSyncedAt={lastSyncedAt}
                onOpenDownloads={() => setActiveTab('downloads')}
                onDataReset={refreshAllData}
                user={user}
                onOpenCloudSync={() => setShowCloudSyncModal(true)}
              />
            )}

            {activeTab === 'downloads' && <DownloadsView />}
          </div>
        </main>
      </div>

      {/* Question Generator Modal */}
      {questionGenCourseId && currentGenCourse && (
        <QuestionGenModal
          course={currentGenCourse}
          documents={documents}
          chunks={chunks}
          isOpen={true}
          onClose={() => setQuestionGenCourseId(null)}
          onQuestionsSaved={refreshAllData}
        />
      )}

      {/* Cross-Device Cloud Sync Modal (PC & Phone) */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        user={user}
        syncStatus={syncStatus}
        deviceType={deviceType}
        isAuthenticating={isAuthenticating}
        authError={authError}
        onSignIn={signIn}
        onSignOut={signOut}
        onTriggerSync={async () => {
          await triggerSync();
          await refreshAllData();
        }}
      />
    </div>
  );
}
