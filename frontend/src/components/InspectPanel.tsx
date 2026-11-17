import React from 'react';
import { Promo, Dataset } from '../types';
import { getHookText, fmtTime } from '../utils/export';
import { Sparkles, Clock, Target, ShieldCheck, Film, BookOpen } from 'lucide-react';

interface InspectPanelProps {
  promo: Promo | null;
  dataset: Dataset | null;
}

const SCORE_NAMES: [string, string, string][] = [
  ['hook_3s', 'Hook, first 3s', 'bg-craft-yellow/30'],
  ['cliffhanger', 'Cliffhanger cutoff', 'bg-craft-orange/30'],
  ['standalone', 'Makes sense alone', 'bg-craft-mint/30'],
  ['intensity', 'Dramatic intensity', 'bg-craft-pink/30'],
  ['plot_relevance', 'Plot relevance', 'bg-craft-blue/30'],
];

export const InspectPanel: React.FC<InspectPanelProps> = ({ promo, dataset }) => {
  if (!promo) {
    return (
      <div className="bg-white border-2 border-ink rounded p-12 text-center text-ink-muted shadow-craft">
        <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40 text-ink" />
        <p className="font-mono text-xs font-bold uppercase tracking-wider">
          Select a promo candidate to inspect screenplay dialogue cuts & scoring metrics.
        </p>
      </div>
    );
  }

  const isM = promo.kind === 'montage';
  const s0 = promo.segments[0];
  const sEnd = promo.segments[promo.segments.length - 1];
  const durs = dataset?.episode_durations || {};
  const epDur = durs[s0.episode] || durs[String(s0.episode)] || Math.max(sEnd.end, 1);
  const startPct = Math.max(0, Math.min(100, (s0.start / epDur) * 100));
  const endPct = Math.max(0, Math.min(100, (sEnd.end / epDur) * 100));
  const widthPct = Math.max(2, endPct - startPct);
  const hookText = getHookText(promo);
  const excerpt = promo.excerpt || (promo.transcript_excerpt as string[]) || [];

  return (
    <div className="bg-white border-2 border-ink rounded p-5 sm:p-6 shadow-craft-md space-y-6">
      {/* Header Info */}
      <div className="border-b-2 border-ink/20 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono font-bold mb-2 flex-wrap">
          <span
            className={`px-2.5 py-0.5 rounded border border-ink shadow-craft-xs ${
              isM ? 'bg-craft-mint text-ink' : 'bg-craft-yellow text-ink'
            }`}
          >
            {isM ? `MONTAGE M${promo.rank}` : `RANK #${promo.rank}`}
          </span>
          <span className="text-ink">Episode {s0.episode.toString().padStart(2, '0')}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink">{fmtTime(s0.start)} – {fmtTime(sEnd.end)}</span>
          <span className="text-ink-muted">·</span>
          <span className="bg-craft-blue/30 border border-ink px-2 py-0.5 rounded text-ink">
            {promo.duration.toFixed(1)}s duration
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-sans text-ink leading-snug tracking-tight mb-2">
          "{hookText}"
        </h2>

        {(promo.rank_reason || promo.why) && (
          <div className="bg-amber-50/80 border border-ink/40 rounded p-2.5 mt-2 text-xs text-ink leading-relaxed">
            <span className="font-bold font-mono uppercase text-[10px] text-ink-muted block mb-0.5">
              Why this cut works:
            </span>
            {promo.rank_reason || promo.why}
          </div>
        )}
      </div>

      {/* Episode Placement Timeline Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono font-bold text-ink mb-1.5">
          <span>00:00</span>
          <span className="uppercase text-[11px] text-ink-muted">Episode Placement ({fmtTime(s0.start)} - {fmtTime(sEnd.end)})</span>
          <span>{fmtTime(epDur)}</span>
        </div>
        <div className="relative h-3 bg-stone-100 rounded border-2 border-ink overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-craft-yellow border-r border-ink transition-all"
            style={{ left: `${startPct}%`, width: `${widthPct}%` }}
          />
        </div>
      </div>

      {/* Screenplay Teleprompter with Lined Paper Style */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-ink" />
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-ink">
              Screenplay Teleprompter
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-ink-muted">
            {excerpt.length} dialogue beats
          </span>
        </div>

        <div className="bg-[#fcfbf9] rounded border-2 border-ink p-4 max-h-80 overflow-y-auto space-y-2">
          {excerpt.length === 0 ? (
            <p className="text-xs text-ink-muted italic p-3 font-mono">No raw screenplay excerpt attached.</p>
          ) : (
            excerpt.map((lineStr, idx) => {
              const isHook = Boolean(promo.hook_line_id && lineStr.includes(promo.hook_line_id));
              const isCliff = Boolean(promo.cliffhanger_line_id && lineStr.includes(promo.cliffhanger_line_id));
              return (
                <div
                  key={idx}
                  className={`text-xs p-2.5 rounded font-mono leading-relaxed transition-all ${
                    isHook
                      ? 'bg-amber-100/90 border-2 border-amber-500 text-ink font-bold shadow-craft-xs'
                      : isCliff
                      ? 'bg-orange-100/90 border-2 border-orange-500 text-ink font-bold shadow-craft-xs'
                      : 'text-ink hover:bg-stone-100 border border-transparent'
                  }`}
                >
                  <div>{lineStr}</div>
                  {isHook && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-ink bg-craft-yellow px-2 py-0.5 rounded border border-ink">
                      <Target className="w-2.5 h-2.5" />
                      Hook Boundary (0–3s Cut)
                    </div>
                  )}
                  {isCliff && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-ink bg-craft-orange px-2 py-0.5 rounded border border-ink">
                      <Clock className="w-2.5 h-2.5" />
                      Cliffhanger Cutoff (Binge Trigger)
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rubric Scoring Breakdown */}
      {promo.scores && (
        <div>
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-ink mb-2.5">
            Dual-Judge Rubrics
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SCORE_NAMES.map(([key, label, bgClass]) => {
              const val = (promo.scores as any)[key];
              if (val === undefined) return null;
              return (
                <div
                  key={key}
                  className={`${bgClass} border-2 border-ink rounded p-2.5 shadow-craft-xs`}
                >
                  <span className="block text-[10px] font-mono font-bold text-ink uppercase mb-0.5">{label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold font-mono text-ink">{val}</span>
                    <span className="text-xs font-mono text-ink-muted">/ 5</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
