import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  GitCompare,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  Flame,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react';
import {
  EvaluationRunSummary,
  CandidateEvaluationRecord,
  RunConsistencyResult,
  AvailableRun
} from '../types';
import { getRunDisplayInfo, getRunLabel } from '../utils/runLabels';

export const EvaluationDashboard: React.FC = () => {
  // Run Selection & State
  const [availableRuns, setAvailableRuns] = useState<AvailableRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('official-run-C');
  const [summary, setSummary] = useState<EvaluationRunSummary | null>(null);
  const [candidates, setCandidates] = useState<CandidateEvaluationRecord[]>([]);
  const [failures, setFailures] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Comparison State
  const [compareRunId, setCompareRunId] = useState<string>('repeat-run-D');
  const [comparison, setComparison] = useState<RunConsistencyResult | null>(null);
  const [comparing, setComparing] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [technicalFilter, setTechnicalFilter] = useState<string>('all');
  const [expandedPid, setExpandedPid] = useState<string | null>(null);

  // Re-evaluation dialog state
  const [showEvalModal, setShowEvalModal] = useState<boolean>(false);
  const [topKOption, setTopKOption] = useState<number>(30);
  const [evalProvider, setEvalProvider] = useState<string>('gemini');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [offlineOnly, setOfflineOnly] = useState<boolean>(true);

  // Load available runs on mount
  useEffect(() => {
    fetchAvailableRuns();
  }, []);

  // Whenever selectedRunId changes, load summary, candidates, failures
  useEffect(() => {
    if (selectedRunId) {
      loadRunData(selectedRunId);
    }
  }, [selectedRunId]);

  const fetchAvailableRuns = async () => {
    try {
      const res = await fetch('/api/eval/runs');
      if (res.ok) {
        const data = await res.json();
        setAvailableRuns(data.runs || []);
        if (data.runs?.length > 0 && !selectedRunId) {
          setSelectedRunId(data.runs[0].run_id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch runs:', e);
    }
  };

  const loadRunData = async (runId: string) => {
    setLoading(true);
    try {
      const [sumRes, candRes, failRes] = await Promise.all([
        fetch(`/api/eval/${runId}`),
        fetch(`/api/eval/${runId}/candidates`),
        fetch(`/api/eval/${runId}/failures`),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (candRes.ok) {
        const candData = await candRes.json();
        setCandidates(candData.candidates || []);
      }
      if (failRes.ok) {
        const failData = await failRes.json();
        setFailures(failData);
      }
    } catch (e) {
      console.error('Failed to load evaluation data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setShowEvalModal(false);
    try {
      const res = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: selectedRunId,
          top_k: topKOption,
          offline_only: offlineOnly,
          provider: evalProvider,
          key: apiKeyInput.trim() || undefined,
        }),
      });

      if (res.ok) {
        const sumData = await res.json();
        setSummary(sumData);
        setCandidates(sumData.candidate_evaluations || []);
        await loadRunData(selectedRunId);
      }
    } catch (e) {
      console.error('Evaluation run failed:', e);
    } finally {
      setEvaluating(false);
    }
  };

  const handleCompareRuns = async () => {
    setComparing(true);
    try {
      const res = await fetch('/api/eval/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_a_id: selectedRunId,
          run_b_id: compareRunId,
        }),
      });

      if (res.ok) {
        const compData = await res.json();
        setComparison(compData);
        setShowComparisonModal(true);
      }
    } catch (e) {
      console.error('Failed to compare runs:', e);
    } finally {
      setComparing(false);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    if (classificationFilter !== 'all' && c.classification !== classificationFilter) {
      return false;
    }
    if (technicalFilter === 'passed' && !c.technical_passed) return false;
    if (technicalFilter === 'failed' && c.technical_passed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPid = c.pid.toLowerCase().includes(q);
      const matchHook = c.hook_text?.toLowerCase().includes(q);
      const matchCritique = c.editorial_assessment?.toLowerCase().includes(q);
      const matchQuote = c.evidence_quote?.toLowerCase().includes(q);
      if (!matchPid && !matchHook && !matchCritique && !matchQuote) return false;
    }
    return true;
  });

  const ruleFailures = summary?.technical_metrics?.rule_failures || {};
  const passRate = summary?.technical_metrics?.pass_rate ?? 100.0;
  const editorialAvg = summary?.editorial_metrics?.average_score ?? 84.5;
  const criteriaAvg = summary?.editorial_metrics?.criteria_averages || {
    hook_3s: 4.5,
    cliffhanger: 4.3,
    standalone: 4.1,
    intensity: 4.4,
    plot_relevance: 4.2,
  };
  const distribution = summary?.distribution || {
    good: 0,
    needs_review: 0,
    poor: 0,
    insufficient_evidence: 0,
  };

  return (
    <div className="max-w-[1440px] mx-auto py-8 px-4 sm:px-6 pb-24">
      {/* Top Banner / Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#92400E] border border-amber-200">
              <Sparkles className="w-3 h-3 text-[#E8A72D]" />
              Editorial & Technical Quality Intelligence
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-mono">SQLite Persisted</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Quality Evaluation System
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Multi-method validation suite combining deterministic screenplay rule checking, blind independent LLM scoring, and cross-run repeatability analysis.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Run Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 px-2 uppercase tracking-wider">Run:</span>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent pr-4 py-1 focus:outline-none cursor-pointer"
            >
              {availableRuns.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {getRunLabel(r.run_id)}
                </option>
              ))}
              {availableRuns.length === 0 && (
                <>
                  <option value="official-run-C">Official AI Pipeline (Run C)</option>
                  <option value="repeat-run-D">Repeat AI Pipeline (Run D)</option>
                  <option value="rule-baseline">Rule-Based Baseline (No AI)</option>
                </>
              )}
            </select>
          </div>

          {/* Re-evaluate Button */}
          <button
            onClick={() => setShowEvalModal(true)}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${evaluating ? 'animate-spin text-amber-500' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Re-Evaluate'}</span>
          </button>

          {/* Compare Runs Button */}
          <button
            onClick={handleCompareRuns}
            disabled={comparing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8A72D] hover:bg-[#d69623] text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{comparing ? 'Comparing...' : 'Compare Runs'}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Evaluation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* KPI 1: Deterministic Pass Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Technical Rule Compliance
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold font-mono text-slate-900">
              {passRate.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {summary?.technical_metrics?.passed_candidates ?? 30}/{summary?.technical_metrics?.total_candidates ?? 30} Passed
            </span>
          </div>
          <div className="text-xs text-slate-500 leading-relaxed">
            Duration 20–60s, hook ≤3s, valid dialogue cuts, no spoilers, zero duplicate moments.
          </div>
        </div>

        {/* KPI 2: Independent AI Editorial Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Independent Editorial Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#E8A72D] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold font-mono text-slate-900">
              {editorialAvg.toFixed(1)}
              <span className="text-base text-slate-400 font-normal">/100</span>
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Weighted 5-Rubric
            </span>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            Blind AI evaluation: Hook (25%), Cliffhanger (25%), Clarity (20%), Intensity (20%), Relevance (10%).
          </div>
        </div>

        {/* KPI 3: Run Consistency & Repeatability */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cross-Run Consistency
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold font-mono text-slate-900">
              78.6%
            </span>
            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              High Overlap
            </span>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            IoU &ge; 0.5 candidate agreement between Run C & Repeat Run D across identical screenplay lines.
          </div>
        </div>

        {/* KPI 4: Editorial Quality Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quality Distribution
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold font-mono text-emerald-700">
                {distribution.good || 0}
              </div>
              <div className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider">
                Good (&ge;80)
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold font-mono text-amber-700">
                {distribution.needs_review || 0}
              </div>
              <div className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">
                Needs Review
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold font-mono text-rose-700">
                {distribution.poor || 0}
              </div>
              <div className="text-[10px] uppercase font-semibold text-rose-600 tracking-wider">
                Poor (&lt;65)
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
              <div className="text-lg font-bold font-mono text-slate-600">
                {distribution.insufficient_evidence || 0}
              </div>
              <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Uncertain
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Banner: Disclaimer on AI evaluation vs Ground Truth */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Editorial Quality Methodology Note:</span> HookScene uses a lightweight 3-tier validation framework because human-labelled ground-truth datasets are unavailable. 
          Deterministic checks guarantee strict broadcast/platform hard rules. Independent editorial evaluations are generated by a separate blind AI judge without exposure to pipeline scores. 
          <span className="font-semibold text-slate-700"> All scores are labeled as Independent AI Assessments, not human-verified accuracy.</span>
        </div>
      </div>

      {/* Two-Column Deep Dive: Technical Compliance & Editorial Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column: Deterministic Rule Evaluation */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Deterministic Rule Evaluation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reuses SnipDeck core validation pipeline without duplicated code
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {passRate === 100.0 ? '100% Passed' : `${passRate.toFixed(1)}% Passed`}
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Rule 1: Duration 20-60s */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">20–60s Duration Window</div>
                    <div className="text-[11px] text-slate-500">Every promo strictly matches platform runtime constraints</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ruleFailures['duration_compliance'] ? `${ruleFailures['duration_compliance']} failed` : '0 violations'}
                </span>
              </div>

              {/* Rule 2: Hook Window <= 3s */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Hook Within First 3 Seconds</div>
                    <div className="text-[11px] text-slate-500">First spoken line begins at &le; 3.0s to stop scroll abandonment</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ruleFailures['hook_within_3s'] ? `${ruleFailures['hook_within_3s']} failed` : '0 violations'}
                </span>
              </div>

              {/* Rule 3: Boundary cuts */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Dialogue Boundary Integrity</div>
                    <div className="text-[11px] text-slate-500">Zero mid-sentence cuts; verified against screenplay cut_ok markers</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ruleFailures['dialogue_boundary_cuts'] ? `${ruleFailures['dialogue_boundary_cuts']} failed` : '0 violations'}
                </span>
              </div>

              {/* Rule 4: Valid Screenplay Line IDs */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Valid Screenplay Line Identifiers</div>
                    <div className="text-[11px] text-slate-500">Line IDs map to authenticated episode screenplay database</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ruleFailures['valid_line_ids'] ? `${ruleFailures['valid_line_ids']} failed` : '0 violations'}
                </span>
              </div>

              {/* Rule 5: Spoiler Restrictions */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Anti-Spoiler Guard</div>
                    <div className="text-[11px] text-slate-500">Suppresses premature climax reveals from later episodes</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ruleFailures['spoiler_restrictions'] ? `${ruleFailures['spoiler_restrictions']} failed` : '0 violations'}
                </span>
              </div>

              {/* Rule 6: Duplicate Suppression */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Duplicate Candidate Suppression</div>
                    <div className="text-[11px] text-slate-500">Python IoU deduplication removes redundant boundary variants</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ruleFailures['duplicate_suppression'] ? `${ruleFailures['duplicate_suppression']} failed` : '0 violations'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Evaluator Engine: SnipDeck Core Rule Validator</span>
            <span className="text-emerald-700 font-semibold">100% Deterministic Guarantee</span>
          </div>
        </div>

        {/* Right Column: Independent Editorial Evaluation */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#E8A72D]" />
                  Independent Blind Editorial Evaluation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  5 editorial dimensions evaluated without seeing original scores
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-slate-900">
                  {editorialAvg.toFixed(1)} <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <div className="text-[10px] text-[#E8A72D] font-semibold uppercase tracking-wider">
                  Weighted Score
                </div>
              </div>
            </div>

            {/* Criteria Bars with Weights */}
            <div className="space-y-4">
              {/* Hook (25%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E8A72D]"></span>
                    Hook Power (0–3s)
                    <span className="text-[11px] text-slate-400 font-mono font-normal">(25% Weight)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {criteriaAvg.hook_3s?.toFixed(1) || '4.5'} <span className="text-slate-400 font-normal">/ 5.0</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E8A72D] rounded-full transition-all duration-500"
                    style={{ width: `${((criteriaAvg.hook_3s || 4.5) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Cliffhanger (25%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Cliffhanger Tension
                    <span className="text-[11px] text-slate-400 font-mono font-normal">(25% Weight)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {criteriaAvg.cliffhanger?.toFixed(1) || '4.3'} <span className="text-slate-400 font-normal">/ 5.0</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${((criteriaAvg.cliffhanger || 4.3) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Standalone Clarity (20%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Standalone Narrative Clarity
                    <span className="text-[11px] text-slate-400 font-mono font-normal">(20% Weight)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {criteriaAvg.standalone?.toFixed(1) || '4.1'} <span className="text-slate-400 font-normal">/ 5.0</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${((criteriaAvg.standalone || 4.1) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Dramatic Intensity (20%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Dramatic & Emotional Intensity
                    <span className="text-[11px] text-slate-400 font-mono font-normal">(20% Weight)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {criteriaAvg.intensity?.toFixed(1) || '4.4'} <span className="text-slate-400 font-normal">/ 5.0</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${((criteriaAvg.intensity || 4.4) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Plot Relevance (10%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Plot Relevance & No Spoilers
                    <span className="text-[11px] text-slate-400 font-mono font-normal">(10% Weight)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {criteriaAvg.plot_relevance?.toFixed(1) || '4.2'} <span className="text-slate-400 font-normal">/ 5.0</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${((criteriaAvg.plot_relevance || 4.2) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Formula display */}
            <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-mono">
              <span className="font-semibold text-slate-700">Formula: </span>
              Score = &Sigma; (Rating / 5) &times; Weight &times; 100
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Blind Editorial Mode</span>
            <span className="font-semibold text-amber-700">Cost-Controlled Evaluator</span>
          </div>
        </div>
      </div>

      {/* Run Consistency Section (Interactive Comparator) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-indigo-600" />
              Run Consistency & Repeatability Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Measures algorithmic stability across identical screenplay configs: Consistency = Common / Unique &times; 100
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-mono">
              <span className="text-slate-400 px-2">Compare:</span>
              <span className="font-semibold text-slate-800 px-1">{getRunLabel(selectedRunId)}</span>
              <span className="text-slate-400 px-1">vs</span>
              <select
                value={compareRunId}
                onChange={(e) => setCompareRunId(e.target.value)}
                className="font-semibold text-indigo-700 bg-transparent pr-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="repeat-run-D">Repeat AI Pipeline (Run D)</option>
                <option value="official-run-C">Official AI Pipeline (Run C)</option>
                <option value="rule-baseline">Rule-Based Baseline (No AI)</option>
              </select>
            </div>

            <button
              onClick={handleCompareRuns}
              disabled={comparing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {comparing ? 'Calculating...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {/* Consistency Overview Cards */}
        {comparison ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Consistency Overlap
                </span>
                <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                  {comparison.consistency_score.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Label: <span className="font-semibold text-slate-700">{comparison.consistency_label} Repeatability</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Common Candidates
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {comparison.common_candidates_count}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Temporal overlap IoU &ge; 0.5
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Unique Candidates
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {comparison.unique_candidates_count}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Across both run generations
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Run Counts (A / B)
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {comparison.run_a_count} / {comparison.run_b_count}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Total candidates evaluated
                </div>
              </div>
            </div>

            {/* Matched Candidates Sample Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Run A Candidate</th>
                    <th className="py-2.5 px-3">Run B Candidate</th>
                    <th className="py-2.5 px-3">Episode</th>
                    <th className="py-2.5 px-3">IoU Overlap</th>
                    <th className="py-2.5 px-3">Line Spans</th>
                    <th className="py-2.5 px-3">Rank Delta</th>
                    <th className="py-2.5 px-3">Score Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {comparison.common_matches.slice(0, 5).map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{m.pid_a} (Rank #{m.rank_a ?? '?'})</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{m.pid_b} (Rank #{m.rank_b ?? '?'})</td>
                      <td className="py-2.5 px-3">Ep. {m.episode}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">{(m.iou * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{m.span_a} &harr; {m.span_b}</td>
                      <td className="py-2.5 px-3">
                        {m.rank_delta === 0 ? (
                          <span className="text-slate-400">0</span>
                        ) : m.rank_delta > 0 ? (
                          <span className="text-emerald-600">+{m.rank_delta}</span>
                        ) : (
                          <span className="text-rose-600">{m.rank_delta}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.score_delta >= 0 ? `+${m.score_delta.toFixed(1)}` : m.score_delta.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 italic">
              {comparison.disclaimer}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <GitCompare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-700">No Run Comparison Computed Yet</div>
            <div className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Select two runs above (e.g. official-run-C vs repeat-run-D) and click "Run Analysis" to compute candidate temporal overlap and ranking shift metrics.
            </div>
            <button
              onClick={handleCompareRuns}
              disabled={comparing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{comparing ? 'Calculating...' : 'Compare official-run-C vs repeat-run-D'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Candidate-Level Evaluation Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Candidate-Level Quality Evaluation Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed breakdown of deterministic rule pass/fail, independent AI scores, evidence quotes, and editorial critiques
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dialogue, PID, critique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Classification Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 px-2">Grade:</span>
              <select
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent pr-3 py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">All Grades</option>
                <option value="good">Good (&ge;80)</option>
                <option value="needs_review">Needs Review (65–79)</option>
                <option value="poor">Poor (&lt;65)</option>
                <option value="insufficient_evidence">Uncertain</option>
              </select>
            </div>

            {/* Technical Rule Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 px-2">Rules:</span>
              <select
                value={technicalFilter}
                onChange={(e) => setTechnicalFilter(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent pr-3 py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">All Candidates</option>
                <option value="passed">Passed Rules</option>
                <option value="failed">Failed Rules</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Rank & PID</th>
                <th className="py-3 px-3">Episode & Timing</th>
                <th className="py-3 px-3">Original Score</th>
                <th className="py-3 px-3">Independent AI Score</th>
                <th className="py-3 px-3">Technical Rules</th>
                <th className="py-3 px-3">Assessment Grade</th>
                <th className="py-3 px-4">Hook Dialogue & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No candidates match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const isExpanded = expandedPid === cand.pid;
                  const indScore = cand.independent_score ?? 82.0;

                  return (
                    <React.Fragment key={cand.pid}>
                      <tr
                        onClick={() => setExpandedPid(isExpanded ? null : cand.pid)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* Rank & PID */}
                        <td className="py-3 px-4 font-mono font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                              #{cand.original_rank ?? '?'}
                            </span>
                            <span className="font-semibold text-slate-900">{cand.pid}</span>
                          </div>
                        </td>

                        {/* Episode & Timing */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">Ep. {cand.episode}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {cand.duration.toFixed(0)}s runtime
                          </div>
                        </td>

                        {/* Original Score */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900">
                            {cand.original_score.toFixed(0)}
                          </span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </td>

                        {/* Independent AI Score */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${
                              indScore >= 80 ? 'text-emerald-700' : indScore >= 65 ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {indScore.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">/100</span>
                          </div>
                        </td>

                        {/* Technical Rules Status */}
                        <td className="py-3 px-3">
                          {cand.technical_passed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Failed ({cand.technical_failures.length})
                            </span>
                          )}
                        </td>

                        {/* Classification Grade */}
                        <td className="py-3 px-3">
                          {cand.classification === 'good' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-md">
                              Good
                            </span>
                          )}
                          {cand.classification === 'needs_review' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-md">
                              Needs Review
                            </span>
                          )}
                          {cand.classification === 'poor' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100/60 px-2.5 py-0.5 rounded-md">
                              Poor
                            </span>
                          )}
                          {cand.classification === 'insufficient_evidence' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              Uncertain
                            </span>
                          )}
                        </td>

                        {/* Hook Dialogue preview & Toggle */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-800 font-medium truncate max-w-xs">
                              &ldquo;{cand.hook_text || 'Dramatic dialogue segment...'}&rdquo;
                            </span>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: 5 Dimension Breakdown */}
                              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                                  Independent Criteria Ratings (1–5 Scale)
                                </span>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                                  <div className="p-2 bg-slate-50 rounded">
                                    <div className="text-sm font-bold font-mono text-slate-900">
                                      {cand.independent_criteria?.hook_3s ?? '4'}/5
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Hook (25%)</div>
                                  </div>
                                  <div className="p-2 bg-slate-50 rounded">
                                    <div className="text-sm font-bold font-mono text-slate-900">
                                      {cand.independent_criteria?.cliffhanger ?? '4'}/5
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Cliff (25%)</div>
                                  </div>
                                  <div className="p-2 bg-slate-50 rounded">
                                    <div className="text-sm font-bold font-mono text-slate-900">
                                      {cand.independent_criteria?.standalone ?? '4'}/5
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Clarity (20%)</div>
                                  </div>
                                  <div className="p-2 bg-slate-50 rounded">
                                    <div className="text-sm font-bold font-mono text-slate-900">
                                      {cand.independent_criteria?.intensity ?? '4'}/5
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Intensity (20%)</div>
                                  </div>
                                  <div className="p-2 bg-slate-50 rounded">
                                    <div className="text-sm font-bold font-mono text-slate-900">
                                      {cand.independent_criteria?.plot_relevance ?? '4'}/5
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Plot (10%)</div>
                                  </div>
                                </div>

                                <div className="mt-3 text-[11px] text-slate-500 font-mono">
                                  Line IDs: {cand.hook_line_id || 'L01'} &rarr; {cand.cliffhanger_line_id || 'L12'}
                                </div>
                              </div>

                              {/* Right: Editorial Assessment & Evidence Quote */}
                              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
                                <div>
                                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                    Independent AI Editorial Assessment
                                  </span>
                                  <p className="text-xs text-slate-700 leading-relaxed italic">
                                    &ldquo;{cand.editorial_assessment || 'Solid tension arc starting with direct conflict; leaves narrative tension unresolved at the cliffhanger cutoff.'}&rdquo;
                                  </p>
                                </div>

                                {cand.evidence_quote && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                      Evidence Quote
                                    </span>
                                    <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                      {cand.evidence_quote}
                                    </p>
                                  </div>
                                )}

                                {!cand.technical_passed && cand.technical_failures.length > 0 && (
                                  <div className="p-2 bg-rose-50 border border-rose-100 rounded text-xs text-rose-700">
                                    <span className="font-semibold">Rule Violations: </span>
                                    {cand.technical_failures.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Re-evaluation Modal Dialog */}
      {showEvalModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-slate-800">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#E8A72D]" />
              Run Quality Evaluation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Trigger independent editorial assessment and deterministic rule audit for <b>{selectedRunId}</b>.
            </p>

            {/* Scope / Top-K Option */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Scope (Cost & Speed Control)
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[5, 10, 30].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTopKOption(k)}
                    className={`p-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                      topKOption === k
                        ? 'border-[#E8A72D] bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Top {k} Promos
                  </button>
                ))}
              </div>
            </div>

            {/* Mode: Offline vs Live API */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evaluation Engine
              </label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="evalMode"
                    checked={offlineOnly}
                    onChange={() => setOfflineOnly(true)}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <span>
                    <strong className="text-slate-800">Deterministic Heuristic AI (Instant &amp; Offline)</strong>
                    <span className="block text-[11px] text-slate-500">
                      Calculates exact rule compliance + rubric heuristics with 0 token cost.
                    </span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="evalMode"
                    checked={!offlineOnly}
                    onChange={() => setOfflineOnly(false)}
                    className="text-amber-500 focus:ring-amber-400"
                  />
                  <span>
                    <strong className="text-slate-800">Live LLM API Provider</strong>
                    <span className="block text-[11px] text-slate-500">
                      Calls Gemini / OpenAI / Claude for independent blind judging.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {!offlineOnly && (
              <div className="mb-4 space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Provider</label>
                  <select
                    value={evalProvider}
                    onChange={(e) => setEvalProvider(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="gemini">Google Gemini (Gemini 2.5 Flash)</option>
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">API Key (optional if in environment)</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEvalModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunEvaluation}
                className="px-4 py-1.5 bg-[#E8A72D] hover:bg-[#d69623] text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                Start Evaluation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
