import React from 'react';
import { Check, X } from 'lucide-react';

interface DecisionDockProps {
  currentDecision?: string;
  totalCount: number;
  approvedCount: number;
  rejectedCount: number;
  onApprove: () => void;
  onReject: () => void;
}

export const DecisionDock: React.FC<DecisionDockProps> = ({
  currentDecision,
  totalCount,
  approvedCount,
  rejectedCount,
  onApprove,
  onReject,
}) => {
  const remaining = totalCount - approvedCount - rejectedCount;

  return (
    <footer id="actionbar" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[760px] w-[calc(100%-32px)] pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-3 bg-white border-2 border-ink rounded-lg px-4 sm:px-5 py-2.5 shadow-craft-lg">
        {/* Keyboard hints */}
        <div className="font-mono text-xs text-ink font-bold hidden sm:flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-craft-yellow border border-ink text-ink text-[10px] shadow-craft-xs">J</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-craft-yellow border border-ink text-ink text-[10px] shadow-craft-xs">K</kbd>
          <span className="text-ink-muted">navigate</span>
          <span className="text-ink-muted">·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-craft-mint border border-ink text-ink text-[10px] shadow-craft-xs">A</kbd>
          <span className="text-ink-muted">accept</span>
          <span className="text-ink-muted">·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-craft-pink border border-ink text-ink text-[10px] shadow-craft-xs">R</kbd>
          <span className="text-ink-muted">reject</span>
        </div>

        {/* Tally counter */}
        <div className="text-xs font-mono font-bold text-ink">
          <span className="bg-craft-mint/60 border border-ink px-1.5 py-0.5 rounded mr-1">
            {approvedCount} approved
          </span>
          <span className="bg-craft-pink/60 border border-ink px-1.5 py-0.5 rounded mr-1">
            {rejectedCount} rejected
          </span>
          <span className="text-ink-muted font-normal">
            ({remaining} pending)
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-3 py-1.5 rounded border-2 border-ink transition-all cursor-pointer ${
              currentDecision === 'reject'
                ? 'bg-craft-pink text-ink shadow-craft-xs translate-y-0.5'
                : 'bg-white hover:bg-rose-50 text-ink shadow-craft-xs hover:shadow-craft'
            }`}
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
            <span>Reject</span>
          </button>

          <button
            onClick={onApprove}
            className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-3.5 py-1.5 rounded border-2 border-ink transition-all cursor-pointer ${
              currentDecision === 'accept'
                ? 'bg-craft-mint text-ink shadow-craft-xs translate-y-0.5'
                : 'bg-craft-yellow hover:bg-amber-300 text-ink shadow-craft-xs hover:shadow-craft'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Approve</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
