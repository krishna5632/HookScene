/**
 * HookScene Architecture & Method Stage Inspector
 * Interactive node details, data contracts, and code links.
 */
(() => {
  const STAGE_DETAILS = {
    summary: {
      title: "Show Summary & Spoiler Vote",
      role: "LLM (Dual Model)",
      file: "backend/snipdeck/core/stages.py:make_summary",
      desc: "One model call processes the whole show's episode loglines and continuity notes to extract primary storylines, character dynamics, and key commercial tropes. A two-out-of-three consensus vote identifies late payoff twist episodes so they are not spoiled in promo trailers.",
      inputs: "Show loglines, continuity notes, episode synopsis.",
      outputs: "Show summary JSON, character map, spoiler episode set (e.g. [41, 44, 47]).",
      rule: "Spoilers are decided by majority vote across 3 passes to prevent run-to-run flipping.",
    },
    candidates: {
      title: "Candidate Moment Proposal",
      role: "LLM (Bulk Generation)",
      file: "backend/snipdeck/core/stages.py:generate_candidates",
      desc: "A fast, cost-efficient model reads each episode independently and proposes up to 3 candidate moments. Crucially, the model is strictly forbidden from writing timestamps; it only outputs screenplay line IDs (e.g. start: E07_L011, hook: E07_L014, cliffhanger: E07_L042).",
      inputs: "Episode script blocks with line IDs.",
      outputs: "3 proposed moments per episode (start_line, hook_line, cliffhanger_line).",
      rule: "Strict line-ID constraint prevents model arithmetic hallucinations and mid-sentence audio cuts.",
    },
    validate: {
      title: "Deterministic Validation & Repair",
      role: "Code (Zero AI)",
      file: "backend/snipdeck/core/validate.py:validate_clip",
      desc: "Pure Python code resolves line IDs into safe cut timestamps. Enforces hook ≤ 3s, duration 20–60s, cliffhanger cut, and safe boundary padding (no cuts while voice or sound effects play). If a candidate fails, code calculates legal line ranges and triggers a repair call.",
      inputs: "Proposed line IDs and episode line registry.",
      outputs: "Validated clips with exact millisecond timestamps and safe audio boundaries.",
      rule: "100% hard rule enforcement guarantee: no invalid clip can pass to scoring.",
    },
    score: {
      title: "Rubric Scoring & Doubt Quotes",
      role: "LLM (Strong Judge)",
      file: "backend/snipdeck/core/stages.py:score_promos",
      desc: "The judge model evaluates every valid candidate on a 6-criterion rubric: Hook Strength (3s), Cliffhanger Cutoff, Standalone Clarity, Dramatic Intensity, Plot Relevance, and Genre Fit. It quotes exact evidence and voices doubts before grading.",
      inputs: "Validated promo text excerpt and show context.",
      outputs: "6 numeric scores (1.0 to 5.0), open question string, and doubt note.",
      rule: "Prompt forces quotation of verbatim evidence before assigning scores, eliminating bias.",
    },
    rank: {
      title: "Listwise Ranking & Diversity",
      role: "Code + LLM",
      file: "backend/snipdeck/core/stages.py:final_order",
      desc: "The top 40 candidate clips are ranked 3 times in shuffled orders to eliminate position bias, aggregated using Borda count. Code then adds attention intelligence boosts, applies spoiler/ad-policy penalties, and runs MMR diversity selection (max 2 per episode).",
      inputs: "Top 40 scored clips.",
      outputs: "Rank-ordered promo deck with MMR diversity and spoiler dampening.",
      rule: "Borda rank combination achieves 80%+ stability across repeat runs.",
    },
    montage: {
      title: "Multi-Moment Montage Synthesis",
      role: "LLM + Code",
      file: "backend/snipdeck/core/stages.py:build_montages",
      desc: "Pairs 2 to 3 high-intensity moments from across the show into a continuous narrative montage trailer. The model verifies narrative escalation and temporal compatibility, while code enforces safe cut boundaries between segments.",
      inputs: "High-scoring candidate pool.",
      outputs: "Montage promos with multi-segment cuts.",
      rule: "Must satisfy 20–60s total duration across combined segments in chronological story order.",
    },
  };

  const cards = document.querySelectorAll(".arch-card[data-step]");
  const panel = document.getElementById("arch-panel");

  function showStep(stepKey) {
    const d = STAGE_DETAILS[stepKey] || STAGE_DETAILS.summary;
    cards.forEach((c) => c.classList.toggle("active", c.dataset.step === stepKey));

    if (panel) {
      panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary);">${d.title}</h3>
          <span style="font-family:var(--font-mono); font-size:0.75rem; padding:3px 8px; border-radius:4px; background:rgba(139,92,246,0.15); color:var(--accent-primary); border:1px solid rgba(139,92,246,0.3); font-weight:700;">${d.role}</span>
        </div>
        <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:16px;">${d.desc}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; font-size:0.82rem;">
          <div style="background:rgba(0,0,0,0.2); padding:10px 14px; border-radius:8px; border:1px solid var(--border-subtle);">
            <strong style="color:var(--text-muted); display:block; margin-bottom:4px; text-transform:uppercase; font-size:0.72rem;">Input Contract</strong>
            <span style="color:var(--text-primary);">${d.inputs}</span>
          </div>
          <div style="background:rgba(0,0,0,0.2); padding:10px 14px; border-radius:8px; border:1px solid var(--border-subtle);">
            <strong style="color:var(--text-muted); display:block; margin-bottom:4px; text-transform:uppercase; font-size:0.72rem;">Output Artifact</strong>
            <span style="color:var(--text-primary);">${d.outputs}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding-top:12px; border-top:1px solid var(--border-subtle); color:var(--text-muted);">
          <span>Hard Constraint: <strong style="color:var(--accent-cyan);">${d.rule}</strong></span>
          <code style="font-family:var(--font-mono); color:var(--accent-primary);">${d.file}</code>
        </div>
      `;
    }
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      showStep(card.dataset.step);
    });
  });

  // Default selection
  showStep("validate");
})();
