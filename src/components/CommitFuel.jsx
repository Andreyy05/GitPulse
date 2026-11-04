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
    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm flex flex-col space-y-2.5">
      {/* Header with Title and Mode Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-slate-200">
          <Flame size={14} className="text-amber-400" />
          <span>Commit Fuel</span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 text-[10px] font-mono bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {[
            { id: 'all', label: 'Mix' },
            { id: 'conventional', label: 'Clean' },
            { id: 'witty', label: 'Witty' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-2 py-0.5 rounded-md transition-all ${
                category === cat.id
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Message Box */}
      <div className="relative group bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 min-h-[58px] flex items-center justify-between transition-all">
        <span
          className={`font-mono text-xs text-indigo-200/90 select-text leading-relaxed pr-2 transition-opacity ${
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <Dices size={14} className={isRolling ? 'animate-spin text-indigo-400' : ''} />
          </button>

          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className={`p-1.5 rounded-lg transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Footer feedback hint */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-0.5">
        <span>Click copy to use in git commit</span>
        {copied && <span className="text-emerald-400 font-semibold animate-pulse">Copied to clipboard!</span>}
      </div>
    </div>
  );
}
