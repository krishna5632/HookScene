// Centralized human-friendly run labels, badges, and contextual descriptions
// Ensures reviewers and evaluators immediately understand what each run represents.

export interface RunDisplayInfo {
  id: string;
  label: string;
  shortLabel: string;
  badge: string;
  badgeClass: string;
  description: string;
  engine: string;
}

export const RUN_DEFINITIONS: Record<string, RunDisplayInfo> = {
  'official-run-C': {
    id: 'official-run-C',
    label: 'Official AI Pipeline (Run C)',
    shortLabel: 'Official AI (C)',
    badge: 'Gold Standard',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Primary benchmark across 50 episodes with full Gemini AI multi-signal scoring, spoiler suppression, and dual-judge validation.',
    engine: 'Gemini Flash AI + Dual Judge',
  },
  'repeat-run-D': {
    id: 'repeat-run-D',
    label: 'Repeat AI Pipeline (Run D)',
    shortLabel: 'Repeat AI (D)',
    badge: 'Stability Test',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Independent re-execution on identical episodes to measure reproducibility, candidate overlap, and score drift.',
    engine: 'Gemini Flash AI (Independent Repeat)',
  },
  'rule-baseline': {
    id: 'rule-baseline',
    label: 'Rule-Based Baseline (No AI)',
    shortLabel: 'Rule Baseline (No AI)',
    badge: 'Keyword Heuristic',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Traditional heuristic regex & keyword baseline without LLMs, used to verify AI lift in blind A/B evaluations.',
    engine: 'Rule Heuristic (No LLM)',
  },
  'run_latest': {
    id: 'run_latest',
    label: 'Latest Studio Run',
    shortLabel: 'Latest Studio',
    badge: 'Custom Execution',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Most recently generated pipeline run from the interactive Run Studio.',
    engine: 'Active Studio Engine',
  },
};

export const getRunDisplayInfo = (runId: string): RunDisplayInfo => {
  if (RUN_DEFINITIONS[runId]) {
    return RUN_DEFINITIONS[runId];
  }
  return {
    id: runId,
    label: `Custom Run (${runId})`,
    shortLabel: runId,
    badge: 'Custom Run',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    description: `Pipeline run execution: ${runId}`,
    engine: 'Configured Engine',
  };
};

export const getRunLabel = (runId: string): string => {
  return getRunDisplayInfo(runId).label;
};

export const getRunShortLabel = (runId: string): string => {
  return getRunDisplayInfo(runId).shortLabel;
};

export const getRunComparisonContext = (runA: string, runB: string): string => {
  if (runA === runB) {
    return 'Self-comparison: verifying 100% deterministic baseline consistency';
  }
  if (runB === 'rule-baseline' || runA === 'rule-baseline') {
    return 'A/B Benchmark: comparing HookScene AI against traditional non-AI keyword heuristics';
  }
  if (
    (runA === 'official-run-C' && runB === 'repeat-run-D') ||
    (runA === 'repeat-run-D' && runB === 'official-run-C')
  ) {
    return 'Reproducibility Verification: measuring stability and score drift across independent AI passes';
  }
  return 'Cross-Run Comparison: analyzing candidate overlap, temporal shift, and ranking agreement';
};
