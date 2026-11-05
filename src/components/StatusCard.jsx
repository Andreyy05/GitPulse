import React, { useState, useEffect } from 'react';
import { RefreshCw, GitCommit, Clock, AlertTriangle, CheckCircle2, ExternalLink, Calendar } from 'lucide-react';

export function StatusCard({ data, loading, error, onRefresh }) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  const [hoveredDay, setHoveredDay] = useState(null);

  // Real-time countdown to midnight local time
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight.getTime() - now.getTime());

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const totalDaySeconds = 24 * 3600;
    const secondsPassed = 24 * 3600 - Math.floor(diff / 1000);
    const progressPercent = Math.min(100, Math.max(0, (secondsPassed / totalDaySeconds) * 100));

    return {
      formatted: `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
      isUrgent: hours < 4,
      progressPercent,
    };
  }

  const handleOpenProfile = () => {
    if (data?.username) {
      const url = `https://github.com/${data.username}`;
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const handleOpenRepo = (repoUrl) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(repoUrl);
    } else {
      window.open(repoUrl, '_blank');
    }
  };

  const hasPushed = data?.hasPushedToday;
  const commitCount = data?.totalCommitsToday || 0;

  return (
    <div className="flex flex-col space-y-3">
      {/* User Info Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          {data?.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data?.username || 'User'}
              className="w-7 h-7 rounded-full border border-slate-700 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-400">
              GH
            </div>
          )}
          <div className="flex flex-col">
            <button
              onClick={handleOpenProfile}
              className="font-mono text-xs font-semibold text-slate-200 hover:text-indigo-400 flex items-center space-x-1 transition-colors text-left"
              title="Open GitHub Profile"
            >
              <span>@{data?.username || 'user'}</span>
              <ExternalLink size={10} className="opacity-60" />
            </button>
            <span className="text-[10px] text-slate-400">
              {data?.updatedAt ? `Synced ${data.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}
            </span>
          </div>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50 flex items-center space-x-1 text-xs"
          title="Refresh now"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-400' : ''} />
          <span className="text-[11px] font-mono">Sync</span>
        </button>
      </div>

      {/* Main Status Hero Card */}
      {error ? (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-start space-x-2">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Unable to check activity</p>
            <p className="text-[11px] text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <div
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 ${
            hasPushed
              ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900/90 border-emerald-500/40 shadow-glow-green'
              : 'bg-gradient-to-b from-rose-950/40 to-slate-900/90 border-rose-500/40 shadow-glow-red'
          }`}
        >
          {/* Subtle Ambient Glow Effect inside card */}
          <div
            className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
              hasPushed ? 'bg-emerald-500/15' : 'bg-rose-500/15'
            }`}
          />

          <div className="flex items-center justify-between mb-3">
            {/* Status Pill */}
            <div
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider ${
                hasPushed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
              }`}
            >
              {hasPushed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              <span>{hasPushed ? 'Streak Active' : 'Pending Push'}</span>
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {hasPushed ? 'Safe today' : 'Streak at risk'}
            </span>
          </div>

          {/* Commits Big Counter */}
          <div className="flex items-baseline space-x-3 my-2">
            <span
              className={`text-4xl font-mono font-bold tracking-tight ${
                hasPushed ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {commitCount}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">
                {commitCount === 1 ? 'commit pushed today' : 'commits pushed today'}
              </span>
              <span className="text-[10px] text-slate-400">
                {hasPushed
                  ? `Last push at ${data?.lastPushTime || 'today'}`
                  : 'No commits detected on public events yet'}
              </span>
            </div>
          </div>

          {/* Countdown to Midnight */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
              <span className="text-slate-400 flex items-center space-x-1">
                <Clock size={11} className={timeLeft.isUrgent ? 'text-rose-400' : 'text-slate-400'} />
                <span>Time until midnight:</span>
              </span>
              <span
                className={`font-semibold ${
                  hasPushed
                    ? 'text-slate-300'
                    : timeLeft.isUrgent
                    ? 'text-rose-400 font-bold'
                    : 'text-amber-300'
                }`}
              >
                {timeLeft.formatted}
              </span>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  hasPushed
                    ? 'bg-emerald-500'
                    : timeLeft.isUrgent
                    ? 'bg-rose-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${timeLeft.progressPercent}%` }}
              />
            </div>
          </div>

          {/* 14-Day Mini Contribution Heatmap */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono mb-2">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Calendar size={11} className="text-emerald-400" />
                <span>14-Day Activity</span>
              </span>
              <span className="text-[10px] font-mono transition-colors">
                {hoveredDay ? (
                  <span className="text-emerald-400 font-medium">
                    {hoveredDay.count} {hoveredDay.count === 1 ? 'commit' : 'commits'} · {hoveredDay.formattedDate}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {data?.total14DaysCommits || 0} commits total
                  </span>
                )}
              </span>
            </div>

            {/* Squares Row */}
            <div className="flex items-center justify-between gap-1 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              {data?.history14Days ? (
                data.history14Days.map((day) => {
                  let colorClass = 'bg-slate-800/90 border-slate-700/60 hover:border-slate-500';
                  if (day.level === 1) {
                    colorClass = 'bg-emerald-950 border-emerald-800/70 hover:border-emerald-600';
                  } else if (day.level === 2) {
                    colorClass = 'bg-emerald-700/85 border-emerald-500/80 hover:border-emerald-400';
                  } else if (day.level === 3) {
                    colorClass = 'bg-emerald-500 border-emerald-400 hover:border-emerald-300 shadow-sm shadow-emerald-500/30';
                  } else if (day.level === 4) {
                    colorClass = 'bg-emerald-400 border-emerald-300 shadow-md shadow-emerald-400/40';
                  }

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={`${day.count} commit${day.count === 1 ? '' : 's'} on ${day.formattedDate}${day.isToday ? ' (Today)' : ''}`}
                      className={`flex-1 h-5 rounded-md border transition-all cursor-pointer transform hover:scale-125 ${colorClass} ${
                        day.isToday ? 'ring-1 ring-indigo-400 ring-offset-1 ring-offset-slate-950' : ''
                      }`}
                    />
                  );
                })
              ) : (
                // Fallback placeholder skeletons while loading
                Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-5 rounded-md bg-slate-800/50 border border-slate-800 animate-pulse"
                  />
                ))
              )}
            </div>

            {/* Legend & Labels */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1.5 px-0.5">
              <span>14d ago</span>
              <div className="flex items-center space-x-1">
                <span>Less</span>
                <span className="w-2 h-2 rounded-sm bg-slate-800/90 border border-slate-700/60 inline-block" />
                <span className="w-2 h-2 rounded-sm bg-emerald-950 border border-emerald-800/70 inline-block" />
                <span className="w-2 h-2 rounded-sm bg-emerald-700/85 border border-emerald-500/80 inline-block" />
                <span className="w-2 h-2 rounded-sm bg-emerald-500 border border-emerald-400 inline-block" />
                <span className="w-2 h-2 rounded-sm bg-emerald-400 border border-emerald-300 inline-block" />
                <span>More</span>
              </div>
              <span className="font-semibold text-slate-400">Today</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Pushes Today (if available) */}
      {data?.recentPushes && data.recentPushes.length > 0 && (
        <div className="px-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
            <span className="flex items-center space-x-1">
              <GitCommit size={11} />
              <span>Today's Activity</span>
            </span>
            <span className="text-[10px]">{data.recentPushes.length} event(s)</span>
          </div>

          <div className="space-y-1.5">
            {data.recentPushes.map((push) => (
              <div
                key={push.id}
                onClick={() => handleOpenRepo(push.repoUrl)}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all cursor-pointer group"
                title={`Open ${push.repo} on GitHub`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-medium text-slate-300 group-hover:text-indigo-400 truncate max-w-[200px]">
                    {push.repo}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {push.time}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  "{push.latestMessage}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
