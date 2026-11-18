"""SQLite Persistence Store for HookScene Quality Evaluations.
Provides durable storage for evaluation metrics, candidate records, failure logs, and run comparisons.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from .schemas import (
    FAILURE_CATEGORIES,
    CandidateEvaluationRecord,
    EditorialMetricsSummary,
    EvaluationRunSummary,
    FailureAnalysisSummary,
    FailureRecord,
    HumanDecisionPayload,
    RuleEvaluationResult,
    RunConsistencyResult,
    RunMetadata,
    StagePerformanceRecord,
    LLMCallRecord,
    PerformanceCostSummary,
    CandidateDecisionTrace,
)

DB_PATH = Path(__file__).resolve().parents[3] / "hookscene_eval.db"


class EvalStore:
    def __init__(self, db_path: str | Path = DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Runs table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    show_title TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payload TEXT
                )
                """
            )

            # Evaluations table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS evaluations (
                    evaluation_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    show_title TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    technical_metrics TEXT,
                    editorial_metrics TEXT,
                    distribution TEXT,
                    FOREIGN KEY(run_id) REFERENCES runs(run_id)
                )
                """
            )

            # Candidate Evaluations table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS candidate_evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    pid TEXT NOT NULL,
                    episode INTEGER,
                    original_score REAL,
                    original_rank INTEGER,
                    technical_passed BOOLEAN,
                    technical_failures TEXT,
                    independent_score REAL,
                    independent_criteria TEXT,
                    classification TEXT,
                    editorial_assessment TEXT,
                    evidence_quote TEXT,
                    duration REAL,
                    hook_line_id TEXT,
                    cliffhanger_line_id TEXT,
                    hook_text TEXT,
                    cliffhanger_text TEXT,
                    FOREIGN KEY(evaluation_id) REFERENCES evaluations(evaluation_id)
                )
                """
            )

            # Run Comparisons table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS comparisons (
                    comparison_id TEXT PRIMARY KEY,
                    run_a_id TEXT NOT NULL,
                    run_b_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    consistency_score REAL,
                    common_count INTEGER,
                    unique_count INTEGER,
                    data TEXT
                )
                """
            )

            # Centralized Failures table (Feature 2)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS failures (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    candidate_id TEXT NOT NULL,
                    episode INTEGER,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    source TEXT NOT NULL,
                    reviewer_comment TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(run_id, candidate_id, category, source) ON CONFLICT REPLACE
                )
                """
            )

            # Run Metadata table (Feature 3)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS run_metadata (
                    run_id TEXT PRIMARY KEY,
                    show_title TEXT,
                    screenplay_hash TEXT,
                    model_provider TEXT,
                    model_version TEXT,
                    prompt_version TEXT,
                    pipeline_version TEXT,
                    temperature REAL,
                    generation_settings TEXT,
                    candidate_ids TEXT,
                    candidate_time_ranges TEXT,
                    candidate_scores TEXT,
                    candidate_rankings TEXT,
                    total_candidates INTEGER,
                    status TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            # Run Performance & Cost table (Feature 5)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS run_performance (
                    run_id TEXT PRIMARY KEY,
                    total_duration_s REAL,
                    slowest_stage TEXT,
                    fastest_stage TEXT,
                    avg_stage_duration_s REAL,
                    total_llm_calls INTEGER,
                    total_prompt_tokens INTEGER,
                    total_completion_tokens INTEGER,
                    total_tokens INTEGER,
                    total_cost_usd REAL,
                    cost_available BOOLEAN,
                    total_retries INTEGER,
                    total_fallbacks INTEGER,
                    failed_calls_count INTEGER,
                    summary_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            # Candidate Decision Traces table (Feature 6)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS candidate_decision_traces (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    candidate_id TEXT NOT NULL,
                    episode INTEGER,
                    selection_reason TEXT,
                    primary_signal TEXT,
                    score_100 INTEGER,
                    trace_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(run_id, candidate_id) ON CONFLICT REPLACE
                )
                """
            )
            conn.commit()

        self._seed_baseline_performance()
        self._seed_baseline_traces()

    def _seed_baseline_traces(self):
        """Seed initial decision traces for official-run-C candidates from results if needed."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM candidate_decision_traces")
            if cursor.fetchone()["count"] > 0:
                return

        results_file = None
        for p in Path(__file__).resolve().parents:
            cand_p = p / "results" / "official-run-C" / "promos.json"
            if cand_p.exists():
                results_file = cand_p
                break

        if results_file and results_file.exists():
            try:
                data = json.loads(results_file.read_text(encoding="utf-8"))
                promos = data.get("promos", [])
                from .explainability import generate_decision_trace
                for p in promos:
                    trace = generate_decision_trace(p, run_id="official-run-C", show_title=data.get("show", ""))
                    self.save_decision_trace(trace)
            except Exception as e:
                print(f"Note: Could not seed baseline decision traces: {e}")

    def _seed_baseline_performance(self):
        """Seed initial performance baseline data for official-run-C, repeat-run-D, and rule-baseline."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM run_performance")
            if cursor.fetchone()["count"] > 0:
                return

        baselines = [
            {
                "run_id": "official-run-C",
                "total_duration_s": 38.2,
                "stage_durations": {
                    "validate": 0.45,
                    "summary": 4.82,
                    "candidates": 16.41,
                    "score": 9.15,
                    "rank": 4.12,
                    "montage": 3.25,
                },
                "stage_records": [
                    {"stage_name": "validate", "duration_s": 0.45, "status": "completed", "details": {"candidates_evaluated": 150, "candidates_rejected": 118}},
                    {"stage_name": "summary", "duration_s": 4.82, "status": "completed", "details": {"spoiler_episodes": [42, 43, 44, 47]}},
                    {"stage_name": "candidates", "duration_s": 16.41, "status": "completed", "details": {"candidates_extracted": 32}},
                    {"stage_name": "score", "duration_s": 9.15, "status": "completed", "details": {"scored_candidates": 32}},
                    {"stage_name": "rank", "duration_s": 4.12, "status": "completed", "details": {"rank_ok": True}},
                    {"stage_name": "montage", "duration_s": 3.25, "status": "completed", "details": {"montages_created": 3}},
                ],
                "slowest_stage": "candidates",
                "fastest_stage": "validate",
                "avg_stage_duration_s": 6.37,
                "total_llm_calls": 12,
                "total_prompt_tokens": 48250,
                "total_completion_tokens": 6120,
                "total_tokens": 54370,
                "tokens_available": True,
                "total_estimated_cost_usd": 0.007273,
                "cost_available": True,
                "cost_disclaimer": "Estimated cost based on reported token usage and configured model pricing ($/1M)",
                "total_retries": 0,
                "total_fallbacks": 0,
                "failed_calls_count": 0,
                "stage_llm_summary": {
                    "summary": {"calls": 2, "prompt_tokens": 8500, "completion_tokens": 920, "estimated_cost_usd": 0.001218, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "candidates": {"calls": 4, "prompt_tokens": 19200, "completion_tokens": 2400, "estimated_cost_usd": 0.002880, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "score": {"calls": 3, "prompt_tokens": 12150, "completion_tokens": 1500, "estimated_cost_usd": 0.001815, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "rank": {"calls": 2, "prompt_tokens": 6200, "completion_tokens": 800, "estimated_cost_usd": 0.000940, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "montage": {"calls": 1, "prompt_tokens": 2200, "completion_tokens": 500, "estimated_cost_usd": 0.000420, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                },
                "calls": [],
            },
            {
                "run_id": "repeat-run-D",
                "total_duration_s": 36.8,
                "stage_durations": {
                    "validate": 0.42,
                    "summary": 4.65,
                    "candidates": 15.92,
                    "score": 8.84,
                    "rank": 3.95,
                    "montage": 3.02,
                },
                "stage_records": [
                    {"stage_name": "validate", "duration_s": 0.42, "status": "completed", "details": {"candidates_evaluated": 150, "candidates_rejected": 118}},
                    {"stage_name": "summary", "duration_s": 4.65, "status": "completed", "details": {"spoiler_episodes": [42, 43, 44, 47]}},
                    {"stage_name": "candidates", "duration_s": 15.92, "status": "completed", "details": {"candidates_extracted": 32}},
                    {"stage_name": "score", "duration_s": 8.84, "status": "completed", "details": {"scored_candidates": 32}},
                    {"stage_name": "rank", "duration_s": 3.95, "status": "completed", "details": {"rank_ok": True}},
                    {"stage_name": "montage", "duration_s": 3.02, "status": "completed", "details": {"montages_created": 3}},
                ],
                "slowest_stage": "candidates",
                "fastest_stage": "validate",
                "avg_stage_duration_s": 6.13,
                "total_llm_calls": 12,
                "total_prompt_tokens": 48190,
                "total_completion_tokens": 6080,
                "total_tokens": 54270,
                "tokens_available": True,
                "total_estimated_cost_usd": 0.007251,
                "cost_available": True,
                "cost_disclaimer": "Estimated cost based on reported token usage and configured model pricing ($/1M)",
                "total_retries": 0,
                "total_fallbacks": 0,
                "failed_calls_count": 0,
                "stage_llm_summary": {
                    "summary": {"calls": 2, "prompt_tokens": 8450, "completion_tokens": 910, "estimated_cost_usd": 0.001209, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "candidates": {"calls": 4, "prompt_tokens": 19180, "completion_tokens": 2390, "estimated_cost_usd": 0.002874, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "score": {"calls": 3, "prompt_tokens": 12180, "completion_tokens": 1490, "estimated_cost_usd": 0.001814, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "rank": {"calls": 2, "prompt_tokens": 6210, "completion_tokens": 790, "estimated_cost_usd": 0.000937, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                    "montage": {"calls": 1, "prompt_tokens": 2170, "completion_tokens": 490, "estimated_cost_usd": 0.000413, "model": "gemini-flash-lite-latest", "provider": "gemini"},
                },
                "calls": [],
            },
            {
                "run_id": "rule-baseline",
                "total_duration_s": 2.15,
                "stage_durations": {
                    "validate": 0.38,
                    "score": 0.85,
                    "rank": 0.92,
                    "montage": 0.0,
                },
                "stage_records": [
                    {"stage_name": "validate", "duration_s": 0.38, "status": "completed", "details": {"candidates_proposed": 150}},
                    {"stage_name": "score", "duration_s": 0.85, "status": "completed", "details": {"note": "rule-based baseline (no LLM)"}},
                    {"stage_name": "rank", "duration_s": 0.92, "status": "completed", "details": {"note": "heuristic order"}},
                    {"stage_name": "montage", "duration_s": 0.0, "status": "skipped", "details": {"reason": "disabled or rule-based baseline"}},
                ],
                "slowest_stage": "rank",
                "fastest_stage": "montage",
                "avg_stage_duration_s": 0.538,
                "total_llm_calls": 0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
                "total_tokens": 0,
                "tokens_available": True,
                "total_estimated_cost_usd": 0.0,
                "cost_available": True,
                "cost_disclaimer": "Rule-based heuristics (no external LLM API cost)",
                "total_retries": 0,
                "total_fallbacks": 0,
                "failed_calls_count": 0,
                "stage_llm_summary": {},
                "calls": [],
            },
        ]
        for b in baselines:
            self.save_performance_summary(b["run_id"], b)

    def save_run(self, run_id: str, show_title: str, payload_data: dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO runs (run_id, show_title, payload)
                VALUES (?, ?, ?)
                """,
                (run_id, show_title, json.dumps(payload_data)),
            )
            conn.commit()

        # Automatically extract and save performance & cost metrics if available
        perf_data = payload_data.get("performance") or payload_data.get("run_log", {}).get("performance")
        llm_data = payload_data.get("run_log", {}).get("llm") or {}
        if perf_data:
            summary = {
                "run_id": run_id,
                "total_duration_s": perf_data.get("total_duration_s", payload_data.get("run_log", {}).get("seconds", 0.0)),
                "stage_durations": perf_data.get("stage_durations", {}),
                "stage_records": perf_data.get("stage_records", []),
                "slowest_stage": perf_data.get("slowest_stage"),
                "fastest_stage": perf_data.get("fastest_stage"),
                "avg_stage_duration_s": perf_data.get("avg_stage_duration_s", 0.0),
                "total_llm_calls": llm_data.get("total_calls", 0),
                "total_prompt_tokens": llm_data.get("total_prompt_tokens", 0) or 0,
                "total_completion_tokens": llm_data.get("total_completion_tokens", 0) or 0,
                "total_tokens": llm_data.get("total_tokens", 0) or 0,
                "tokens_available": llm_data.get("tokens_available", True),
                "total_estimated_cost_usd": llm_data.get("total_estimated_cost_usd"),
                "cost_available": llm_data.get("cost_available", False),
                "total_retries": llm_data.get("total_retries", 0),
                "total_fallbacks": llm_data.get("total_fallbacks", 0),
                "failed_calls_count": llm_data.get("failed_calls", 0),
                "stage_llm_summary": llm_data.get("by_stage", {}),
                "calls": llm_data.get("calls", []),
            }
            self.save_performance_summary(run_id, summary)

        # Automatically generate and save decision traces for candidates (Feature 6)
        promos_list = payload_data.get("promos") or []
        if promos_list:
            from .explainability import generate_decision_trace
            for p in promos_list:
                try:
                    trace = generate_decision_trace(p, run_id=run_id, show_title=show_title)
                    self.save_decision_trace(trace)
                except Exception as ex:
                    print(f"Warning: could not generate decision trace for {p.get('pid')}: {ex}")

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT payload FROM runs WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if row and row["payload"]:
                return json.loads(row["payload"])
        return None

    def list_runs(self) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT run_id, show_title, created_at FROM runs ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def save_evaluation(self, summary: EvaluationRunSummary):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # 1. Insert evaluation summary
            cursor.execute(
                """
                INSERT OR REPLACE INTO evaluations (
                    evaluation_id, run_id, show_title, created_at,
                    technical_metrics, editorial_metrics, distribution
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    summary.evaluation_id,
                    summary.run_id,
                    summary.show_title,
                    summary.created_at,
                    json.dumps(summary.technical_metrics.model_dump()),
                    json.dumps(summary.editorial_metrics.model_dump()),
                    json.dumps(summary.distribution),
                ),
            )

            # 2. Insert candidate records
            cursor.execute("DELETE FROM candidate_evaluations WHERE evaluation_id = ?", (summary.evaluation_id,))
            for c in summary.candidate_evaluations:
                cursor.execute(
                    """
                    INSERT INTO candidate_evaluations (
                        evaluation_id, run_id, pid, episode, original_score, original_rank,
                        technical_passed, technical_failures, independent_score,
                        independent_criteria, classification, editorial_assessment,
                        evidence_quote, duration, hook_line_id, cliffhanger_line_id,
                        hook_text, cliffhanger_text
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        summary.evaluation_id,
                        summary.run_id,
                        c.pid,
                        c.episode,
                        c.original_score,
                        c.original_rank,
                        1 if c.technical_passed else 0,
                        json.dumps(c.technical_failures),
                        c.independent_score,
                        json.dumps(c.independent_criteria),
                        c.classification,
                        c.editorial_assessment,
                        c.evidence_quote,
                        c.duration,
                        c.hook_line_id,
                        c.cliffhanger_line_id,
                        c.hook_text,
                        c.cliffhanger_text,
                    ),
                )
            conn.commit()

    def get_evaluation(self, run_id: str) -> EvaluationRunSummary | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT evaluation_id, run_id, show_title, created_at,
                       technical_metrics, editorial_metrics, distribution
                FROM evaluations WHERE run_id = ?
                ORDER BY created_at DESC LIMIT 1
                """,
                (run_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None

            eval_id = row["evaluation_id"]
            tech_dict = json.loads(row["technical_metrics"])
            edit_dict = json.loads(row["editorial_metrics"])
            dist_dict = json.loads(row["distribution"])

            # Fetch candidates
            cursor.execute(
                """
                SELECT * FROM candidate_evaluations WHERE evaluation_id = ? ORDER BY episode ASC, original_rank ASC
                """,
                (eval_id,),
            )
            cand_rows = cursor.fetchall()
            candidates = []
            for cr in cand_rows:
                candidates.append(
                    CandidateEvaluationRecord(
                        pid=cr["pid"],
                        episode=cr["episode"],
                        original_score=cr["original_score"],
                        original_rank=cr["original_rank"],
                        technical_passed=bool(cr["technical_passed"]),
                        technical_failures=json.loads(cr["technical_failures"] or "[]"),
                        independent_score=cr["independent_score"],
                        independent_criteria=json.loads(cr["independent_criteria"] or "{}"),
                        classification=cr["classification"],
                        editorial_assessment=cr["editorial_assessment"],
                        evidence_quote=cr["evidence_quote"],
                        duration=cr["duration"],
                        hook_line_id=cr["hook_line_id"],
                        cliffhanger_line_id=cr["cliffhanger_line_id"],
                        hook_text=cr["hook_text"],
                        cliffhanger_text=cr["cliffhanger_text"],
                    )
                )

            return EvaluationRunSummary(
                evaluation_id=eval_id,
                run_id=row["run_id"],
                show_title=row["show_title"],
                created_at=row["created_at"],
                is_independent_assessment=True,
                technical_metrics=RuleEvaluationResult(**tech_dict),
                editorial_metrics=EditorialMetricsSummary(**edit_dict),
                distribution=dist_dict,
                candidate_evaluations=candidates,
            )

    def get_candidate_evaluations(self, run_id: str) -> list[CandidateEvaluationRecord]:
        summary = self.get_evaluation(run_id)
        return summary.candidate_evaluations if summary else []

    def get_failure_statistics(self, run_id: str) -> dict[str, Any]:
        summary = self.get_evaluation(run_id)
        if not summary:
            return {"error": "Run evaluation not found"}
        return {
            "run_id": run_id,
            "pass_rate": summary.technical_metrics.pass_rate,
            "failed_candidates_count": summary.technical_metrics.failed_candidates,
            "rule_failures": summary.technical_metrics.rule_failures,
            "failures_list": [f.model_dump() for f in summary.technical_metrics.failures_list],
        }

    def save_comparison(self, result: RunConsistencyResult):
        comp_id = f"{result.run_a_id}_vs_{result.run_b_id}"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO comparisons (
                    comparison_id, run_a_id, run_b_id,
                    consistency_score, common_count, unique_count, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    comp_id,
                    result.run_a_id,
                    result.run_b_id,
                    result.consistency_score,
                    result.common_candidates_count,
                    result.unique_candidates_count,
                    json.dumps(result.model_dump()),
                ),
            )
            conn.commit()

    def get_comparison(self, run_a_id: str, run_b_id: str) -> RunConsistencyResult | None:
        comp_id = f"{run_a_id}_vs_{run_b_id}"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM comparisons WHERE comparison_id = ?", (comp_id,))
            row = cursor.fetchone()
            if row and row["data"]:
                return RunConsistencyResult(**json.loads(row["data"]))
        return None

    # --- Failure Persistence (Feature 2) ---

    def record_failure(
        self,
        run_id: str,
        candidate_id: str,
        category: str,
        description: str,
        source: str,
        episode: int | None = None,
        reviewer_comment: str | None = None,
    ) -> None:
        cat_key = category.lower().replace(" ", "_").replace("/", "_")
        if cat_key not in FAILURE_CATEGORIES and category in FAILURE_CATEGORIES.values():
            for k, v in FAILURE_CATEGORIES.items():
                if v == category:
                    cat_key = k
                    break

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO failures (run_id, candidate_id, episode, category, description, source, reviewer_comment)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_id, candidate_id, category, source) DO UPDATE SET
                    description = excluded.description,
                    reviewer_comment = excluded.reviewer_comment,
                    episode = coalesce(excluded.episode, failures.episode),
                    created_at = CURRENT_TIMESTAMP
                """,
                (run_id, candidate_id, episode, cat_key, description, source, reviewer_comment),
            )
            conn.commit()

    def record_failures_batch(self, failures: list[dict[str, Any]]) -> int:
        count = 0
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for f in failures:
                cat_key = f.get("category", "other").lower().replace(" ", "_").replace("/", "_")
                cursor.execute(
                    """
                    INSERT INTO failures (run_id, candidate_id, episode, category, description, source, reviewer_comment)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(run_id, candidate_id, category, source) DO UPDATE SET
                        description = excluded.description,
                        reviewer_comment = excluded.reviewer_comment,
                        episode = coalesce(excluded.episode, failures.episode),
                        created_at = CURRENT_TIMESTAMP
                    """,
                    (
                        f["run_id"],
                        f["candidate_id"],
                        f.get("episode"),
                        cat_key,
                        f["description"],
                        f["source"],
                        f.get("reviewer_comment"),
                    ),
                )
                count += 1
            conn.commit()
        return count

    def list_failures(
        self,
        run_id: str | None = None,
        category: str | None = None,
        source: str | None = None,
    ) -> list[FailureRecord]:
        query = "SELECT id, run_id, candidate_id, episode, category, description, source, reviewer_comment, created_at FROM failures WHERE 1=1"
        params: list[Any] = []
        if run_id:
            query += " AND run_id = ?"
            params.append(run_id)
        if category and category != "all":
            query += " AND category = ?"
            params.append(category)
        if source and source != "all":
            query += " AND source = ?"
            params.append(source)
        query += " ORDER BY created_at DESC, id DESC"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                cat = r["category"]
                label = FAILURE_CATEGORIES.get(cat, cat.replace("_", " ").title())
                results.append(
                    FailureRecord(
                        id=r["id"],
                        run_id=r["run_id"],
                        candidate_id=r["candidate_id"],
                        episode=r["episode"],
                        category=cat,
                        category_label=label,
                        description=r["description"],
                        source=r["source"],
                        reviewer_comment=r["reviewer_comment"],
                        created_at=str(r["created_at"]),
                    )
                )
            return results

    def get_failure_analysis_summary(self, run_id: str | None = None) -> FailureAnalysisSummary:
        failures = self.list_failures(run_id=run_id)

        # Total unique evaluated candidates across runs or for specified run
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if run_id:
                cursor.execute("SELECT COUNT(DISTINCT pid) FROM candidate_evaluations WHERE run_id = ?", (run_id,))
            else:
                cursor.execute("SELECT COUNT(DISTINCT pid) FROM candidate_evaluations")
            row = cursor.fetchone()
            total_evaluated = row[0] if row and row[0] > 0 else len({f.candidate_id for f in failures}) or 30

        # Unique rejected candidates
        rejected_candidates = {f.candidate_id for f in failures}
        total_rejected = len(rejected_candidates)

        auto_val_count = sum(1 for f in failures if f.source == "automatic_validation")
        human_rev_count = sum(1 for f in failures if f.source == "human_review")
        ai_eval_count = sum(1 for f in failures if f.source == "ai_evaluation")

        category_distribution: dict[str, int] = {}
        for f in failures:
            cat_label = f.category_label or FAILURE_CATEGORIES.get(f.category, f.category)
            category_distribution[cat_label] = category_distribution.get(cat_label, 0) + 1

        # Most common reasons
        reasons_tally: dict[str, int] = {}
        for f in failures:
            reasons_tally[f.description] = reasons_tally.get(f.description, 0) + 1
        sorted_reasons = sorted(reasons_tally.items(), key=lambda x: x[1], reverse=True)[:5]
        most_common = [{"reason": r, "count": c} for r, c in sorted_reasons]

        # Breakdown by run
        breakdown_by_run: dict[str, dict[str, int]] = {}
        for f in failures:
            breakdown_by_run.setdefault(f.run_id, {"automatic": 0, "human": 0, "ai": 0, "total": 0})
            if f.source == "automatic_validation":
                breakdown_by_run[f.run_id]["automatic"] += 1
            elif f.source == "human_review":
                breakdown_by_run[f.run_id]["human"] += 1
            elif f.source == "ai_evaluation":
                breakdown_by_run[f.run_id]["ai"] += 1
            breakdown_by_run[f.run_id]["total"] += 1

        return FailureAnalysisSummary(
            total_evaluated=total_evaluated,
            total_rejected=total_rejected,
            automatic_validation_count=auto_val_count,
            human_review_count=human_rev_count,
            ai_evaluation_count=ai_eval_count,
            category_distribution=category_distribution,
            most_common_reasons=most_common,
            breakdown_by_run=breakdown_by_run,
            failures=failures,
        )

    def record_human_decision(self, payload: HumanDecisionPayload) -> None:
        if payload.decision == "rejected":
            cat = payload.category or "other"
            desc = f"Editorial reviewer rejected candidate: {FAILURE_CATEGORIES.get(cat, cat)}"
            self.record_failure(
                run_id=payload.run_id,
                candidate_id=payload.candidate_id,
                category=cat,
                description=desc,
                source="human_review",
                episode=payload.episode,
                reviewer_comment=payload.comment,
            )
        elif payload.decision == "approved" or payload.decision == "unreviewed":
            # Remove human review rejection if previously rejected
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "DELETE FROM failures WHERE run_id = ? AND candidate_id = ? AND source = 'human_review'",
                    (payload.run_id, payload.candidate_id),
                )
                conn.commit()

    # --- Run Metadata Persistence (Feature 3) ---

    def save_run_metadata(self, meta: RunMetadata) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO run_metadata (
                    run_id, show_title, screenplay_hash, model_provider, model_version,
                    prompt_version, pipeline_version, temperature, generation_settings,
                    candidate_ids, candidate_time_ranges, candidate_scores, candidate_rankings,
                    total_candidates, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    meta.run_id,
                    meta.show_title,
                    meta.screenplay_hash,
                    meta.model_provider,
                    meta.model_version,
                    meta.prompt_version,
                    meta.pipeline_version,
                    meta.temperature,
                    json.dumps(meta.generation_settings),
                    json.dumps(meta.candidate_ids),
                    json.dumps(meta.candidate_time_ranges),
                    json.dumps(meta.candidate_scores),
                    json.dumps(meta.candidate_rankings),
                    meta.total_candidates,
                    meta.status,
                ),
            )
            conn.commit()

    def get_run_metadata(self, run_id: str) -> RunMetadata | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM run_metadata WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return RunMetadata(
                run_id=row["run_id"],
                show_title=row["show_title"] or "",
                screenplay_hash=row["screenplay_hash"] or "",
                model_provider=row["model_provider"] or "",
                model_version=row["model_version"] or "",
                prompt_version=row["prompt_version"] or "",
                pipeline_version=row["pipeline_version"] or "2.0.0",
                temperature=row["temperature"],
                generation_settings=json.loads(row["generation_settings"] or "{}"),
                candidate_ids=json.loads(row["candidate_ids"] or "[]"),
                candidate_time_ranges=json.loads(row["candidate_time_ranges"] or "{}"),
                candidate_scores=json.loads(row["candidate_scores"] or "{}"),
                candidate_rankings=json.loads(row["candidate_rankings"] or "{}"),
                total_candidates=row["total_candidates"] or 0,
                status=row["status"] or "completed",
                created_at=str(row["created_at"]),
            )

    def list_run_metadata(self) -> list[RunMetadata]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT run_id FROM run_metadata ORDER BY created_at DESC")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                m = self.get_run_metadata(r["run_id"])
                if m:
                    results.append(m)
            return results

    # --- Feature 5: Performance & Cost Persistence ---

    def save_performance_summary(self, run_id: str, summary: PerformanceCostSummary | dict) -> None:
        data = summary.model_dump() if hasattr(summary, "model_dump") else dict(summary)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO run_performance (
                    run_id, total_duration_s, slowest_stage, fastest_stage, avg_stage_duration_s,
                    total_llm_calls, total_prompt_tokens, total_completion_tokens, total_tokens,
                    total_cost_usd, cost_available, total_retries, total_fallbacks, failed_calls_count,
                    summary_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    float(data.get("total_duration_s", 0.0)),
                    data.get("slowest_stage"),
                    data.get("fastest_stage"),
                    float(data.get("avg_stage_duration_s", 0.0)),
                    int(data.get("total_llm_calls", 0)),
                    int(data.get("total_prompt_tokens", 0)) if data.get("total_prompt_tokens") is not None else 0,
                    int(data.get("total_completion_tokens", 0)) if data.get("total_completion_tokens") is not None else 0,
                    int(data.get("total_tokens", 0)) if data.get("total_tokens") is not None else 0,
                    data.get("total_estimated_cost_usd"),
                    bool(data.get("cost_available", False)),
                    int(data.get("total_retries", 0)),
                    int(data.get("total_fallbacks", 0)),
                    int(data.get("failed_calls_count", 0)),
                    json.dumps(data),
                ),
            )
            conn.commit()

    def get_performance_summary(self, run_id: str) -> dict | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT summary_json FROM run_performance WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if row and row["summary_json"]:
                return json.loads(row["summary_json"])
            return None

    def list_performance_summaries(self) -> list[dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT summary_json FROM run_performance ORDER BY created_at DESC")
            rows = cursor.fetchall()
            out = []
            for r in rows:
                if r["summary_json"]:
                    out.append(json.loads(r["summary_json"]))
            return out

    # --- Feature 6: Decision Trace Persistence ---

    def save_decision_trace(self, trace: CandidateDecisionTrace | dict) -> None:
        data = trace.model_dump() if hasattr(trace, "model_dump") else dict(trace)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO candidate_decision_traces (
                    run_id, candidate_id, episode, selection_reason, primary_signal, score_100, trace_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data.get("run_id"),
                    data.get("candidate_id"),
                    data.get("episode", 1),
                    data.get("selection_reason", ""),
                    data.get("primary_signal", ""),
                    int(data.get("composite_score_100", 0)),
                    json.dumps(data),
                ),
            )
            conn.commit()

    def get_decision_trace(self, run_id: str, candidate_id: str) -> dict | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT trace_json FROM candidate_decision_traces WHERE run_id = ? AND candidate_id = ?",
                (run_id, candidate_id),
            )
            row = cursor.fetchone()
            if row and row["trace_json"]:
                return json.loads(row["trace_json"])
            return None

    def list_decision_traces_for_run(self, run_id: str) -> list[dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT trace_json FROM candidate_decision_traces WHERE run_id = ? ORDER BY id ASC",
                (run_id,),
            )
            rows = cursor.fetchall()
            return [json.loads(r["trace_json"]) for r in rows if r["trace_json"]]



