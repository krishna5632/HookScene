import React, { useState, useEffect } from 'react';
import { PerformanceCostSummary, StagePerformanceRecord } from '../types';
import {
  Clock,
  Cpu,
  Layers,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  TrendingDown,
  Info,
  Server,
  ArrowRight,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

interface PerformanceCostSectionProps {
  availableRuns?: string[];
  activeRunId?: string;
}

export const PerformanceCostSection: React.FC<PerformanceCostSectionProps> = ({
  availableRuns = ['official-run-C', 'repeat-run-D', 'rule-baseline'],
  activeRunId = 'official-run-C',
}) => {
  const [selectedRun, setSelectedRun] = useState<string>(activeRunId);
  const [summary, setSummary] = useState<PerformanceCostSummary | null>(null);
  const [allRuns, setAllRuns] = useState<PerformanceCostSummary[]>([]);
  const [pricingRates, setPricingRates] = useState<Record<string, { input: number; output: number }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricing();
    fetchAllRuns();
  }, []);

  useEffect(() => {
    if (selectedRun) {
      fetchSummary(selectedRun);
    }
  }, [selectedRun]);

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/performance/pricing');
      if (res.ok) {
        const data = await res.json();
        setPricingRates(data.pricing || {});
      }
    } catch (e) {
      console.error('Failed to load pricing config:', e);
    }
  };

  const fetchAllRuns = async () => {
    try {
      const res = await fetch('/api/performance/runs');
      if (res.ok) {
        const data = await res.json();
        setAllRuns(data.runs || []);
      }
    } catch (e) {
      console.error('Failed to load all performance runs:', e);
    }
  };

  const fetchSummary = async (runId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/performance/summary?run_id=${encodeURIComponent(runId)}`);
      if (res.ok) {
        const data: PerformanceCostSummary = await res.json();
        setSummary(data);
      } else {
        setError(`Could not fetch performance data for ${runId}`);
      }
    } catch (e: any) {
      setError(e.message || 'Network error fetching performance summary');
    } finally {
      setLoading(false);
    }
  };

  const stageColorMap: Record<string, { bg: string; text: string; bar: string }> = {
    summary: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    candidates: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
    validate: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    score: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
    rank: { bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
    montage: { bg: 'bg-pink-50', text: 'text-pink-700', bar: 'bg-pink-500' },
    export: { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500' },
  };

  const formatCost = (val?: number | null) => {
    if (val === undefined || val === null) return 'Unavailable';
    if (val === 0) return '$0.0000 (Free)';
    return `$${val.toFixed(4)}`;
  };

  const formatTokens = (val?: number | null) => {
    if (val === undefined || val === null) return 'N/A';
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 mb-8 transition-all hover:shadow-md">
      {/* Header with Title, Badge, and Run Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-800 border border-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Feature 5 · Performance & Resource Telemetry
            </span>
            <span className="text-xs text-slate-600 hidden sm:inline">
              Pipeline Benchmarks & Token Cost Accounting
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            Performance, Cost & Resource Monitoring
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-800">Target Run:</span>
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
            >
              {availableRuns.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              fetchSummary(selectedRun);
              fetchAllRuns();
              fetchPricing();
            }}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-600 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mb-2" />
          <span>Collecting telemetry and cost metrics...</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-rose-700 text-sm font-medium">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-600" />
          {error}
        </div>
      ) : summary ? (
        <div className="space-y-6 mt-5">
          {/* 5 High-Impact Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Processing Time */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
                <span>Total Processing Time</span>
                <Clock className="w-4 h-4 text-blue-700" />
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {summary.total_duration_s.toFixed(2)}s
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span>Slowest:</span>
                <span className="font-semibold text-amber-800 capitalize">
                  {summary.slowest_stage || 'N/A'} ({(summary.stage_durations[summary.slowest_stage || ''] || 0).toFixed(1)}s)
                </span>
              </div>
            </div>

            {/* 2. Total LLM API Calls */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
                <span>Total LLM Calls</span>
                <Cpu className="w-4 h-4 text-amber-700" />
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {summary.total_llm_calls}
                </span>
                <span className="text-xs text-slate-600 ml-1.5 font-sans">requests</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span>Retries / Fallbacks:</span>
                <span className="font-semibold font-mono text-slate-900">
                  {summary.total_retries} / {summary.total_fallbacks}
                </span>
              </div>
            </div>

            {/* 3. Token Consumption */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
                <span>Token Consumption</span>
                <Layers className="w-4 h-4 text-purple-700" />
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {formatTokens(summary.total_tokens)}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-1.5 font-mono">
                <span>In: {summary.total_prompt_tokens.toLocaleString()}</span>
                <span>Out: {summary.total_completion_tokens.toLocaleString()}</span>
              </div>
            </div>

            {/* 4. Estimated API Cost */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
                <span>Estimated API Cost</span>
                <DollarSign className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-800">
                  {formatCost(summary.total_estimated_cost_usd)}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ESTIMATE
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 truncate border-t border-slate-200/60 pt-1.5">
                <span>Configured $/1M Pricing</span>
              </div>
            </div>

            {/* 5. Pipeline Reliability */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-1">
                <span>Pipeline Reliability</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {summary.stage_records.filter((s) => s.status === 'completed').length} /{' '}
                  {summary.stage_records.length}
                </span>
                <span className="text-xs text-slate-600 ml-1.5 font-sans">Stages</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                <span>Failed Calls:</span>
                <span className={`font-semibold font-mono ${summary.failed_calls_count > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                  {summary.failed_calls_count}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Execution Time Proportional Bar */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                Pipeline Stage Execution Time Proportions
              </span>
              <span className="text-slate-600 font-mono">
                Total: {summary.total_duration_s.toFixed(2)}s
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-4 w-full bg-slate-200 rounded-lg overflow-hidden flex shadow-inner">
              {summary.stage_records.map((st, i) => {
                const pct = summary.total_duration_s > 0 ? (st.duration_s / summary.total_duration_s) * 100 : 0;
                if (pct <= 0) return null;
                const colors = stageColorMap[st.stage_name] || { bar: 'bg-slate-500' };
                return (
                  <div
                    key={i}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                    className={`${colors.bar} h-full relative group transition-all hover:opacity-90`}
                    title={`${st.stage_name}: ${st.duration_s}s (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-700">
              {summary.stage_records.map((st, i) => {
                const colors = stageColorMap[st.stage_name] || { bar: 'bg-slate-500' };
                const pct = summary.total_duration_s > 0 ? (st.duration_s / summary.total_duration_s) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${colors.bar}`} />
                    <span className="capitalize font-medium text-slate-800">{st.stage_name}:</span>
                    <span className="font-mono text-slate-700 font-semibold">{st.duration_s.toFixed(2)}s</span>
                    <span className="text-[11px] text-slate-600">({pct.toFixed(1)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage Details Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Stage Execution & Resource Breakdown
              </span>
              <span className="text-[11px] text-slate-600">
                Precision: Microsecond timer (`time.perf_counter`)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Stage Name</th>
                    <th className="py-2.5 px-3">Execution Time</th>
                    <th className="py-2.5 px-3">Share</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Model / Strategy</th>
                    <th className="py-2.5 px-3">Tokens (In / Out)</th>
                    <th className="py-2.5 px-3">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {summary.stage_records.map((rec, idx) => {
                    const pct = summary.total_duration_s > 0 ? (rec.duration_s / summary.total_duration_s) * 100 : 0;
                    const stageLlm = summary.stage_llm_summary?.[rec.stage_name];
                    const isSlowest = rec.stage_name === summary.slowest_stage;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 capitalize flex items-center gap-1.5">
                          {rec.stage_name}
                          {isSlowest && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-normal">
                              Slowest
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium">{rec.duration_s.toFixed(3)}s</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{pct.toFixed(1)}%</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'skipped'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                          {stageLlm?.model || (rec.details?.note ? String(rec.details.note) : 'Rule Engine')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {stageLlm ? (
                            <span>
                              {stageLlm.prompt_tokens?.toLocaleString() || 0} /{' '}
                              {stageLlm.completion_tokens?.toLocaleString() || 0}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-800">
                          {stageLlm?.estimated_cost_usd !== undefined
                            ? `$${stageLlm.estimated_cost_usd.toFixed(4)}`
                            : summary.run_id === 'rule-baseline'
                            ? '$0.0000'
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-Run Performance & Cost Comparison Table */}
          {allRuns.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
              <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-700" />
                  Cross-Run Performance & Cost Comparison
                </span>
                <span className="text-[11px] text-slate-600">
                  {allRuns.length} recorded run benchmarks
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Run Identifier</th>
                      <th className="py-2.5 px-3">Total Time</th>
                      <th className="py-2.5 px-3">LLM Calls</th>
                      <th className="py-2.5 px-3">Tokens</th>
                      <th className="py-2.5 px-3">Est. Cost (USD)</th>
                      <th className="py-2.5 px-3">Slowest Stage</th>
                      <th className="py-2.5 px-3">Retries / Fallbacks</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {allRuns.map((r, i) => {
                      const isCurrent = r.run_id === selectedRun;
                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCurrent ? 'bg-amber-50/40 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            {r.run_id}
                            {isCurrent && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-sans font-normal">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{r.total_duration_s.toFixed(2)}s</td>
                          <td className="py-2.5 px-3 font-mono">{r.total_llm_calls}</td>
                          <td className="py-2.5 px-3 font-mono">{formatTokens(r.total_tokens)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                            {formatCost(r.total_estimated_cost_usd)}
                          </td>
                          <td className="py-2.5 px-3 capitalize font-mono text-slate-700">
                            {r.slowest_stage || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {r.total_retries} / {r.total_fallbacks}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => setSelectedRun(r.run_id)}
                              className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                            >
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rate Card & Transparent Cost Calculation Footer */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-4 h-4 text-slate-600" />
              Configurable Pricing & Cost Calculation Methodology
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              API cost calculation is derived strictly from reported provider response usage tokens
              (`prompt_tokens` and `completion_tokens`) using the formula:{' '}
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold text-slate-900">
                Cost = (Prompt Tokens / 1M × P_input) + (Completion Tokens / 1M × P_output)
              </span>
              . No token counts are estimated or fabricated when provider usage metadata is absent. Costs are clearly labelled as estimates.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/70 text-[11px]">
              <span className="font-semibold text-slate-800">Active Rate Card:</span>
              {Object.entries(pricingRates).slice(0, 5).map(([mod, rates], idx) => (
                <span key={idx} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-mono">
                  {mod}: ${rates.input}/1M in, ${rates.output}/1M out
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
