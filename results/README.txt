HookScene — Problem 1 Raw Outputs
Dataset: "I Married a Broken Soldier. He was a Duke" (Full 50-Episode Input Pack)

Folder Structure & Description:
--------------------------------------------------------------------------------
1. official-run-C/  [PRIMARY PRODUCTION RUN]
   - promos.json: 32 final selected promo candidates with dialogue, timestamps, scores, and tags.
   - promos.csv: Tabular CSV export formatted for editorial review and batch scheduling.
   - promos.md: Full markdown dossier with screenplay snippets and justification.
   - candidates_all.json: Complete pool of 138 evaluated candidate scenes before deduplication.
   - auto_eval.json: 5-rubric quality scores (Hook, Cliffhanger, Clarity, Stakes, Attention).
   - eval_report.json: Automated code gate validation report (100% rule compliance, 0 hard failures).
   - run_log.json: Stage-by-stage execution log, token usage, and rejection statistics.
   - show_summary.json: 50-episode narrative arc analysis, character profiles, and payoff mappings.

2. repeat-run-D/    [CONSISTENCY & REPEATABILITY RUN]
   - Unedited outputs from an independent run on the full input pack.
   - Used in the Consistency Comparator (F3) to verify Jaccard candidate stability.

3. rule-baseline/   [HEURISTIC ABLATION BASELINE]
   - Unedited output using pure rule-based heuristics without neuro-symbolic LLM filtering,
     serving as the baseline comparison.
