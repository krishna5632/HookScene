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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all mt-4">
      {/* Header Accordion Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gradient-to-r from-amber-500/5 via-slate-50 to-white flex items-center justify-between border-b border-slate-200/80 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Why This Candidate? · Decision Trace & AI Reasoning
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">
                Explainability Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Transparent audit of selection logic, dramatic signals, rubric judging, and screenplay proof
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {trace && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {trace.composite_score_100}/100 Score
              </span>
              <span
                className={`px-2 py-0.5 rounded border font-semibold ${
                  trace.overall_validation_passed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {trace.overall_validation_passed ? '6/6 Rules Passed' : 'Rule Issues'}
              </span>
              {trace.judge_divergence_detected ? (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                  ⚠️ Judge Divergence
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Judges in Consensus
                </span>
              )}
            </div>
          )}
          <div className="text-slate-500 hover:text-slate-700 p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/40">
          {loading && !trace ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-600 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-600 mb-2" />
              <span>Generating candidate explanation trace...</span>
            </div>
          ) : error ? (
            <div className="py-4 text-center text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
              {error}
            </div>
          ) : trace ? (
            <div className="space-y-4">
              {/* Tab Navigation Navigation Bar */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
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
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-amber-500/15 text-amber-900 border border-amber-400/60 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: SELECTION REASON */}
              {activeTab === 'selection' && (
                <div className="space-y-3">
                  {/* Main Editorial Why Callout */}
                  <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Editorial Selection Rationale
                    </span>
                    <p className="text-xs text-slate-900 font-medium leading-relaxed">
                      "{trace.selection_reason}"
                    </p>
                  </div>

                  {/* 4 Focused Reason Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Core Interest */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        What Makes This Scene Interesting?
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {trace.interest_summary}
                      </p>
                    </div>

                    {/* Opening Hook */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-600" />
                        Why The Opening Works as a Hook (0–3s)
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {trace.hook_why}
                      </p>
                    </div>

                    {/* Cliffhanger Cut */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
                        Why The Ending Creates Suspense
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {trace.cliffhanger_why}
                      </p>
                    </div>

                    {/* Standalone Clarity */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Standalone Promo Suitability
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {trace.standalone_suitability}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DRAMATIC SIGNALS */}
              {activeTab === 'signals' && (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>
                      Detected dramatic tensions mapped against verbatim screenplay dialogue lines:
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      Primary: {trace.primary_signal.toUpperCase()} ({trace.signal_intensity}/5)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trace.detected_signals.map((sig, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {sig.label}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                            Intensity: {sig.intensity}/5
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600">
                          <span className="font-medium text-slate-800">Trigger:</span> {sig.trigger_reason}
                        </div>

                        {sig.evidence_quote && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 font-mono text-[11px] text-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
                              <span>Screenplay Quote:</span>
                              {sig.line_id && (
                                <span
                                  onClick={() => onNavigateToLine && sig.line_id && onNavigateToLine(sig.line_id)}
                                  className="text-amber-800 font-bold hover:underline cursor-pointer"
                                >
                                  {sig.line_id}
                                </span>
                              )}
                            </div>
                            <p className="italic font-sans text-slate-900">"{sig.evidence_quote}"</p>
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
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Evaluation Dimension</th>
                          <th className="py-2.5 px-2">Weight</th>
                          <th className="py-2.5 px-2">Judge 1</th>
                          <th className="py-2.5 px-2">Judge 2</th>
                          <th className="py-2.5 px-2">Final (1–5)</th>
                          <th className="py-2.5 px-2">Points</th>
                          <th className="py-2.5 px-3">Editorial Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {trace.rubric_breakdown.map((crit, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{crit.label}</td>
                            <td className="py-2.5 px-2 font-mono font-medium text-slate-700">{crit.weight_pct}%</td>
                            <td className="py-2.5 px-2 font-mono">{crit.judge1_score !== null ? `${crit.judge1_score}/5` : '—'}</td>
                            <td className="py-2.5 px-2 font-mono">{crit.judge2_score !== null ? `${crit.judge2_score}/5` : '—'}</td>
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-900">{crit.final_score.toFixed(1)}/5</td>
                            <td className="py-2.5 px-2 font-mono font-semibold text-amber-800">+{crit.weighted_points}</td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600 leading-relaxed">{crit.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Weighted Formula:{' '}
                      <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
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
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>
                      Traceable screenplay lines from Episode {trace.episode} ({trace.evidence_items.length} lines verified):
                    </span>
                    <span className="text-amber-800 font-semibold text-[10px]">
                      Click line ID to highlight in teleprompter
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Role / Kind</th>
                          <th className="py-2 px-2">Line ID</th>
                          <th className="py-2 px-2">Speaker</th>
                          <th className="py-2 px-3">Verbatim Screenplay Dialogue</th>
                          <th className="py-2 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                        {trace.evidence_items.map((ev, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-2 px-3 font-sans">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  ev.kind === 'hook'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : ev.kind === 'cliffhanger'
                                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                    : ev.kind === 'signal'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {ev.label}
                              </span>
                            </td>
                            <td className="py-2 px-2 font-bold text-slate-900">{ev.line_id}</td>
                            <td className="py-2 px-2 text-slate-700 font-sans font-medium">{ev.speaker || '—'}</td>
                            <td className="py-2 px-3 font-sans italic text-slate-900">
                              "{ev.text}"
                              <span className="text-[9px] not-italic ml-2 text-emerald-700 font-sans font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
                                Direct Evidence
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                onClick={() => onNavigateToLine && onNavigateToLine(ev.line_id)}
                                className="text-[10px] font-sans font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 justify-end"
                                title="Scroll to this line in Screenplay Preview"
                              >
                                Jump <ExternalLink className="w-3 h-3" />
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
                  <div className="text-[11px] text-slate-600">
                    Deterministic compliance verification against HookScene business rules:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {trace.validation_checks.map((vc, idx) => (
                      <div
                        key={idx}
                        className={`bg-white border rounded-xl p-3 flex flex-col justify-between ${
                          vc.status === 'passed' ? 'border-emerald-200/90' : 'border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            {vc.status === 'passed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                            {vc.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                              vc.status === 'passed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {vc.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600 font-mono">
                            <span>Measured: {vc.actual_value}</span>
                            <span>Req: {vc.threshold}</span>
                          </div>
                          <p className="text-slate-600 font-sans leading-relaxed text-[11px]">
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
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        <span>Dual-Judge Score Divergence Detected (Human Review Recommended)</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Judge 1 evaluated this scene at <strong className="font-mono">{trace.judge1_overall}/100</strong> while
                        Judge 2 rated it at <strong className="font-mono">{trace.judge2_overall}/100</strong> (Delta of{' '}
                        <span className="font-mono font-bold">{trace.judge_divergence_delta} points</span>). This scene was
                        automatically flagged for human editorial review on the Review Desk.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Dual Judges in Consensus</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Both Judge 1 and Judge 2 produced aligned rubric assessments with minimal variance. The final
                        weighted score of <strong className="font-mono">{trace.composite_score_100}/100</strong> reflects high
                        editorial agreement across all five evaluation dimensions.
                      </p>
                    </div>
                  )}

                  {trace.judge_notes && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                      <span className="font-bold text-slate-800 text-[11px]">Judge Composite Note:</span>
                      <p className="text-slate-600 font-mono text-[11px] leading-relaxed">
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
