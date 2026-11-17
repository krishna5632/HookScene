import React, { useState, useEffect } from 'react';
import { Promo, CandidateDecisionTrace } from '../types';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  ExternalLink,
  Flame,
  Heart,
  HelpCircle,
  Zap,
  Layers,
  Scale,
  RefreshCw,
} from 'lucide-react';

interface CandidateExplanationPanelProps {
  candidate: Promo | null;
  runId?: string;
  onNavigateToLine?: (lineId: string) => void;
  defaultExpanded?: boolean;
}

export const CandidateExplanationPanel: React.FC<CandidateExplanationPanelProps> = ({
  candidate,
  runId = 'official-run-C',
  onNavigateToLine,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'selection' | 'signals' | 'rubric' | 'evidence' | 'validation' | 'judges'>('selection');
  const [trace, setTrace] = useState<CandidateDecisionTrace | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (candidate?.pid) {
      fetchExplanation(candidate.pid);
    }
  }, [candidate?.pid, runId]);

  const fetchExplanation = async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/explain?run_id=${encodeURIComponent(runId)}&candidate_id=${encodeURIComponent(pid)}`);
      if (res.ok) {
        const data: CandidateDecisionTrace = await res.json();
        setTrace(data);
      } else {
        setError('Could not load automated decision trace');
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching explanation');
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return null;

  return (
    <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-xs transition-all mt-4">
      {/* Header Accordion Bar (TwelveLabs Unified Theme) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 bg-[#F8F8FA] flex items-center justify-between border-b border-[#E5E5EA] hover:bg-[#F0F0F2] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-[#18181B] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#18181B] tracking-tight">
                Why This Candidate? · Decision Trace & AI Reasoning
              </span>
              <span className="text-[10px] bg-[#ECECEE] text-[#18181B] font-semibold px-2 py-0.5 rounded-md border border-[#D1D1D6]">
                Feature 6 Explainability
              </span>
            </div>
            <p className="text-[11px] text-[#71717A] mt-0.5">
              Transparent audit of selection logic, dramatic signals, rubric judging, and screenplay proof
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {trace && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-0.5 rounded-md bg-[#ECECEE] text-[#18181B] border border-[#E0E0E4] font-bold">
                {trace.composite_score_100}/100 Score
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md border font-semibold ${
                  trace.overall_validation_passed
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {trace.overall_validation_passed ? '6/6 Rules Passed' : 'Rule Issues'}
              </span>
            </div>
          )}
          <div className="text-[#71717A] hover:text-[#18181B] p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="p-5 bg-white">
          {loading && !trace ? (
            <div className="py-8 flex flex-col items-center justify-center text-[#71717A] text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-[#18181B] mb-2" />
              <span>Generating candidate explanation trace...</span>
            </div>
          ) : error ? (
            <div className="py-4 text-center text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
              {error}
            </div>
          ) : trace ? (
            <div className="space-y-4">
              {/* Tab Navigation Bar (TwelveLabs Minimalist Styling) */}
              <div className="flex items-center gap-2 border-b border-[#E5E5EA] pb-3 overflow-x-auto text-sm">
                {[
                  { id: 'selection', label: '1. Selection Reason' },
                  { id: 'signals', label: '2. Dramatic Signals' },
                  { id: 'rubric', label: '3. Rubric Score Breakdown' },
                  { id: 'evidence', label: '4. Screenplay Evidence' },
                  { id: 'validation', label: '5. Validation Results' },
                  { id: 'judges', label: '6. Judge Agreement' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#18181B] text-white shadow-xs'
                        : 'text-[#52525A] hover:text-[#18181B] hover:bg-[#F0F0F2] bg-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: SELECTION REASON */}
              {activeTab === 'selection' && (
                <div className="space-y-4">
                  {/* Main Editorial Why Callout */}
                  <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-2xl p-5 space-y-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-[#52525A] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#18181B]" />
                      Editorial Selection Rationale
                    </span>
                    <p className="text-base text-[#18181B] font-semibold leading-relaxed">
                      "{trace.selection_reason}"
                    </p>
                  </div>

                  {/* 4 Focused Reason Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Core Interest */}
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-1.5 shadow-2xs">
                      <span className="text-[13px] font-bold text-[#18181B] flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        What Makes This Scene Interesting?
                      </span>
                      <p className="text-[13px] text-[#3F3F46] leading-relaxed">
                        {trace.interest_summary}
                      </p>
                    </div>

                    {/* Opening Hook */}
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-1.5 shadow-2xs">
                      <span className="text-[13px] font-bold text-[#18181B] flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        Why The Opening Works as a Hook (0–3s)
                      </span>
                      <p className="text-[13px] text-[#3F3F46] leading-relaxed">
                        {trace.hook_why}
                      </p>
                    </div>

                    {/* Cliffhanger Cut */}
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-1.5 shadow-2xs">
                      <span className="text-[13px] font-bold text-[#18181B] flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        Why The Ending Creates Suspense
                      </span>
                      <p className="text-[13px] text-[#3F3F46] leading-relaxed">
                        {trace.cliffhanger_why}
                      </p>
                    </div>

                    {/* Standalone Clarity */}
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-1.5 shadow-2xs">
                      <span className="text-[13px] font-bold text-[#18181B] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        Standalone Promo Suitability
                      </span>
                      <p className="text-[13px] text-[#3F3F46] leading-relaxed">
                        {trace.standalone_suitability}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DRAMATIC SIGNALS */}
              {activeTab === 'signals' && (
                <div className="space-y-3">
                  <div className="text-xs text-[#52525A] flex items-center justify-between font-medium">
                    <span>
                      Detected dramatic tensions mapped against verbatim screenplay dialogue lines:
                    </span>
                    <span className="font-mono text-[#18181B] font-semibold text-xs">
                      Primary: {trace.primary_signal.toUpperCase()} ({trace.signal_intensity}/5)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {trace.detected_signals.map((sig, idx) => (
                      <div key={idx} className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#18181B] text-sm flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            {sig.label}
                          </span>
                          <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-[#F0F0F2] text-[#18181B] font-semibold border border-[#E0E0E4]">
                            Intensity: {sig.intensity}/5
                          </span>
                        </div>

                        <div className="text-xs text-[#3F3F46] leading-relaxed">
                          <span className="font-semibold text-[#18181B]">Trigger:</span> {sig.trigger_reason}
                        </div>

                        {sig.evidence_quote && (
                          <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-3 font-mono text-xs text-[#18181B]">
                            <div className="flex items-center justify-between text-xs text-[#71717A] mb-1.5">
                              <span className="font-medium">Screenplay Quote:</span>
                              {sig.line_id && (
                                <span
                                  onClick={() => onNavigateToLine && sig.line_id && onNavigateToLine(sig.line_id)}
                                  className="text-amber-800 font-bold hover:underline cursor-pointer"
                                >
                                  {sig.line_id}
                                </span>
                              )}
                            </div>
                            <p className="italic font-sans text-sm text-[#18181B] leading-relaxed">"{sig.evidence_quote}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: RUBRIC SCORE BREAKDOWN */}
              {activeTab === 'rubric' && (
                <div className="space-y-3">
                  <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F8FA] text-[#18181B] font-semibold border-b border-[#E5E5EA] uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3.5">Evaluation Dimension</th>
                          <th className="py-3 px-2.5">Weight</th>
                          <th className="py-3 px-2.5">Judge 1</th>
                          <th className="py-3 px-2.5">Judge 2</th>
                          <th className="py-3 px-2.5">Final (1–5)</th>
                          <th className="py-3 px-2.5">Points</th>
                          <th className="py-3 px-3.5">Editorial Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5EA] text-[#27272A]">
                        {trace.rubric_breakdown.map((crit, idx) => (
                          <tr key={idx} className="hover:bg-[#F8F8FA] transition-colors">
                            <td className="py-3 px-3.5 font-semibold text-sm text-[#18181B]">{crit.label}</td>
                            <td className="py-3 px-2.5 font-mono text-xs font-medium text-[#52525A]">{crit.weight_pct}%</td>
                            <td className="py-3 px-2.5 font-mono text-xs font-semibold">{crit.judge1_score !== null ? `${crit.judge1_score}/5` : '—'}</td>
                            <td className="py-3 px-2.5 font-mono text-xs font-semibold">{crit.judge2_score !== null ? `${crit.judge2_score}/5` : '—'}</td>
                            <td className="py-3 px-2.5 font-mono text-xs font-bold text-[#18181B]">{crit.final_score.toFixed(1)}/5</td>
                            <td className="py-3 px-2.5 font-mono text-xs font-bold text-amber-700">+{crit.weighted_points}</td>
                            <td className="py-3 px-3.5 text-xs text-[#3F3F46] leading-relaxed max-w-md">{crit.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-[#52525A]">
                      Weighted Formula:{' '}
                      <code className="font-mono bg-white px-2 py-0.5 rounded border border-[#D1D1D6] text-[#18181B] font-semibold">
                        Score = ∑ (Rating / 5 × Weight)
                      </code>
                    </span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      Total: {trace.composite_score_100}/100
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: SCREENPLAY EVIDENCE */}
              {activeTab === 'evidence' && (
                <div className="space-y-3">
                  <div className="text-xs text-[#52525A] flex items-center justify-between font-medium">
                    <span>
                      Traceable screenplay lines from Episode {trace.episode} ({trace.evidence_items.length} lines verified):
                    </span>
                    <span className="text-amber-800 font-semibold text-xs">
                      Click line ID to highlight in teleprompter
                    </span>
                  </div>

                  <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F8FA] text-[#18181B] font-semibold border-b border-[#E5E5EA] uppercase tracking-wider text-[11px] sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3.5 bg-[#F8F8FA]">Role / Kind</th>
                          <th className="py-2.5 px-2.5 bg-[#F8F8FA]">Line ID</th>
                          <th className="py-2.5 px-2.5 bg-[#F8F8FA]">Speaker</th>
                          <th className="py-2.5 px-3.5 bg-[#F8F8FA]">Verbatim Screenplay Dialogue</th>
                          <th className="py-2.5 px-2.5 text-right bg-[#F8F8FA]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5EA] text-[#27272A] font-mono text-xs">
                        {trace.evidence_items.map((ev, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-2.5 px-3.5 font-sans">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  ev.kind === 'hook'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : ev.kind === 'cliffhanger'
                                    ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                    : ev.kind === 'signal'
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                    : 'bg-[#ECECEE] text-[#27272A]'
                                }`}
                              >
                                {ev.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 font-bold text-[#18181B]">{ev.line_id}</td>
                            <td className="py-2.5 px-2.5 text-[#3F3F46] font-sans font-medium">{ev.speaker || '—'}</td>
                            <td className="py-2.5 px-3.5 font-sans italic text-sm text-[#18181B] leading-relaxed">
                              "{ev.text}"
                              <span className="text-[10px] not-italic ml-2 text-emerald-800 font-sans font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Direct Evidence
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right">
                              <button
                                onClick={() => onNavigateToLine && onNavigateToLine(ev.line_id)}
                                className="text-xs font-sans font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 justify-end cursor-pointer"
                                title="Scroll to this line in Screenplay Preview"
                              >
                                Jump <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: VALIDATION RESULTS */}
              {activeTab === 'validation' && (
                <div className="space-y-3">
                  <div className="text-xs text-[#52525A] font-medium">
                    Deterministic compliance verification against HookScene business rules:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trace.validation_checks.map((vc, idx) => (
                      <div
                        key={idx}
                        className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-2xs ${
                          vc.status === 'passed' ? 'border-emerald-200/90' : 'border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-[#18181B] flex items-center gap-2">
                            {vc.status === 'passed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                            {vc.name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono ${
                              vc.status === 'passed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {vc.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[#52525A] font-mono">
                            <span>Measured: {vc.actual_value}</span>
                            <span>Req: {vc.threshold}</span>
                          </div>
                          <p className="text-[#3F3F46] font-sans leading-relaxed text-xs">
                            {vc.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: JUDGE AGREEMENT OR DISAGREEMENT */}
              {activeTab === 'judges' && (
                <div className="space-y-3">
                  {trace.judge_divergence_detected ? (
                    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        <span>Dual-Judge Score Divergence Detected (Human Review Recommended)</span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Judge 1 evaluated this scene at <strong className="font-mono">{trace.judge1_overall}/100</strong> while
                        Judge 2 rated it at <strong className="font-mono">{trace.judge2_overall}/100</strong> (Delta of{' '}
                        <span className="font-mono font-bold">{trace.judge_divergence_delta} points</span>). This scene was
                        automatically flagged for human editorial review on the Review Desk.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Dual Judges in Consensus</span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        Both Judge 1 and Judge 2 produced aligned rubric assessments with minimal variance. The final
                        weighted score of <strong className="font-mono">{trace.composite_score_100}/100</strong> reflects high
                        editorial agreement across all five evaluation dimensions.
                      </p>
                    </div>
                  )}

                  {trace.judge_notes && (
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 text-xs space-y-1.5">
                      <span className="font-bold text-[#18181B] text-xs">Judge Composite Note:</span>
                      <p className="text-[#3F3F46] font-mono text-xs leading-relaxed">
                        "{trace.judge_notes}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
