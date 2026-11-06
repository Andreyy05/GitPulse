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
    <div className="flex flex-col space-y-3.5">
      {/* User Info Bar */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center space-x-2">
          {data?.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data?.username || 'User'}
              className="w-6 h-6 rounded-full border border-white/[0.08] object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] text-zinc-400">
              GH
            </div>
          )}
          <div className="flex flex-col">
            <button
              onClick={handleOpenProfile}
              className="text-xs font-medium text-zinc-300 hover:text-white flex items-center space-x-1 transition-colors text-left tracking-tight"
              title="Open GitHub Profile"
            >
              <span>@{data?.username || 'user'}</span>
              <ExternalLink size={10} className="text-zinc-500" />
            </button>
            <span className="text-[11px] text-zinc-500">
              {data?.updatedAt ? `Synced ${data.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}
            </span>
          </div>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 flex items-center space-x-1.5 text-xs"
          title="Refresh now"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin text-zinc-300' : 'text-zinc-400'} />
          <span className="text-xs font-normal">Sync</span>
        </button>
      </div>

      {/* Main Status Hero Card */}
      {error ? (
        <div className="p-4 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2.5">
          <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-rose-200">Unable to check activity</p>
            <p className="text-[11px] text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <div className="relative p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] transition-all">
          <div className="flex items-center justify-between mb-3.5">
            {/* Status Pill */}
            <div
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-tight ${
                hasPushed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasPushed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{hasPushed ? 'Streak Active' : 'Pending Push'}</span>
            </div>

            <span className="text-xs text-zinc-500">
              {hasPushed ? 'Safe today' : 'Streak at risk'}
            </span>
          </div>

          {/* Commits Big Counter */}
          <div className="flex items-baseline space-x-3 my-3">
            <span
              className={`text-4xl font-semibold tracking-tight ${
                hasPushed ? 'text-white' : 'text-zinc-200'
              }`}
            >
              {commitCount}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200 tracking-tight">
                {commitCount === 1 ? 'commit pushed today' : 'commits pushed today'}
              </span>
              <span className="text-[11px] text-zinc-500">
                {hasPushed
                  ? `Last push at ${data?.lastPushTime || 'today'}`
                  : 'No commits detected on public events yet'}
              </span>
            </div>
          </div>

          {/* Countdown to Midnight */}
          <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <Clock size={12} className={timeLeft.isUrgent ? 'text-rose-400' : 'text-zinc-500'} />
                <span>Time until midnight:</span>
              </span>
              <span
                className={`font-mono text-xs ${
                  hasPushed
                    ? 'text-zinc-300'
                    : timeLeft.isUrgent
                    ? 'text-rose-400 font-medium'
                    : 'text-zinc-300'
                }`}
              >
                {timeLeft.formatted}
              </span>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-white/[0.04] rounded-full h-1 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  hasPushed
                    ? 'bg-emerald-500'
                    : timeLeft.isUrgent
                    ? 'bg-rose-500'
                    : 'bg-zinc-400'
                }`}
                style={{ width: `${timeLeft.progressPercent}%` }}
              />
            </div>
          </div>

          {/* 14-Day Mini Contribution Heatmap */}
          <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs mb-2.5">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <Calendar size={12} className="text-zinc-400" />
                <span>14-Day Activity</span>
              </span>
              <span className="text-[11px] text-zinc-500 transition-colors">
                {hoveredDay ? (
                  <span className="text-zinc-300 font-medium">
                    {hoveredDay.count} {hoveredDay.count === 1 ? 'commit' : 'commits'} · {hoveredDay.formattedDate}
                  </span>
                ) : (
                  <span>
                    {data?.total14DaysCommits || 0} commits total
                  </span>
                )}
              </span>
            </div>

            {/* Squares Row */}
            <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              {data?.history14Days ? (
                data.history14Days.map((day) => {
                  let colorClass = 'bg-white/[0.05] border border-white/[0.04]';
                  if (day.level === 1) {
                    colorClass = 'bg-emerald-950/70 border border-emerald-900/60';
                  } else if (day.level === 2) {
                    colorClass = 'bg-emerald-700/60 border border-emerald-600/50';
                  } else if (day.level === 3) {
                    colorClass = 'bg-emerald-500/80 border border-emerald-500/40';
                  } else if (day.level === 4) {
                    colorClass = 'bg-emerald-400 border border-emerald-300/60';
                  }

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={`${day.count} commit${day.count === 1 ? '' : 's'} on ${day.formattedDate}${day.isToday ? ' (Today)' : ''}`}
                      className={`flex-1 h-4 rounded-[4px] border transition-colors cursor-pointer hover:opacity-80 ${colorClass} ${
                        day.isToday ? 'ring-1 ring-white/40 ring-offset-1 ring-offset-zinc-950' : ''
                      }`}
                    />
                  );
                })
              ) : (
                // Fallback placeholder skeletons while loading
                Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-4 rounded-[4px] bg-white/[0.04] border border-white/[0.04] animate-pulse"
                  />
                ))
              )}
            </div>

            {/* Legend & Labels */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 px-0.5">
              <span>14d ago</span>
              <div className="flex items-center space-x-1">
                <span>Less</span>
                <span className="w-2 h-2 rounded-[2px] bg-white/[0.05] border border-white/[0.04] inline-block" />
                <span className="w-2 h-2 rounded-[2px] bg-emerald-950/70 border border-emerald-900/60 inline-block" />
                <span className="w-2 h-2 rounded-[2px] bg-emerald-700/60 border border-emerald-600/50 inline-block" />
                <span className="w-2 h-2 rounded-[2px] bg-emerald-500/80 border border-emerald-500/40 inline-block" />
                <span className="w-2 h-2 rounded-[2px] bg-emerald-400 border border-emerald-300/60 inline-block" />
                <span>More</span>
              </div>
              <span className="text-zinc-400">Today</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Pushes Today (if available) */}
      {data?.recentPushes && data.recentPushes.length > 0 && (
        <div className="px-0.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <GitCommit size={12} className="text-zinc-400" />
              <span className="font-medium text-zinc-300">Today's Activity</span>
            </span>
            <span className="text-[11px] text-zinc-500">{data.recentPushes.length} event(s)</span>
          </div>

          <div className="space-y-1.5">
            {data.recentPushes.map((push) => (
              <div
                key={push.id}
                onClick={() => handleOpenRepo(push.repoUrl)}
                className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group"
                title={`Open ${push.repo} on GitHub`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-sans text-xs font-medium text-zinc-300 group-hover:text-white truncate flex-1 max-w-[240px] sm:max-w-sm md:max-w-md pr-2">
                    {push.repo}
                  </span>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    {push.time}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-1">
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
