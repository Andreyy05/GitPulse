import React from 'react';
import { Minus, Square, X, Settings as SettingsIcon, Activity } from 'lucide-react';

export function Header({ status = 'default', onOpenSettings }) {
  const handleMinimize = () => {
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    }
  };

  const handleToggleMaximize = () => {
    if (window.electronAPI?.toggleMaximize) {
      window.electronAPI.toggleMaximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    }
  };

  const statusDot =
    status === 'green'
      ? 'bg-emerald-500 dark:bg-emerald-400'
      : status === 'red'
      ? 'bg-rose-500 dark:bg-rose-400'
      : 'bg-zinc-400 dark:bg-zinc-500';

  return (
    <header
      onDoubleClick={handleToggleMaximize}
      className="h-9 bg-white/75 dark:bg-zinc-950/70 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06] px-3.5 flex items-center justify-between select-none drag-region z-50 shrink-0 transition-colors"
    >
      {/* Brand & Live Indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5">
          <Activity size={13} className="text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
            GitPulse
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-0.5 no-drag">
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
        >
          <SettingsIcon size={13} />
        </button>

        <button
          onClick={handleMinimize}
          title="Minimize to Tray"
          className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
        >
          <Minus size={13} />
        </button>

        <button
          onClick={handleToggleMaximize}
          title="Maximize / Restore"
          className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
        >
          <Square size={11} />
        </button>

        <button
          onClick={handleClose}
          title="Close (Hide to Tray)"
          className="p-1 rounded text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
}
