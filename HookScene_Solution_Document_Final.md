# HookScene: AI-Powered Microdrama Promo Discovery System
**Kuku AI Generalist Assignment — Problem 1: Find the Promos (Ads)**  
**Author:** Krishna (krishna5632) • **Branch:** Engineering  
**Repository:** [github.com/krishna5632/HookScene](https://github.com/krishna5632/HookScene) • **Live Prototype:** [hookscene.onrender.com](https://hookscene.onrender.com/)

---

## 1. Problem Selection

Microdrama platforms (such as ReelShort, DramaBox, and Kuku) rely heavily on short vertical video ads across TikTok, Instagram Reels, and YouTube Shorts to acquire paying subscribers. Because studios produce and release new 50-episode series every week, choosing promotional clips manually has become a major bottleneck: human video editors currently spend hours watching every single episode by hand to spot candidate scenes.

I selected **Problem 1** because it tackles an immediate business bottleneck with measurable, verifiable criteria. Unlike open-ended generative writing, promo discovery has clear, verifiable constraints that can be measured and evaluated against editorial standards.

A winning microdrama promo requires four specific attributes:
1. **3-Second Scroll-Stopping Hook:** Starts immediately on an intense dramatic peak (an altar betrayal, family disownment, slap, or drawn weapon) within the first 3.0 seconds.
2. **Unresolved Cliffhanger:** Ends abruptly at the peak of unresolved tension right before the answer is revealed, forcing the viewer to watch the episode.
3. **Standalone Clarity:** A stranger who has never seen the show must immediately understand the central conflict without requiring past backstory.
4. **Safe Dialogue Boundaries:** Strictly lasts between 20 and 60 seconds, with clip boundaries selected using screenplay timestamps to avoid cutting through dialogue or sound effects.

---

## 2. Solution Overview

**HookScene** is a full-stack promo discovery system and interactive editorial review desk. Instead of asking an editor to watch 50 episodes to find promo moments, HookScene ingests raw screenplays, detects high-retention turning points, verifies broadcast duration rules, and presents ranked, ready-to-review promo candidates.

The platform follows a clear design rule: **Artificial Intelligence finds the drama, while pure Python code enforces the rules**. The language model analyzes character dynamics and emotional stakes, but is strictly prohibited from writing timestamps. Deterministic Python code calculates clip boundaries from screenplay timestamps, selects safe dialogue boundaries, and validates that clips satisfy duration, hook, and cliffhanger requirements.

The system outputs continuous single cuts and multi-scene paced montages, complete with decision traces explaining *why* each promo works, and exports timeline files (CMX 3600 EDL, Final Cut XML, CSV, and JSON).

---

## 3. How the System Works: 6-Stage Execution Pipeline

```
[ Screenplay Files (.txt / .zip / .srt) ]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Screenplay Ingestion & Tokenization           │
│ (Regex parsing, Line IDs: E02_L004, Dialogue Boundary) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: Story Arc Mapping & Spoiler Suppression      │
│ (Consensus voting locks late episodes 44-50 climax)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 3: Dramatic Peak Discovery (Candidate Hunt)      │
│ (AI Dialogue Radar + Rule Heuristic, Line IDs only)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 4: Deterministic Code Quality Gates & Auto-Repair│
│ (Strict 20-60s length, <=3.0s hook onset, cut_ok gate) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 5: Multi-Rubric Scoring & Ranking                │
│ (5-Rubric Dual Judge, Text Attention, Borda Count)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 6: Montage Synthesis & NLE Timeline Export       │
│ (Intra-scene & multi-episode jump cuts, EDL/XML/CSV)   │
└────────────────────────────────────────────────────────┘
```

The pipeline executes through six sequential stages:
1. **Step 1: Screenplay Ingestion & Tokenization:** Ingests screenplay files (individual `.txt` episodes, multi-episode `.zip` archives, or timed `.srt` captions). A regex parser breaks each block into discrete `Line` entities with stable IDs (e.g., `E02_L004`). It calculates a safe boundary map (`cut_ok`) using screenplay timestamps to identify boundaries that do not fall inside dialogue or SFX intervals.
2. **Step 2: Narrative Arc & Anti-Spoiler Shield:** Performs an initial series-wide analysis to map main characters and core dramatic conflicts. Consensus voting identifies late climax episodes (such as episodes 44–50) to suppress spoilers from appearing in promos.
3. **Step 3: Dramatic Peak Discovery:** The AI scans episode dialogue for explosive turning points (betrayals, confrontations, secret reveals). A deterministic keyword heuristic runs in parallel as a zero-cost backup. *Crucial rule:* The AI only returns line IDs, never timestamps.
4. **Step 4: Deterministic Code Quality Gates:** Python code converts line IDs into ground-truth timestamps and strictly checks 3 rules: (1) length must be 20–60s, (2) hook line must start within the first 3.0s, and (3) cliffhanger cut must happen before the resolving line. If a clip fails, code calculates legal alternate window boundaries and prompts a repair.
5. **Step 5: Multi-Rubric Scoring & Ranking:** A dual-judge system rates each candidate on 5 rubrics (Hook 3s, Cliffhanger, Standalone Clarity, Emotional Intensity, Plot Relevance). An attention proxy adds voice immediacy and motion scores. Clips are ranked via Borda count with diversity deduplication.
6. **Step 6: Montage Synthesis & NLE Timeline Export:** Connects intra-scene and multi-episode beats to eliminate silent pauses for fast-paced short-form feeds. Exports industry-standard CMX 3600 EDL, Final Cut XML, CSV, and JSON deliverables.

---

## 4. Technology Stack

HookScene uses only lightweight, standard technologies:
* **Backend Engine:** Python 3.12, FastAPI, Uvicorn — Screenplay parsing, safe-cut boundary arithmetic, candidate validation, and REST API.
* **AI Inference Layer:** Google Gemini Flash (OpenAI SDK) — Model-agnostic client supporting instant zero-code provider switching (Gemini, Groq, Ollama).
* **Frontend Studio:** React 18, TypeScript, Tailwind CSS — Review Desk teleprompter, audio waveform inspector, Single Cut vs Montage filter, and Run Studio.
* **Data Persistence:** SQLite (`hookscene_eval.db`) — Stores human review decisions, rejection taxonomy (Feature 2), and comparative run telemetry.
* **Testing & Deploy:** Docker, Render, Pytest — Multi-stage containerization, automated testing suite (80 passed tests), and one-click cloud hosting.

---

## 5. Engineering Approach, Scalability & Cost

### Why the AI Never Writes Timestamps
Early prototypes that asked models to write timestamps directly resulted in severe errors: the models regularly made arithmetic mistakes, hallucinated clip durations, and cut actors off mid-sentence. HookScene enforces a strict boundary: *the language model is only allowed to cite script line IDs*. Python code computes all cut points from screenplay timings, enforcing duration constraints and dialogue pause boundaries deterministically. These boundaries are derived from screenplay timestamps; the system does not analyze raw audio waveforms.

### Parallel Scalability & Speed
Episode parsing and candidate discovery run in parallel. Processing all 50 episodes of a show takes **approximately 2 minutes 45 seconds** (~106 API calls) on the `fast` profile.

### Provider Agnostic & Cost
A decoupled client in `config.yaml` allows swapping between Gemini, Groq, or local Ollama without touching application code. A full 50-episode run costs **$0.00** on Gemini Free Tier or **~$0.18 (₹16)** on paid tiers.

---

## 6. Quality Evaluation & Actual Benchmark Results

HookScene uses a multi-layered verification system: multi-rubric scoring, an automated regression test suite, and an explicit failure taxonomy.

### Automated Pytest Suite (80/80 Tests Passed)
* `test_parse_validate.py` (15/15): Boundary snapping, Line ID parsing
* `test_candidate_validation.py` (10/10): 20–60s length, ≤ 3s hook rules
* `test_llm_failure_modes.py` (10/10): Malformed JSON, hallucinated IDs
* `test_input_validation.py` (10/10): Malformed text, invalid file types
* `test_regression_suite.py` (8/8): EDL, XML, CSV, JSON export parity
* `test_performance_and_cost.py` (13/13): Token pricing, execution timing
* `test_failure_consistency.py` (7/7): SQLite storage, Jaccard overlap
* `test_quality_eval.py` (7/7): Multi-rubric math, Borda stability

### Official Benchmark Run (50 Episodes, 3,727 Lines)
* **Candidate Yield:** 138 proposed by AI → 36 rejected by code gates → **30 single cuts + 2 montages**.
* **Hard Rule Compliance:** 32/32 (100%) strictly satisfied the 20–60s duration and ≤ 3.0s hook onset. Average duration: **42.3s**.
* **Consistency Across Runs:** 4 of the top 5 scenes matched identically across independent runs C and D (80% top-rank stability).
* *Note: The 3,727 figure represents structured screenplay units extracted by the parser, rather than raw text lines in the source files.*

### Feature 2: Editorial Failure Taxonomy
Every human rejection in the Review Desk logs to SQLite under 6 tracked failure categories: *Weak Hook, Premature Cut, Unresolved Context, Audio Clipping, Spoiler Risk, and Score Disagreement*.

*Distinction:* Automated unit testing (80 tests) and benchmark runs on the 50-episode pack are **completed**. Real-world ad CTR/hold-rate tracking on TikTok/Meta is **planned**.

---

## 7. Real Limitations & The Role of Human Review

### Where the AI System Has Blind Spots
1. **Text vs Video Reality:** The tool reads screenplay text, not rendered video footage or actor delivery; a subtle glare or facial expression cannot be measured by text alone.
2. **Lower-Rank Score Drift:** The top 5–10 candidates are exceptionally stable, but candidates ranked 20–30 exhibit natural LLM score variance (0.5–1.0 point drift).
3. **Timestamp Alignment:** Relies on screenplay timestamps matching final edited video footage accurately.

### Why the Human Editor Remains Essential
HookScene acts as an **editorial multiplier**, not an autonomous replacement. Instead of watching all 50 episodes (2+ hours), editors can begin by reviewing the top 10 ranked candidates, estimated to take under 5 minutes.

Human judgment remains essential to evaluate comedic timing, actor delivery, cultural nuances, and platform-specific advertising compliance policies.

---

## 8. AI Tools Used & Real Debugging Experience

**Tools Used During Development:** Google Gemini (Flash & Pro) for screenplay analysis and scoring; Google Antigravity agent for architecture scaffolding and Pytest construction; Claude for initial regex prototyping.

### A Real Bug I Diagnosed and Fixed: The Episode Number Collision
* **The Bug:** During multi-file upload testing with custom test scripts (`test-episode-01.txt`, `test-episode-06.txt`, `test-episode-07.txt`), an AI-generated regex in `parse.py` strictly expected `EPISODE NUMBER: Episode <num>`. Because the test files used headers like `TEST-01` and `Test Episode 06`, the parser failed to extract the numbers, causing all three files to default to `Episode 00`. In Python's episode dictionary `em = {e.num: e}`, the last file silently overwrote the earlier episodes, resulting in promos being produced only from the final file.
* **How I Fixed It:** I identified the issue in the Review Desk when all cards showed `Ep. 00` and only 2 promos appeared. I replaced the rigid regex with a flexible digit pattern matching any prefix (`TEST-01`, `EP-06`, `Episode 7`), added a fallback to extract episode numbers directly from the filename, and introduced an automatic de-collision indexer in `load_show` so multiple uploaded files never overwrite each other.

---

### Submission Deliverables
1. **2-Page Solution Document (PDF):** `HookScene_Solution_Document_Final.pdf`
2. **Working Prototype:** [Live on Render](https://hookscene.onrender.com/) • [GitHub Repository](https://github.com/krishna5632/HookScene)
3. **Raw Outputs:** Located in `results/official-run-C/` (`promos.md`, `promos.json`, `promos.csv`)
