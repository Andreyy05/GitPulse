import React from 'react';
import { Minus, X, Settings as SettingsIcon, Activity } from 'lucide-react';

export function Header({ status = 'default', onOpenSettings }) {
  const handleMinimize = () => {
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    }
  };

  const statusGlow =
    status === 'green'
      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
      : status === 'red'
      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
      : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]';

  return (
    <header className="h-10 bg-slate-950/80 backdrop-blur border-b border-slate-800/80 px-3 flex items-center justify-between select-none drag-region z-50">
      {/* Brand & Live Indicator */}
      <div className="flex items-center space-x-2">
        <div className="relative flex items-center justify-center">
          <Activity size={16} className="text-indigo-400" />
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${statusGlow} animate-pulse`} />
        </div>
        <span className="font-mono text-xs font-semibold tracking-wider text-slate-200">
          Git<span className="text-indigo-400">Pulse</span>
        </span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-1 no-drag">
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        >
          <SettingsIcon size={14} />
        </button>

        <button
          onClick={handleMinimize}
          title="Minimize to Tray"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        >
          <Minus size={14} />
        </button>

        <button
          onClick={handleClose}
          title="Close (Hide to Tray)"
          className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
