import React, { useState } from 'react';
import { Flame, Copy, Check, Dices } from 'lucide-react';
import { getRandomCommit } from '../services/commitFuel';

export function CommitFuel() {
  const [category, setCategory] = useState('all');
  const [currentMessage, setCurrentMessage] = useState(() => getRandomCommit('all'));
  const [copied, setCopied] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    setIsRolling(true);
    setTimeout(() => {
      setCurrentMessage(getRandomCommit(category));
      setIsRolling(false);
    }, 150);
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setCurrentMessage(getRandomCommit(newCat));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] shadow-sm dark:shadow-none flex flex-col space-y-3 transition-colors">
      {/* Header with Title and Mode Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 tracking-tight">
          <Flame size={13} className="text-zinc-500 dark:text-zinc-400" />
          <span>Commit Fuel</span>
        </div>

        {/* Category Pills: Monochrome & Subtle */}
        <div className="flex items-center space-x-0.5 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
          {[
            { id: 'all', label: 'Mix' },
            { id: 'conventional', label: 'Clean' },
            { id: 'witty', label: 'Witty' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium tracking-tight transition-colors ${
                category === cat.id
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/10 dark:text-white dark:shadow-none'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Message Box */}
      <div className="relative group bg-black/[0.02] dark:bg-black/20 border border-black/[0.06] dark:border-white/[0.06] rounded-lg p-3 min-h-[54px] flex items-center justify-between transition-all">
        <span
          className={`font-mono text-xs text-zinc-800 dark:text-zinc-300 select-text leading-relaxed pr-2 transition-opacity ${
            isRolling ? 'opacity-30' : 'opacity-100'
          }`}
        >
          {currentMessage}
        </span>

        {/* Action Buttons in Message Box */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={handleRoll}
            disabled={isRolling}
            title="Generate new message"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            <Dices size={13} className={isRolling ? 'animate-spin text-zinc-400 dark:text-zinc-300' : ''} />
          </button>

          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className={`p-1.5 rounded-md transition-colors ${
              copied
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Footer feedback hint */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 px-0.5 tracking-tight">
        <span>Click copy to use in git commit</span>
        {copied && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied to clipboard</span>}
      </div>
    </div>
  );
}
