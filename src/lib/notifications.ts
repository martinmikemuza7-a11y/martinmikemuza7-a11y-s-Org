import { RecallSchedule } from '../types';
import { getSettings } from './db';

// Audio feedback synthesizer for recall reminders and study completions
class SoundFx {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  static playChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5

      osc2.frequency.setValueAtTime(261.63, now); // C4

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch {
      // Audio playback silently ignored if blocked by autoplay policy
    }
  }

  static playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Ignore
    }
  }
}

export class NotificationManager {
  // Request permission for local notifications across Android, Windows, and Web
  static async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Send immediate local notification
  static async notify(title: string, body: string, onClick?: () => void) {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) return;

    if (settings.reminderSound) {
      SoundFx.playChime();
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          tag: 'studybuddy-reminder',
        });

        if (onClick) {
          notif.onclick = () => {
            window.focus();
            onClick();
            notif.close();
          };
        }
      } catch (err) {
        console.warn('Desktop/native notification error:', err);
      }
    }
  }

  // Check schedules and trigger alert if due
  static checkUpcomingSchedules(schedules: RecallSchedule[], onStartSession: (schedule: RecallSchedule) => void) {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const sched of schedules) {
      if (!sched.enabled) continue;

      const isDue = sched.date <= currentDate && sched.time <= currentTimeStr;
      const hoursSinceLastNotified = sched.lastNotifiedAt
        ? (Date.now() - sched.lastNotifiedAt) / 3600000
        : 999;

      if (isDue && hoursSinceLastNotified > 4) {
        sched.lastNotifiedAt = Date.now();
        this.notify(
          `Time for Active Recall: ${sched.title}`,
          `Your scheduled ${sched.questionCount} question revision is ready now. Tap to start!`,
          () => onStartSession(sched)
        );
      }
    }
  }

  static playSoundSuccess() {
    SoundFx.playSuccess();
  }

  static playSoundChime() {
    SoundFx.playChime();
  }
}
