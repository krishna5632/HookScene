# HookScene: AI-Powered Microdrama Promo Discovery System
**Kuku AI Generalist Assignment — Problem 1: Find the Promos (Ads)**  
**Author:** Krishna (krishna5632) • **Branch / Roll No:** [Your Roll Number / Branch]  
**Repository:** [github.com/krishna5632/HookScene](https://github.com/krishna5632/HookScene) • **Live Prototype:** [hookscene-studio.onrender.com](https://hookscene-studio.onrender.com) *(or local Docker)*

---

## 1. Problem Selection

Microdrama platforms (such as ReelShort and DramaBox) rely heavily on short vertical video ads across TikTok, Instagram Reels, and YouTube Shorts to acquire paying viewers. Producing these promos is a massive operational bottleneck: studios release 50+ episode series weekly, and human video editors currently watch every single episode by hand to spot candidate moments.

I selected **Problem 1** because it sits directly on business spend and distribution velocity. Unlike open-ended generative writing, promo discovery has clear, verifiable constraints that can be measured and evaluated against editorial standards.

A winning microdrama promo requires four specific attributes:
1. **The 3-Second Hook:** An immediate scroll-stopping opening (a brutal altar rejection, a slap, a shocking revelation, or a weapon drawn).
2. **The Unresolved Cliffhanger:** Cutting precisely before the dramatic tension resolves, forcing the viewer to download the app or watch the next episode.
3. **Standalone Clarity:** A stranger who has never seen the show must instantly understand the stakes and character dynamics without prior exposition.
4. **Broadcast Safe-Cut Points:** Exact 20–60 second duration, cutting cleanly during speech pauses rather than slicing mid-word or mid-sound-effect.

---

## 2. Solution Overview

**HookScene** is an automated promo intelligence engine and interactive editorial review desk. It transforms raw, timestamped screenplay files into broadcast-ready, ranked 20–60 second promotional video candidates.

HookScene addresses the manual bottleneck through a **neuro-symbolic design**:
* **Artificial Intelligence (LLMs)** reads the narrative, detects character dynamics, maps high-drama turning points, and scores dramatic tension.
* **Pure Mathematical Code (Python)** strictly enforces duration boundaries (20–60s), ensures the hook lands within the first 3.0 seconds, snaps start/end times to natural speech pauses, and prevents spoilers.

The system outputs continuous single cuts and multi-scene paced montages, complete with decision traces explaining *why* each promo works, and exports timeline files (JSON, CSV, markdown, and EDL).

---

## 3. How the System Works

```
[ Screenplay Files (.txt / .zip / .srt) ]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Screenplay Ingestion & Safe-Cut Boundary Map  │
│ (Regex parsing, Line IDs: E01_L004, speech pause map)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: Narrative Arc Analysis & Spoiler Suppression  │
│ (Maps story, identifies selling reveals vs spoilers)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 3: Dramatic Peak Hunter & Candidate Generation   │
│ (AI identifies 3 candidate hooks/cliffs by Line IDs)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 4: Deterministic Code Quality Gates & Auto-Repair│
│ (Strict 20-60s length, <=3.0s hook onset, safe cuts)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 5: Multi-Rubric Scoring, Attention Meter & Rank  │
│ (Hook, Cliff, Clarity, Intensity + Borda count rank)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 6: Multi-Segment Montage Synthesis & Export      │
│ (Intra-scene & inter-episode montages, EDL / CSV / UI) │
└────────────────────────────────────────────────────────┘
```

The pipeline executes through six sequential stages:
1. **Screenplay Ingestion & Safe-Cut Parsing:** Ingests raw `.txt` episodes, `.zip` archives, or `.srt` subtitle files. A regex parser categorizes every block into structured `Line` objects (`E01_L004`) with timestamps, line types (`DIALOGUE`, `ACTION`, `CAMERA`, `SFX`), speakers, and emotion tags. It precomputes a `cut_ok` boundary map to guarantee cuts never clip spoken words.
2. **Narrative Understanding & Spoiler Suppression:** Performs a whole-series summary to map character roles and detect late-stage plot resolutions. A consensus vote flags late climax episodes (e.g. episodes 44–50) so endings are never leaked in social ads.
3. **Dramatic Peak Discovery:** The LLM scans episode dialogue to discover emotional peaks (betrayals, family confrontations, slaps, identity reveals) returning only Line IDs. A rule-based keyword heuristic runs in parallel as a fallback.
4. **Deterministic Code Quality Gates:** Python code converts Line IDs to timestamps and enforces hard rules: clip duration must be 20–60s, the dramatic hook must start within 3.0s of the opening, and the cut must end on the cliffhanger before resolution dialogue. If out of bounds, code calculates legal alternate window boundaries and prompts a repair.
5. **Multi-Rubric Scoring & Ranking:** Evaluates candidates across 5 weighted rubrics: Hook Strength (3x), Cliffhanger (3x), Standalone Clarity (2x), Emotional Intensity (1x), and Plot Relevance (1x). A text-attention proxy measures time to first speech, motion words, and dead air. Candidates are ranked using a multi-pass Borda count with diversity deduplication (maximum 2 clips per episode).
6. **Montage Synthesis & Export:** Generates multi-clip jump-cut montages (stitching 2–3 moments to eliminate silent pauses for fast-paced TikTok feeds) and exports CMX 3600 EDL, JSON, CSV, and markdown summaries.

---

## 4. Technology Stack

HookScene uses only lightweight, standard technologies:
* **Python 3.12 & FastAPI:** Powers the core parsing algorithms, mathematical constraint validation, candidate ranking, and asynchronous REST API.
* **React 18 & TypeScript:** Front-end Studio with teleprompter review, audio safe-cut visualizer, Single Cut vs Montage filters, and editorial approval/rejection logging.
* **Tailwind CSS & Lucide Icons:** Modern, clean, high-contrast user interface inspired by TwelveLabs aesthetic.
* **SQLite (`hookscene_eval.db`):** Persistent storage tracking human review decisions, rejection categories, and comparative run telemetry.
* **Uvicorn & Docker:** Multi-stage production Docker containerization for one-command execution (`docker-compose up -d`) and Render cloud hosting.
* **Pytest:** Comprehensive automated testing suite containing 80 verified unit, boundary, and regression test cases.
* **Gemini Flash (via OpenAI SDK compat):** Fast, low-cost LLM for narrative extraction and rubric evaluation.

---

## 5. Approach and Scalability

### The Core Architectural Principle: AI Proposes, Code Disposes
Early experiments revealed that asking LLMs to output timestamps directly resulted in severe failure: models hallucinated arithmetic and cut mid-sentence. HookScene enforces a strict boundary:
* **The LLM may only cite Line IDs** (e.g., `E02_L002` to `E02_L030`).
* **Python code computes every millisecond**, verifies duration, checks $\le 3.0$s hook onset, and snaps cuts to safe acoustic pauses.

### Scalability and Provider Swapping
* **Parallel Execution:** Ingestion and candidate discovery run asynchronously across episodes. On the 50-episode reference show (3,727 lines), the `fast` profile finishes in under 3 minutes (~103 API calls).
* **Provider Agnostic:** Configured via `config.yaml` using the standard OpenAI client schema, allowing instant zero-code swapping between Gemini, Groq (Llama-3), OpenAI, or local Ollama instances.
* **Cost Efficiency:** Disk-based SHA-256 caching ensures repeated runs cost zero calls. Processing an entire 50-episode show costs \$0.00 on Gemini's free tier, or approximately \$0.15–\$0.25 on high-throughput paid tiers.

---

## 6. Quality Evaluation & Test Verification

HookScene combines automated unit verification, benchmark evaluations, and editorial failure tracking:

### Verified Test Results (100% Passing)
The platform includes **80 automated tests** across 8 test suites running in `pytest`:
* `test_parse_validate.py` (15/15): Safe audio boundaries, millisecond parsing, line ID generation.
* `test_candidate_validation_edge_cases.py` (10/10): Clip boundary enforcement, hook $\le 3.0$s enforcement, 20–60s duration rules.
* `test_input_validation.py` (10/10): Corrupted files, non-standard screenplay formats, character encoding.
* `test_llm_failure_modes.py` (10/10): Malformed JSON handling, missing line citations, hallucinated IDs.
* `test_regression_suite.py` (8/8): Multi-format exports (EDL, CSV, JSON payload, markdown).
* `test_performance_and_cost.py` (13/13): Telemetry accuracy, token count calculations, stage timing.
* `test_failure_and_consistency.py` (7/7): SQLite failure logging, Jaccard overlap, Spearman rank correlation.
* `test_quality_eval.py` (7/7): Multi-rubric scoring math and Borda ranking stability.

### Benchmark Run Results on 50-Episode Pack
* **Official Run C:** Ingested 50 episodes (3,727 lines). Evaluated 138 candidates, rejected 36 invalid moments, producing **30 single cuts + 2 montages**. Mean duration: 42 seconds. 100% of generated promos strictly satisfied all hard duration and hook rules.
* **Run Consistency:** Comparing two independent AI executions (`Run C` vs `Run D`) confirmed that 4 out of the top 5 scenes matched identically, demonstrating high stability at the top of the ranking.
* **Planned vs Completed Tests:** Automated unit testing and benchmark evaluations are **completed**. Live conversion split testing (measuring actual CTR, hold rate, and cost-per-install on TikTok/Meta ads) is **planned** as the next operational milestone.

---

## 7. Limitations and the Human-in-the-Loop

1. **Text vs Video Reality:** HookScene reads screenplay text, not recorded video frames. An action line that reads dramatically in script format might have subdued acting or flat lighting in final footage.
2. **Lower-Rank Score Variance:** While the top 5–10 promo candidates are exceptionally stable across runs, scores for candidates ranked 20–30 exhibit natural LLM variance (0.5–1.0 point drift).
3. **Audio Sync Dependency:** The algorithm assumes script timestamps accurately match final edited episode footage.
4. **The Value of Human Review:** HookScene is an editorial multiplier, not an unmonitored publisher. In the Review Desk, an editor reviews 10 ranked candidates in 5 minutes rather than watching 50 episodes for 2 hours. Human review catches subjective platform humor, pacing preferences, and local ad-policy nuances.

---

## 8. AI Tools Used & Real Debugging Experience

### AI Tools Used During Development
* **Google Gemini (Flash & Pro):** Used in the pipeline for screenplay extraction, summarization, and rubric scoring.
* **Google Antigravity:** Agentic development assistant used to scaffold React components, configure Docker containerization, and implement automated Pytest suites.
* **Claude / ChatGPT:** Used during initial brainstorming and regex prototyping.

### Real Example: Where AI Failed and How It Was Corrected
During multi-file upload testing with custom scripts (`test-episode-01.txt`, `test-episode-06.txt`, `test-episode-07.txt`), an AI-generated regex in `parse.py` strictly expected the string `EPISODE NUMBER: Episode <num>`. Because the test files used headers like `TEST-01` and `Test Episode 06`, the regex silently failed, causing all three episodes to default to `Episode 00`. 

Inside the pipeline's episode map (`em = {e.num: e}`), Python silently overwritten `Episode 00` on each file, causing the pipeline to drop the first two episodes and only generate promos from the third file. 

**How it was identified and resolved:** 
I caught this by inspecting the Review Desk output, noticing that all candidates were marked `Ep. 00` and came from the last file. I corrected it by replacing the rigid regex with a flexible digit extractor that handles any prefix (`TEST-01`, `EP-06`, `Episode 7`), added a fallback to extract episode numbers directly from the filename, and introduced an automatic de-collision indexer in `load_show` so multiple uploaded files never overwrite each other.

---

### Candidate Submission Information
* **Student Name:** Krishna (krishna5632)
* **Problem Selected:** Problem 1 — Find the Promos (Ads)
* **GitHub Repository:** [https://github.com/krishna5632/HookScene](https://github.com/krishna5632/HookScene)
* **Live Prototype:** [https://hookscene-studio.onrender.com](https://hookscene-studio.onrender.com) *(or `docker-compose up -d` on `localhost:8080`)*
* **Unedited Raw Outputs:** Located in `results/official-run-C/` (`promos.md`, `promos.json`, `promos.csv`)
