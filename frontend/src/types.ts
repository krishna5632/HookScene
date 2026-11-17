export interface Segment {
  episode: number;
  start: number;
  end: number;
  text?: string;
  source_episode?: number;
}

export interface Promo {
  pid: string;
  rank: number;
  kind?: 'single' | 'montage';
  duration: number;
  hook: { text: string; line_id?: string; start?: number } | string;
  cliffhanger: { text: string; line_id?: string; end?: number } | string;
  hook_line_id?: string;
  cliffhanger_line_id?: string;
  open_question?: string;
  why?: string;
  rank_reason?: string;
  primary_signal?: 'conflict' | 'surprise' | 'emotion' | 'suspense' | 'action' | 'relationship' | string;
  signal_intensity?: number;
  signals_detected?: string[];
  segments: Segment[];
  scores?: Record<string, number>;
  composite?: number;
  score_100?: number;
  criteria_ratings?: Record<string, number>;
  criteria_weights?: Record<string, number>;
  judge_divergence?: {
    is_divergent?: boolean;
    judge1_score?: number;
    judge2_score?: number;
    differing_criteria?: string[];
    total_delta?: number;
    [key: string]: any;
  };
  duplicate_variants_count?: number;
  duplicate_notes?: string[];
  attention?: {
    hook_attention?: number;
    hold?: number;
    drop_risk?: number;
  };
  flags?: Record<string, boolean>;
  excerpt?: string[];
  transcript_excerpt?: any[];
  decision?: 'approved' | 'rejected';
}

export interface Dataset {
  show: string;
  run_id?: string;
  promos: Promo[];
  montages: Promo[];
  all_candidates?: Promo[];
  episode_durations?: Record<string | number, number>;
  run_log?: {
    mode?: string;
    episodes?: number;
    lines?: number;
    seconds?: number;
    profile?: string;
    candidates_valid?: number;
    [key: string]: any;
  };
  show_summary?: {
    logline?: string;
    summary?: string;
    genre?: string[];
    spoilers?: string[];
    [key: string]: any;
  };
}

export type ActiveTab =
  | 'review'
  | 'run'
  | 'analytics'
  | 'method'
  | 'evaluation'
  | 'f1_quality'
  | 'f2_failures'
  | 'f3_consistency'
  | 'f4_testing'
  | 'f5_performance'
  | 'f6_explainability';

export interface RuleFailure {
  pid: string;
  rule: string;
  message: string;
  episode?: number;
}

export interface RuleEvaluationResult {
  total_candidates: number;
  passed_candidates: number;
  failed_candidates: number;
  pass_rate: number;
  rule_failures: Record<string, number>;
  failures_list: RuleFailure[];
}

export interface CandidateEvaluationRecord {
  pid: string;
  episode: number;
  original_score: number;
  original_rank?: number;
  technical_passed: boolean;
  technical_failures: string[];
  independent_score?: number;
  independent_criteria: Record<string, number>;
  classification: 'good' | 'needs_review' | 'poor' | 'insufficient_evidence';
  editorial_assessment: string;
  evidence_quote: string;
  duration: number;
  hook_line_id: string;
  cliffhanger_line_id: string;
  hook_text: string;
  cliffhanger_text: string;
}

export interface EditorialMetricsSummary {
  average_score: number;
  evaluated_count: number;
  criteria_averages: Record<string, number>;
  weights_used: Record<string, number>;
  disclaimer: string;
}

export interface CandidateMatch {
  pid_a: string;
  pid_b: string;
  episode: number;
  iou: number;
  span_a: string;
  span_b: string;
  rank_a?: number;
  rank_b?: number;
  score_a: number;
  score_b: number;
  rank_delta: number;
  score_delta: number;
}

export interface RankingChange {
  pid: string;
  episode: number;
  rank_run_a?: number;
  rank_run_b?: number;
  rank_delta: number;
  direction: 'improved' | 'dropped' | 'unchanged' | 'exclusive';
}

export interface RunConsistencyResult {
  run_a_id: string;
  run_b_id: string;
  run_a_count: number;
  run_b_count: number;
  common_candidates_count: number;
  unique_candidates_count: number;
  consistency_score: number;
  common_matches: CandidateMatch[];
  ranking_changes: RankingChange[];
  consistency_label: string;
  disclaimer: string;
}

export interface EvaluationRunSummary {
  evaluation_id: string;
  run_id: string;
  show_title: string;
  created_at: string;
  is_independent_assessment: boolean;
  technical_metrics: RuleEvaluationResult;
  editorial_metrics: EditorialMetricsSummary;
  distribution: {
    good: number;
    needs_review: number;
    poor: number;
    insufficient_evidence: number;
  };
  candidate_evaluations: CandidateEvaluationRecord[];
}

export interface AvailableRun {
  run_id: string;
  show_title: string;
  file_path: string;
  is_evaluated: boolean;
  summary?: any;
}

export interface FailureRecord {
  id?: number;
  run_id: string;
  candidate_id: string;
  episode?: number;
  category: string;
  category_label: string;
  description: string;
  source: 'automatic_validation' | 'ai_evaluation' | 'human_review';
  reviewer_comment?: string;
  created_at?: string;
}

export interface FailureAnalysisSummary {
  total_evaluated: number;
  total_rejected: number;
  automatic_validation_count: number;
  human_review_count: number;
  ai_evaluation_count: number;
  category_distribution: Record<string, number>;
  most_common_reasons: Array<{ reason: string; count: number }>;
  breakdown_by_run: Record<string, { automatic: number; human: number; ai: number; total: number }>;
  failures: FailureRecord[];
}

export interface RunMetadata {
  run_id: string;
  show_title: string;
  screenplay_hash: string;
  model_provider: string;
  model_version: string;
  prompt_version: string;
  pipeline_version: string;
  temperature?: number;
  generation_settings: Record<string, any>;
  candidate_ids: string[];
  candidate_time_ranges: Record<string, [number, number]>;
  candidate_scores: Record<string, number>;
  candidate_rankings: Record<string, number>;
  total_candidates: number;
  status: string;
  created_at?: string;
}

export interface CandidateMatchDetail {
  pid_a: string;
  pid_b: string;
  episode: number;
  iou: number;
  span_a: string;
  span_b: string;
  start_a: number;
  end_a: number;
  start_b: number;
  end_b: number;
  delta_start: number;
  delta_end: number;
  rank_a?: number;
  rank_b?: number;
  score_a: number;
  score_b: number;
  rank_delta: number;
  score_delta: number;
}

export interface DetailedRunComparison {
  run_a_id: string;
  run_b_id: string;
  run_a_metadata?: RunMetadata;
  run_b_metadata?: RunMetadata;
  config_differs: boolean;
  config_diff_reasons: string[];
  run_a_count: number;
  run_b_count: number;
  common_count: number;
  unique_count: number;
  jaccard_consistency: number;
  avg_score_diff: number;
  spearman_rank_correlation?: number;
  spearman_note: string;
  common_candidates: CandidateMatchDetail[];
  new_candidates: Array<{ pid: string; episode: number; rank?: number; score: number; duration: number; hook: string }>;
  missing_candidates: Array<{ pid: string; episode: number; rank?: number; score: number; duration: number; hook: string }>;
  disclaimer: string;
}

export interface TestCaseCategory {
  id: string;
  name: string;
  suite_file: string;
  total: number;
  passed: number;
  failed: number;
  status: 'passed' | 'failed';
  description: string;
  tests: string[];
}

export interface TestSuiteSummary {
  status: 'passed' | 'failed';
  total_executed: number;
  passed: number;
  failed: number;
  skipped: number;
  pass_rate: number;
  execution_time_s: number;
  timestamp: string;
  test_files_count: number;
  categories: TestCaseCategory[];
}

// --- FEATURE 5: PERFORMANCE, COST & RESOURCE MONITORING TYPES ---

export interface StagePerformanceRecord {
  stage_name: string;
  duration_s: number;
  status: 'completed' | 'failed' | 'skipped';
  started_at?: string;
  ended_at?: string;
  error_msg?: string;
  details?: Record<string, any>;
}

export interface LLMCallRecord {
  call_id: string;
  stage: string;
  provider: string;
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  thinking_tokens?: number;
  total_tokens?: number;
  duration_s: number;
  status: 'success' | 'error' | 'timeout';
  retry_count: number;
  is_fallback: boolean;
  fallback_model?: string;
  cached: boolean;
  estimated_cost_usd?: number;
  cost_available: boolean;
  error_msg?: string;
  timestamp?: string;
}

export interface PerformanceCostSummary {
  run_id: string;
  total_duration_s: number;
  stage_durations: Record<string, number>;
  stage_records: StagePerformanceRecord[];
  slowest_stage?: string;
  fastest_stage?: string;
  avg_stage_duration_s: number;
  total_llm_calls: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  tokens_available: boolean;
  total_estimated_cost_usd?: number;
  cost_available: boolean;
  cost_disclaimer: string;
  total_retries: number;
  total_fallbacks: number;
  failed_calls_count: number;
  stage_llm_summary: Record<string, any>;
  calls?: LLMCallRecord[];
}

// --- FEATURE 6: EXPLAINABILITY & DECISION TRACEABILITY TYPES ---

export interface DramaticSignalTrace {
  signal: string;
  label: string;
  detected: boolean;
  intensity: number;
  trigger_reason: string;
  evidence_quote: string;
  line_id?: string;
  line_number?: number;
}

export interface RubricCriterionExplanation {
  key: string;
  label: string;
  weight_pct: number;
  final_score: number;
  weighted_points: number;
  judge1_score?: number | null;
  judge2_score?: number | null;
  explanation: string;
  evidence: string;
  status: 'available' | 'unavailable';
}

export interface ValidationRuleCheck {
  rule_id: string;
  name: string;
  status: 'passed' | 'failed' | 'not_evaluated';
  actual_value: string;
  threshold: string;
  explanation: string;
}

export interface ScreenplayEvidenceItem {
  kind: 'hook' | 'cliffhanger' | 'signal' | 'context';
  label: string;
  line_id: string;
  speaker?: string | null;
  text: string;
  start_ts?: string | null;
  end_ts?: string | null;
  is_direct_quote: boolean;
}

export interface CandidateDecisionTrace {
  candidate_id: string;
  run_id: string;
  episode: number;
  start_time: number;
  end_time: number;
  duration: number;
  selection_reason: string;
  interest_summary: string;
  hook_why: string;
  cliffhanger_why: string;
  standalone_suitability: string;
  primary_signal: string;
  signal_intensity: number;
  detected_signals: DramaticSignalTrace[];
  composite_score_100: number;
  rubric_breakdown: RubricCriterionExplanation[];
  evidence_items: ScreenplayEvidenceItem[];
  validation_checks: ValidationRuleCheck[];
  overall_validation_passed: boolean;
  dual_judge_evaluated: boolean;
  judge_divergence_detected: boolean;
  judge1_overall?: number | null;
  judge2_overall?: number | null;
  judge_divergence_delta?: number | null;
  judge_notes: string;
  model_version: string;
  prompt_version: string;
  created_at?: string;
}




