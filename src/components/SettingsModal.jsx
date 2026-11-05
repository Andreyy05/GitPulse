import React, { useState, useEffect } from 'react';
import { X, Check, User, Bell, Clock, ShieldCheck, Send, MessageSquare, ExternalLink, Rocket } from 'lucide-react';
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
  onSave,
}) {
  const [username, setUsername] = useState(currentUsername);
  const [interval, setInterval] = useState(currentInterval);
  const [eveningAlert, setEveningAlert] = useState(currentEveningAlert);
  const [alertTime, setAlertTime] = useState(currentAlertTime || '18:00');
  const [discordWebhook, setDiscordWebhook] = useState(currentDiscordWebhook || '');
  const [launchAtStartup, setLaunchAtStartup] = useState(() => {
    if (typeof currentLaunchAtStartup === 'boolean') return currentLaunchAtStartup;
    return localStorage.getItem('gitpulse_launch_at_startup') === 'true';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-[360px] max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col space-y-3.5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <User size={16} className="text-indigo-400" />
            <h3 className="font-mono text-sm font-semibold text-slate-100">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Settings Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1 custom-scrollbar">
          {/* GitHub Username Input */}
          <div className="flex flex-col space-y-1">
            <label className="font-mono text-slate-300 font-medium">GitHub Username</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Andreyy05"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
            <span className="text-[10px] text-slate-500">
              Monitors public activity events from GitHub API.
            </span>
          </div>

          {/* Auto Refresh Interval */}
          <div className="flex flex-col space-y-1">
            <label className="font-mono text-slate-300 font-medium flex items-center space-x-1">
              <Clock size={12} className="text-indigo-400" />
              <span>Background Refresh Rate</span>
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes (recommended)</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </div>

          {/* Launch at Startup Switch */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex flex-col pr-2">
              <span className="font-mono text-slate-200 font-medium flex items-center space-x-1.5">
                <Rocket size={12} className="text-purple-400" />
                <span>Launch at Startup</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
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
                launchAtStartup ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  launchAtStartup ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Daily Streak Reminder & Custom Alert Time */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={eveningAlert}
                onChange={(e) => setEveningAlert(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-mono text-slate-200 font-medium flex items-center space-x-1">
                  <Bell size={11} className="text-amber-400" />
                  <span>Daily Streak Reminder</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Sends alert if you haven't pushed commits before the scheduled time.
                </span>
              </div>
            </label>

            {eveningAlert && (
              <div className="pl-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono text-[11px]">Reminder Time:</span>
                  <input
                    type="time"
                    value={alertTime}
                    onChange={(e) => setAlertTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
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
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
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
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <label className="font-mono text-slate-300 font-medium flex items-center space-x-1">
              <MessageSquare size={12} className="text-[#5865F2]" />
              <span>Discord Notification (Optional)</span>
            </label>
            <input
              type="url"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-[#5865F2] transition-all"
            />
            <span className="text-[10px] text-slate-500 block">
              Paste a Discord channel webhook to also receive streak alerts directly in Discord.
            </span>
          </div>

          {/* Test Alert Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testStatus === 'testing'}
              className="w-full py-1.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800/70 text-slate-300 font-mono text-[11px] flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Send size={12} className={testStatus === 'testing' ? 'animate-pulse text-indigo-400' : 'text-slate-400'} />
              <span>
                {testStatus === 'testing'
                  ? 'Sending test alert...'
                  : testStatus === 'success'
                  ? '✅ Alert Sent!'
                  : testStatus
                  ? `❌ ${testStatus}`
                  : 'Send Test Notification Now'}
              </span>
            </button>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center space-x-1 shadow-lg shadow-indigo-600/30 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check size={13} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={13} />
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
