import React, { useState, useEffect } from 'react';
import { X, Check, User, Bell, Clock, ShieldCheck, Send, MessageSquare, ExternalLink, Rocket, Moon, Sun, Monitor, SunMedium } from 'lucide-react';
import { sendDesktopNotification, sendDiscordWebhook } from '../services/notifications';

export function SettingsModal({
  isOpen,
  onClose,
  currentUsername,
  currentInterval,
  currentEveningAlert,
  currentAlertTime,
  currentDiscordWebhook,
  currentLaunchAtStartup,
  currentTheme,
  onSave,
}) {
  const [username, setUsername] = useState(currentUsername);
  const [interval, setInterval] = useState(currentInterval);
  const [eveningAlert, setEveningAlert] = useState(currentEveningAlert);
  const [alertTime, setAlertTime] = useState(currentAlertTime || '18:00');
  const [discordWebhook, setDiscordWebhook] = useState(currentDiscordWebhook || '');
  const [theme, setTheme] = useState(currentTheme || 'dark');
  const [launchAtStartup, setLaunchAtStartup] = useState(() => {
    if (typeof currentLaunchAtStartup === 'boolean') return currentLaunchAtStartup;
    return localStorage.getItem('gitpulse_launch_at_startup') === 'true';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setTheme(currentTheme || 'dark');
    }
  }, [isOpen, currentTheme]);

  // Sync startup state from Electron when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    if (window.electronAPI?.getLoginItemSettings) {
      window.electronAPI.getLoginItemSettings()
        .then((openAtLogin) => {
          if (isMounted && typeof openAtLogin === 'boolean') {
            setLaunchAtStartup(openAtLogin);
          }
        })
        .catch((err) => console.warn('Could not read login item settings:', err));
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Apply startup setting to Electron and localStorage
    if (window.electronAPI?.setLoginItemSettings) {
      window.electronAPI.setLoginItemSettings(launchAtStartup).catch(console.warn);
    }
    localStorage.setItem('gitpulse_launch_at_startup', String(launchAtStartup));

    onSave({
      username: username.trim(),
      refreshInterval: Number(interval),
      eveningAlert,
      alertTime,
      discordWebhook: discordWebhook.trim(),
      launchAtStartup,
      theme,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  const handleTestNotification = async () => {
    setTestStatus('testing');
    try {
      await sendDesktopNotification(
        '🔔 GitPulse Notification Test',
        `Test alert at ${alertTime}! Streak monitoring is active for @${username.trim() || 'user'}.`
      );

      if (discordWebhook && discordWebhook.trim()) {
        await sendDiscordWebhook(discordWebhook, {
          username: username.trim() || 'user',
          commitsToday: 0,
          customMessage: `🔔 **GitPulse Test Alert**: Daily notification scheduled for **${alertTime}**. Desktop and Discord connections are active!`,
        });
      }

      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 2500);
    } catch (err) {
      console.error(err);
      setTestStatus('error: ' + (err.message || 'Failed'));
      setTimeout(() => setTestStatus(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3">
      <div className="w-full max-w-[370px] max-h-[90vh] bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl p-4 flex flex-col space-y-3.5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center space-x-2">
            <User size={15} className="text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Settings Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1 custom-scrollbar">
          {/* GitHub Username Input */}
          <div className="flex flex-col space-y-1">
            <label className="text-zinc-300 font-medium tracking-tight">GitHub Username</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Andreyy05"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-7 pr-3 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
                required
              />
            </div>
            <span className="text-[10px] text-zinc-500">
              Monitors public activity events from GitHub API.
            </span>
          </div>

          {/* Auto Refresh Interval */}
          <div className="flex flex-col space-y-1">
            <label className="text-zinc-300 font-medium tracking-tight flex items-center space-x-1">
              <Clock size={12} className="text-zinc-400" />
              <span>Background Refresh Rate</span>
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 transition-all cursor-pointer"
            >
              <option value={5} className="bg-zinc-900 text-zinc-200">Every 5 minutes</option>
              <option value={15} className="bg-zinc-900 text-zinc-200">Every 15 minutes (recommended)</option>
              <option value={30} className="bg-zinc-900 text-zinc-200">Every 30 minutes</option>
              <option value={60} className="bg-zinc-900 text-zinc-200">Every 60 minutes</option>
            </select>
          </div>

          {/* Launch at Startup Switch */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex flex-col pr-2">
              <span className="text-zinc-200 font-medium tracking-tight flex items-center space-x-1.5">
                <Rocket size={12} className="text-zinc-400" />
                <span>Launch at Startup</span>
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                Automatically start GitPulse when logging into Windows.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={launchAtStartup}
              onClick={() => {
                const nextState = !launchAtStartup;
                setLaunchAtStartup(nextState);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                launchAtStartup ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  launchAtStartup ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Daily Streak Reminder & Custom Alert Time */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={eveningAlert}
                onChange={(e) => setEveningAlert(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-white/[0.04] text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-zinc-200 font-medium tracking-tight flex items-center space-x-1">
                  <Bell size={11} className="text-zinc-400" />
                  <span>Daily Streak Reminder</span>
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">
                  Sends alert if you haven't pushed commits before the scheduled time.
                </span>
              </div>
            </label>

            {eveningAlert && (
              <div className="pl-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Reminder Time:</span>
                  <input
                    type="time"
                    value={alertTime}
                    onChange={(e) => setAlertTime(e.target.value)}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1 text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div className="flex items-center space-x-1.5">
                  {['17:00', '18:00', '20:00', '21:30'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAlertTime(preset)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                        alertTime === preset
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional Discord Webhook Alert */}
          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
            <label className="text-zinc-300 font-medium tracking-tight flex items-center space-x-1">
              <MessageSquare size={12} className="text-zinc-400" />
              <span>Discord Notification (Optional)</span>
            </label>
            <input
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 transition-all font-mono"
            />
            <span className="text-[10px] text-zinc-500 block">
              Paste a Discord channel webhook to also receive streak alerts directly in Discord.
            </span>
          </div>

          {/* Test Alert Button */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testStatus === 'testing'}
              className="w-full py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Send size={11} className={testStatus === 'testing' ? 'animate-pulse text-zinc-300' : 'text-zinc-400'} />
              <span>
                {testStatus === 'testing'
                  ? 'Sending test alert...'
                  : testStatus === 'success'
                  ? 'Alert Sent'
                  : testStatus
                  ? `Failed: ${testStatus}`
                  : 'Send Test Notification'}
              </span>
            </button>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check size={12} />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={12} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
