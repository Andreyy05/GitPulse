import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { CommitFuel } from './components/CommitFuel';
import { SettingsModal } from './components/SettingsModal';
import { fetchGitHubActivity } from './services/github';
import { sendDesktopNotification, sendDiscordWebhook } from './services/notifications';

export function App() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('gitpulse_username') || 'Andreyy05';
  });

  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('gitpulse_interval');
    return saved ? Number(saved) : 15;
  });

  const [eveningAlert, setEveningAlert] = useState(() => {
    return localStorage.getItem('gitpulse_evening_alert') !== 'false';
  });

  const [alertTime, setAlertTime] = useState(() => {
    return localStorage.getItem('gitpulse_alert_time') || '18:00';
  });

  const [discordWebhook, setDiscordWebhook] = useState(() => {
    return localStorage.getItem('gitpulse_discord_webhook') || '';
  });

  const [launchAtStartup, setLaunchAtStartup] = useState(() => {
    return localStorage.getItem('gitpulse_launch_at_startup') === 'true';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gitpulse_theme') || 'dark';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track if we celebrated today's streak already
  const hasCelebratedRef = useRef(false);

  const loadActivity = useCallback(
    async (isManual = false) => {
      if (!username || !username.trim()) {
        setError('Please configure your GitHub username in Settings.');
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchGitHubActivity(username);
        setData(result);

        // Update Electron tray status
        const status = result.hasPushedToday ? 'green' : 'red';
        if (window.electronAPI?.updateTrayStatus) {
          window.electronAPI.updateTrayStatus({
            status,
            commitsToday: result.totalCommitsToday,
            text: result.hasPushedToday ? 'Streak Safe' : 'Pending Push',
          });
        }

        // Celebrate with confetti if streak is achieved today
        if (result.hasPushedToday && !hasCelebratedRef.current) {
          hasCelebratedRef.current = true;
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.4 },
            colors: ['#10b981', '#34d399', '#6366f1'],
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch activity');
        if (window.electronAPI?.updateTrayStatus) {
          window.electronAPI.updateTrayStatus({
            status: 'default',
            commitsToday: 0,
            text: 'Error checking GitHub',
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [username]
  );

  // Fetch on mount and when username changes
  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Periodic polling
  useEffect(() => {
    const intervalMs = refreshInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      loadActivity();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [loadActivity, refreshInterval]);

  // Listen for refresh request from tray menu
  useEffect(() => {
    if (window.electronAPI?.onRefreshRequested) {
      const unsubscribe = window.electronAPI.onRefreshRequested(() => {
        loadActivity(true);
      });
      return unsubscribe;
    }
  }, [loadActivity]);

  // Daily Streak Alert check based on configurable alertTime
  useEffect(() => {
    if (!eveningAlert) return;

    const checkDailyAlert = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const lastAlertKey = `gitpulse_last_alert_${todayStr}`;
      const alreadyAlerted = localStorage.getItem(lastAlertKey);

      if (alreadyAlerted) return;

      // Parse target time
      const [targetH, targetM] = (alertTime || '18:00').split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = (targetH || 18) * 60 + (targetM || 0);

      if (currentMinutes >= targetMinutes && data && !data.hasPushedToday) {
        localStorage.setItem(lastAlertKey, 'true');

        // 1. Desktop Notification
        await sendDesktopNotification(
          '⚠️ GitPulse Streak Alert',
          `It is past ${alertTime} and you haven't pushed any commits today! Keep your GitHub streak alive before midnight.`
        );

        // 2. Discord Webhook notification if enabled
        if (discordWebhook && discordWebhook.trim()) {
          try {
            await sendDiscordWebhook(discordWebhook, {
              username,
              commitsToday: 0,
              customMessage: `⚠️ **GitPulse Streak Alert**: It is past ${alertTime} and @${username} has not pushed any commits today! Keep your GitHub streak alive before midnight! ⏳`,
            });
          } catch (err) {
            console.error('Discord webhook alert failed:', err);
          }
        }
      }
    };

    // Check every 1 minute
    const alertTimer = setInterval(checkDailyAlert, 60 * 1000);
    checkDailyAlert();

    return () => clearInterval(alertTimer);
  }, [data, eveningAlert, alertTime, username, discordWebhook]);

  // Initial sync for Launch at Startup with Electron
  useEffect(() => {
    if (window.electronAPI?.getLoginItemSettings) {
      window.electronAPI.getLoginItemSettings()
        .then((openAtLogin) => {
          if (typeof openAtLogin === 'boolean') {
            setLaunchAtStartup(openAtLogin);
            localStorage.setItem('gitpulse_launch_at_startup', String(openAtLogin));
          }
        })
        .catch((err) => console.warn('Failed to query login items:', err));
    }
  }, []);

  // Theme synchronization (dark / light / system)
  useEffect(() => {
    const updateTheme = () => {
      let isDark = true;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      if (window.electronAPI?.setWindowTheme) {
        window.electronAPI.setWindowTheme(isDark);
      }
    };

    updateTheme();

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  const handleSaveSettings = ({
    username: newUsername,
    refreshInterval: newInterval,
    eveningAlert: newEveningAlert,
    alertTime: newAlertTime,
    discordWebhook: newDiscordWebhook,
    launchAtStartup: newLaunchAtStartup,
    theme: newTheme,
  }) => {
    setUsername(newUsername);
    setRefreshInterval(newInterval);
    setEveningAlert(newEveningAlert);
    setAlertTime(newAlertTime);
    setDiscordWebhook(newDiscordWebhook);

    localStorage.setItem('gitpulse_username', newUsername);
    localStorage.setItem('gitpulse_interval', String(newInterval));
    localStorage.setItem('gitpulse_evening_alert', String(newEveningAlert));
    localStorage.setItem('gitpulse_alert_time', newAlertTime);
    localStorage.setItem('gitpulse_discord_webhook', newDiscordWebhook);

    if (newTheme) {
      setTheme(newTheme);
      localStorage.setItem('gitpulse_theme', newTheme);
    }

    if (typeof newLaunchAtStartup === 'boolean') {
      setLaunchAtStartup(newLaunchAtStartup);
      localStorage.setItem('gitpulse_launch_at_startup', String(newLaunchAtStartup));
      if (window.electronAPI?.setLoginItemSettings) {
        window.electronAPI.setLoginItemSettings(newLaunchAtStartup).catch(console.warn);
      }
    }

    hasCelebratedRef.current = false;
  };

  const currentStatus = data?.hasPushedToday ? 'green' : data ? 'red' : 'default';

  return (
    <div className="w-full h-screen bg-[#f5f5f7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans select-none overflow-hidden transition-colors duration-200">
      {/* Draggable Frameless Header */}
      <Header
        status={currentStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area - Scrollable & Dynamically Adaptive */}
      <main className="flex-1 w-full p-4 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center">
        <div className="w-full max-w-xl space-y-3.5">
          <StatusCard
            data={data}
            loading={loading}
            error={error}
            onRefresh={() => loadActivity(true)}
          />

          <CommitFuel />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUsername={username}
        currentInterval={refreshInterval}
        currentEveningAlert={eveningAlert}
        currentAlertTime={alertTime}
        currentDiscordWebhook={discordWebhook}
        currentLaunchAtStartup={launchAtStartup}
        currentTheme={theme}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
