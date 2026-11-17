import React from 'react';
import { Promo } from '../types';
import { getHookText, fmtTime } from '../utils/export';
import { Check, X, Sparkles, Layers } from 'lucide-react';

interface PromoCardProps {
  promo: Promo;
  isSelected: boolean;
  decision?: string;
  onSelect: (pid: string) => void;
}

export const PromoCard: React.FC<PromoCardProps> = ({
  promo,
  isSelected,
  decision,
  onSelect,
}) => {
  const isM = promo.kind === 'montage';
  const s0 = promo.segments[0];
  const sEnd = promo.segments[promo.segments.length - 1];
  const hookText = getHookText(promo);
  const hAttn = Math.round((promo.attention?.hook_attention || 0.7) * 100);
  const hHold = Math.round((promo.attention?.hold || 0.8) * 100);

  return (
    <div
      onClick={() => onSelect(promo.pid)}
      className={`group relative rounded p-3.5 transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-amber-50/70 border-2 border-ink shadow-craft-md translate-x-0.5'
          : 'bg-white border-2 border-ink/80 hover:border-ink shadow-craft-xs hover:shadow-craft'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Rank Badge */}
          <span
            className={`inline-flex items-center justify-center text-xs font-bold font-mono px-2 py-0.5 rounded border border-ink shadow-craft-xs ${
              isM ? 'bg-craft-mint text-ink' : 'bg-craft-yellow text-ink'
            }`}
          >
            {isM ? `M${promo.rank}` : `#${promo.rank}`}
          </span>

          <span className="text-xs font-mono font-bold text-ink-muted">
            Ep {s0.episode.toString().padStart(2, '0')}
          </span>

          {isM && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-ink bg-craft-blue/40 border border-ink px-1.5 py-0.2 rounded">
              <Layers className="w-2.5 h-2.5" />
              Montage
            </span>
          )}
        </div>

        {/* Duration / Status Pill */}
        <div className="flex items-center gap-1.5">
          {decision === 'accept' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-ink bg-craft-mint border border-ink px-2 py-0.5 rounded shadow-craft-xs">
              <Check className="w-3 h-3 stroke-[3]" />
              Approved
            </span>
          )}
          {decision === 'reject' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-ink bg-stone-200 border border-ink px-2 py-0.5 rounded">
              <X className="w-3 h-3 stroke-[3]" />
              Rejected
            </span>
          )}
          <span className="text-xs font-mono font-bold text-ink bg-paper-card border border-ink/40 px-1.5 py-0.5 rounded">
            {promo.duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Hook Excerpt */}
      <h3 className="font-sans font-bold text-sm text-ink leading-snug line-clamp-2 mb-2 group-hover:text-black">
        "{hookText}"
      </h3>

      {/* Timecode & Retention Stats */}
      <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono font-semibold mb-2">
        <span>{fmtTime(s0.start)} – {fmtTime(sEnd.end)}</span>
        <span>Hold: {hHold}%</span>
      </div>

      {/* Craft Progress Bar */}
      <div className="w-full bg-stone-200 rounded border border-ink h-2 overflow-hidden">
        <div
          className="h-full bg-craft-yellow transition-all duration-200"
          style={{ width: `${hHold}%` }}
        />
      </div>
    </div>
  );
};
