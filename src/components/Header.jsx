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
      ? 'bg-emerald-400'
      : status === 'red'
      ? 'bg-rose-400'
      : 'bg-zinc-500';

  return (
    <header
      onDoubleClick={handleToggleMaximize}
      className="h-9 bg-zinc-950/70 backdrop-blur-md border-b border-white/[0.06] px-3.5 flex items-center justify-between select-none drag-region z-50 shrink-0"
    >
      {/* Brand & Live Indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5">
          <Activity size={13} className="text-zinc-400" />
          <span className="text-xs font-medium tracking-tight text-zinc-200">
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
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
        >
          <SettingsIcon size={13} />
        </button>

        <button
          onClick={handleMinimize}
          title="Minimize to Tray"
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
        >
          <Minus size={13} />
        </button>

        <button
          onClick={handleToggleMaximize}
          title="Maximize / Restore"
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
        >
          <Square size={11} />
        </button>

        <button
          onClick={handleClose}
          title="Close (Hide to Tray)"
          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
}
