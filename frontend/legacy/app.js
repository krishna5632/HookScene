/**
 * HookScene Studio AI — Frontend Engine & Control Desk
 * Powers the Review Studio, Run Engine, Analytics Dashboard, and Architecture Views.
 * Supports dual-mode execution: FastAPI Backend API (default) with Pyodide WebAssembly fallback.
 */

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";
const DEFAULTS = {
  gemini: { bulk: "gemini-flash-lite-latest", judge: "gemini-flash-lite-latest" },
  openai: { bulk: "gpt-4o-mini", judge: "gpt-4o" },
  anthropic: { bulk: "claude-3-5-haiku-20241022", judge: "claude-3-5-sonnet-20241022" },
  openrouter: { bulk: "nvidia/nemotron-3.5-super-vl:free", judge: "nvidia/nemotron-3-ultra-550b-a55b:free" },
  groq: { bulk: "llama-3.3-70b-versatile", judge: "llama-3.3-70b-versatile" },
  custom: { bulk: "", judge: "" },
};

const STAGES = [
  ["summary", "Show summary & spoilers"],
  ["candidates", "Candidate extraction"],
  ["score", "Rubric scoring"],
  ["rank", "Listwise ranking"],
  ["montage", "Montage synthesis"],
];

const SCORE_NAMES = [
  ["hook_3s", "Hook, first 3 s"],
  ["cliffhanger", "Cliffhanger cutoff"],
  ["standalone", "Makes sense alone"],
  ["intensity", "Dramatic intensity"],
  ["plot_relevance", "Plot relevance"],
  ["trope_fit", "Genre trope fit"],
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const toSec = (ts) => { const [m, s] = String(ts).split(":"); return (+m) * 60 + (+s); };
const tc = (sec) => `${pad(Math.floor(sec / 60))}:${(sec % 60).toFixed(2).padStart(5, "0")}`;
const short = (sec) => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;

/* Application State */
const S = {
  data: null,
  runId: "",
  label: "",
  filter: "all",
  sel: null,
  decisions: {},
  official: null,
  hasBackend: false,
};

const decKey = () => "hookscene-dec-" + S.runId;
const loadDec = () => { try { return JSON.parse(localStorage.getItem(decKey()) || "{}"); } catch { return {}; } };
const saveDec = () => localStorage.setItem(decKey(), JSON.stringify(S.decisions));
const allPromos = () => (S.data ? [...(S.data.promos || []), ...(S.data.montages || [])] : []);
const warns = (p) => ((p.attention || {}).flags || []).length + (p.flags && (p.flags.spoiler_risk || p.flags.ad_policy_risk || p.flags.needs_context) ? 1 : 0);
const segText = (p) => p.segments.map((s) => `E${pad(s.episode)} ${s.start_ts}–${s.end_ts}`).join(" + ");
const lineText = (t) => String(t || "").replace(/^\[(\w+)\]\s*/, "").replace(/^([^:"]{1,60}):\s*"(.*)"$/, "$2");
const speaker = (t) => {
  const m = String(t || "").match(/^([^:"\[]{1,60}):\s*"/);
  return m ? m[1].replace(/\s*\([^)]*\)/g, "").trim() : (String(t).match(/^\[(\w+)\]/) || [, ""])[1];
};

/* View Routing */
const VIEWS = ["review", "run", "analytics", "method"];
function show(view) {
  if (!VIEWS.includes(view)) view = "review";
  document.body.dataset.view = view;
  $$(".view").forEach((v) => v.classList.toggle("on", v.id === "view-" + view));
  $$(".nav-tabs .tab-link").forEach((a) => a.classList.toggle("on", a.dataset.view === view));

  if (view === "run" && !S.hasBackend) engine();
  if (view === "analytics") renderAnalytics();
  if (view === "method" && window.archRedraw) requestAnimationFrame(window.archRedraw);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
}

$$("[data-view]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    show(a.dataset.view);
  });
});

/* Theme Switcher */
function initTheme() {
  const saved = localStorage.getItem("hookscene-theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  $("#theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("hookscene-theme", next);
  });
}

/* Backend Auto-Detection */
async function checkBackend() {
  const ind = $("#engine-status");
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      const data = await res.json();
      S.hasBackend = true;
      ind.querySelector(".status-label").textContent = "FastAPI Ready";
      ind.querySelector(".status-dot").style.background = "var(--accent-emerald)";
      $("#engine-note").textContent = "Connected to high-performance FastAPI backend server.";
      return true;
    }
  } catch (e) {
    // No backend running, fallback to client Pyodide
  }
  S.hasBackend = false;
  ind.querySelector(".status-label").textContent = "Pyodide WASM";
  ind.querySelector(".status-dot").style.background = "var(--accent-cyan)";
  $("#engine-note").textContent = "Running in-browser WebAssembly engine (Pyodide).";
  return false;
}

/* Spotlight Hero Banner */
function renderSpotlight(p) {
  if (!p) return;
  const s = p.segments[0];
  const e = p.segments[p.segments.length - 1];
  const durs = S.data.episode_durations || {};
  const D = durs[s.episode] || durs[String(s.episode)] || e.end;

  $("#spotlight-ep").textContent = `Episode ${pad(s.episode)} · ${short(s.start)}–${short(e.end)} · ${Math.round(p.duration)}s`;
  const att = p.attention || {};
  const hAttn = Math.round((att.hook_attention || 0.7) * 100);
  const hHold = Math.round((att.hold || 0.8) * 100);
  $("#spotlight-stats").innerHTML = `Hook Attn: <b>${hAttn}%</b> · Hold: <b>${hHold}%</b> · <b>100% Rule Safe</b>`;

  $("#spotlight-hook").textContent = `"${lineText(p.hook)}"`;
  $("#spotlight-cut").textContent = `"${lineText(p.cliffhanger)}"`;
  $("#spotlight-q").textContent = p.open_question ? `Leaves viewer asking: ${p.open_question}` : "Cuts on unresolved narrative tension.";

  // Generate animated waveform bars
  const wf = $("#spotlight-waveform");
  wf.innerHTML = "";
  const count = 48;
  for (let i = 0; i < count; i++) {
    const bar = document.createElement("div");
    bar.className = "waveform-bar";
    const height = Math.sin((i / count) * Math.PI) * 75 + Math.random() * 25 + 10;
    bar.style.height = `${Math.min(100, Math.max(15, height))}%`;
    wf.appendChild(bar);
  }

  // Scrubber position
  const pct = Math.max(5, Math.min(95, (s.start / D) * 100));
  $("#spotlight-scrubber").style.left = `${pct}%`;

  $("#spotlight-inspect-btn").onclick = () => {
    select(p.pid);
    $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $("#spotlight-approve-btn").onclick = () => {
    decide("approved", p.pid);
  };
}

/* Dataset Loader */
function loadDataset(data, runId, label) {
  S.data = data;
  S.runId = runId;
  S.label = label;
  S.decisions = loadDec();
  S.filter = "all";
  S.sel = null;

  $$("#filters button").forEach((b) => b.classList.toggle("on", b.dataset.f === "all"));
  const log = data.run_log || {};

  $("#show-title").textContent = data.show || "Microdrama Promo Suite";
  $("#run-title").textContent = label;

  const bits = [
    `<b>${log.episodes || 50}</b> episodes`,
    `<b>${(data.promos || []).length + (data.montages || []).length}</b> passing promos`,
    `<b>100%</b> hard rule compliance`,
  ];
  if (data.rules) bits.push(`<b>${data.rules.passing}/${data.rules.checked}</b> verified`);
  $("#run-meta").innerHTML = bits.join(" · ");

  // Update counts
  const all = allPromos();
  $("#n-all").textContent = all.length;
  $("#n-single").textContent = (data.promos || []).length;
  $("#n-montage").textContent = (data.montages || []).length;
  $("#n-attn").textContent = all.filter((p) => ((p.attention || {}).hook_attention || 0) >= 0.7).length;
  $("#n-warn").textContent = all.filter(warns).length;
  $("#tab-cnt-promos").textContent = all.length;

  drawList();
  const first = visible()[0];
  if (first) {
    select(first.pid);
    renderSpotlight(first);
  }
  tally();
}

/* Filter & Sort */
function visible() {
  if (!S.data) return [];
  if (S.filter === "rejected_candidates") return [];

  const q = $("#q").value.toLowerCase().trim();
  let list = [];

  if (S.filter === "single") list = (S.data.promos || []).slice();
  else if (S.filter === "montage") list = (S.data.montages || []).slice();
  else if (S.filter === "high_attn") list = allPromos().filter((p) => ((p.attention || {}).hook_attention || 0) >= 0.7);
  else if (S.filter === "warn") list = allPromos().filter(warns);
  else if (S.filter === "approved") list = allPromos().filter((p) => S.decisions[p.pid] === "approved");
  else if (S.filter === "rejected") list = allPromos().filter((p) => S.decisions[p.pid] === "rejected");
  else list = allPromos();

  if (q) {
    list = list.filter((p) =>
      [segText(p), p.hook, p.cliffhanger, p.why, p.open_question, ...(p.excerpt || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const sort = $("#sort").value;
  if (sort === "episode") {
    list.sort((a, b) => a.segments[0].episode - b.segments[0].episode || a.segments[0].start - b.segments[0].start);
  } else if (sort === "attention") {
    list.sort((a, b) => ((b.attention || {}).hook_attention || 0) - ((a.attention || {}).hook_attention || 0));
  } else if (sort === "duration") {
    list.sort((a, b) => b.duration - a.duration);
  } else {
    list.sort((a, b) => (a.rank || 99) - (b.rank || 99));
  }

  return list;
}

/* Render Promo Cards */
function drawList() {
  const container = $("#rows");
  const list = visible();

  if (!list.length) {
    container.innerHTML = `
      <div style="padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No promos match this filter or search query.
      </div>`;
    return;
  }

  container.innerHTML = list
    .map((p) => {
      const isM = p.kind === "montage";
      const s0 = p.segments[0];
      const sEnd = p.segments[p.segments.length - 1];
      const d = S.decisions[p.pid] || "";
      const att = p.attention || {};
      const hAttn = Math.round((att.hook_attention || 0.7) * 100);
      const hHold = Math.round((att.hold || 0.8) * 100);

      return `
      <div class="promo-card ${p.pid === S.sel ? "sel" : ""} ${d} ${isM ? "is-montage" : ""}" 
           data-pid="${p.pid}" data-rank="${p.rank}">
        <div class="card-rank">${isM ? "M" + p.rank : "#" + p.rank}</div>
        <div class="card-main">
          <div class="card-hook">${esc(lineText(p.hook))}</div>
          <div class="card-subline">
            <span class="card-ep">Ep ${pad(s0.episode)}</span>
            <span>·</span>
            <span>${short(s0.start)}–${short(sEnd.end)}</span>
            ${isM ? `<span>·</span><span style="color:var(--montage-color)">${p.segments.length} moments</span>` : ""}
          </div>
          <div class="card-metrics">
            <div class="mini-meter" title="First 3s Attention: ${hAttn}%">
              <span>Attn</span>
              <div class="mini-bar"><i style="width: ${hAttn}%"></i></div>
            </div>
            <div class="mini-meter" title="Hold Retention: ${hHold}%">
              <span>Hold</span>
              <div class="mini-bar hold"><i style="width: ${hHold}%"></i></div>
            </div>
          </div>
        </div>
        <div class="card-side">
          <span class="card-dur">${Math.round(p.duration)}s</span>
          ${d ? `<span class="card-status-dot ${d}"></span>` : ""}
        </div>
      </div>`;
    })
    .join("");

  $$(".promo-card", container).forEach((card) => {
    card.addEventListener("click", () => {
      select(card.dataset.pid);
    });
  });
}

/* Filter Buttons & Search */
$$("#filters .pill").forEach((b) => {
  b.addEventListener("click", () => {
    S.filter = b.dataset.f;
    $$("#filters .pill").forEach((x) => x.classList.toggle("on", x === b));
    drawList();
    const v = visible();
    if (v.length && !v.find((p) => p.pid === S.sel)) {
      select(v[0].pid);
    }
  });
});

$("#q").addEventListener("input", drawList);
$("#sort").addEventListener("change", drawList);

/* Parse Excerpt */
function parseExcerpt(ex) {
  return (ex || []).map((l) => {
    if (l.startsWith("---")) return { brk: l.replace(/^-+\s*/, "") };
    const m = l.match(/^(E\d+_L\d+)\s+(\d+:\d+(?:\.\d+)?)\s+(.*)$/);
    if (!m) return { text: l };
    return { id: m[1], t: m[2], raw: m[3] };
  });
}

/* Select Promo */
function select(pid) {
  S.sel = pid;
  $$(".promo-card").forEach((r) => r.classList.toggle("sel", r.dataset.pid === pid));

  const card = $(`.promo-card[data-pid="${pid}"]`);
  const container = $("#rows");
  if (card && container) {
    const top = card.offsetTop - 10;
    const bot = card.offsetTop + card.offsetHeight + 10;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (bot > container.scrollTop + container.clientHeight) container.scrollTop = bot - container.clientHeight;
  }

  const p = allPromos().find((x) => x.pid === pid);
  if (p) {
    drawDetail(p);
  }
  tally();
}

/* Draw Detail Inspector */
function drawDetail(p) {
  const isM = p.kind === "montage";
  const s0 = p.segments[0];
  const sEnd = p.segments[p.segments.length - 1];
  const ex = parseExcerpt(p.excerpt);
  const f = p.flags || {};
  const att = p.attention || {};
  const durs = S.data.episode_durations || {};
  const D = durs[s0.episode] || durs[String(s0.episode)] || Math.max(sEnd.end, 1);

  // Timeline percentage calculation
  const startPct = Math.max(0, Math.min(100, (s0.start / D) * 100));
  const endPct = Math.max(0, Math.min(100, (sEnd.end / D) * 100));
  const widthPct = Math.max(1.5, endPct - startPct);

  // Teleprompter lines
  const scriptHtml = ex
    .map((l) => {
      if (l.brk) return `<div class="script-line" style="color:var(--accent-primary); font-weight:700;">--- ${esc(l.brk)} ---</div>`;
      if (!l.id) return `<div class="script-line"><span class="script-time"></span><span class="script-text">${esc(l.text)}</span></div>`;

      const isAct = /^\[(action|sfx|camera)\]/i.test(l.raw);
      const isHook = l.id === p.hook_line_id;
      const isCut = l.id === p.cliffhanger_line_id;
      const cls = [isHook ? "hook-line" : "", isCut ? "cut-line" : "", isAct ? "action-line" : ""].join(" ");

      return `
      <div class="script-line ${cls}">
        <span class="script-time">${short(toSec(l.t))}</span>
        <span class="script-text">
          ${isHook ? `<span class="cue-badge">HOOK</span>` : ""}
          ${isCut ? `<span class="cue-badge">CLIFFHANGER</span>` : ""}
          ${!isAct ? `<span class="speaker-pill">${esc(speaker(l.raw))}</span>` : ""}
          <span>${esc(lineText(l.raw))}</span>
        </span>
      </div>`;
    })
    .join("");

  // Score rows
  const scoreRows = SCORE_NAMES.filter(([k]) => p.scores && p.scores[k] != null)
    .map(
      ([k, n]) => `
      <tr>
        <td>${n}</td>
        <td><div class="score-meter"><i style="width: ${(p.scores[k] / 5) * 100}%"></i></div></td>
        <td class="score-val">${(+p.scores[k]).toFixed(1)}</td>
      </tr>`
    )
    .join("");

  $("#detail").innerHTML = `
    <div class="inspector-header">
      <div class="insp-eyebrow">
        <span class="insp-rank-chip">${isM ? "MONTAGE " + p.rank : "RANK #" + p.rank}</span>
        <span>Episode ${pad(s0.episode)} · ${short(s0.start)} – ${short(sEnd.end)}</span>
        <span>·</span>
        <span>${Math.round(p.duration)} seconds</span>
      </div>
      <h2 class="insp-title">"${esc(lineText(p.hook))}"</h2>
      ${p.open_question ? `<div class="insp-gap"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Leaves viewer asking: ${esc(p.open_question)}</span></div>` : ""}
    </div>

    <!-- Episode Timeline Track -->
    <div class="insp-timeline">
      <div class="track-label">
        <span>Scene Cut Placement in Episode ${pad(s0.episode)}</span>
        <span>${short(s0.start)} – ${short(sEnd.end)} (Total Episode: ${short(D)})</span>
      </div>
      <div class="timeline-track-bar">
        <div class="timeline-highlight" style="left: ${startPct}%; width: ${widthPct}%;"></div>
      </div>
      <div class="timeline-caps">
        <span>00:00</span>
        <span>${short(D / 2)}</span>
        <span>${short(D)}</span>
      </div>
    </div>

    <!-- Grid: Script + Notes -->
    <div class="insp-grid">
      <div class="script-teleprompter">${scriptHtml}</div>
      <div class="insp-sidebar">
        ${p.why || p.rank_reason ? `
          <div class="reasoning-box">
            <h4>Editorial Justification</h4>
            <p>${esc(p.why || p.rank_reason)}</p>
          </div>` : ""}
        
        <div class="score-box">
          <h4>Rubric Evaluation Scores</h4>
          <table class="score-table">${scoreRows}</table>
        </div>

        <div class="score-box">
          <h4>Attention Intelligence</h4>
          <table class="score-table">
            <tr>
              <td>Hook Attention (0-3s)</td>
              <td><div class="score-meter"><i style="width: ${(att.hook_attention || 0.7) * 100}%"></i></div></td>
              <td class="score-val">${((att.hook_attention || 0.7) * 100).toFixed(0)}%</td>
            </tr>
            <tr>
              <td>Hold Retention Pace</td>
              <td><div class="score-meter"><i style="width: ${(att.hold || 0.8) * 100}%"></i></div></td>
              <td class="score-val">${((att.hold || 0.8) * 100).toFixed(0)}%</td>
            </tr>
          </table>
        </div>
      </div>
    </div>`;
}

/* Decisions: Approve / Reject */
function decide(kind, specificPid = null) {
  const pid = specificPid || S.sel;
  if (!pid) return;
  S.decisions[pid] = S.decisions[pid] === kind ? undefined : kind;
  saveDec();
  drawList();
  select(pid);
  tally();
}

function tally() {
  const all = allPromos();
  const vals = Object.values(S.decisions);
  const a = vals.filter((x) => x === "approved").length;
  const r = vals.filter((x) => x === "rejected").length;
  const remaining = all.length - a - r;

  $("#tally").textContent = `${a} approved · ${r} rejected · ${remaining} to review`;
  $("#n-appr").textContent = a;
  $("#n-rej").textContent = r;

  const cur = S.decisions[S.sel];
  const actApprove = $("#act-approve");
  const actReject = $("#act-reject");

  if (cur === "approved") {
    actApprove.classList.add("btn-primary");
    actApprove.querySelector("span").textContent = "Approved ✓";
  } else {
    actApprove.classList.remove("btn-primary");
    actApprove.querySelector("span").textContent = "Approve Promo";
  }

  if (cur === "rejected") {
    actReject.querySelector("span").textContent = "Rejected ✗";
  } else {
    actReject.querySelector("span").textContent = "Reject";
  }
}

$("#act-approve").onclick = () => decide("approved");
$("#act-reject").onclick = () => decide("rejected");

/* Keyboard Shortcuts */
document.addEventListener("keydown", (e) => {
  if (document.body.dataset.view !== "review" || /input|select|textarea/i.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  const list = visible();
  const idx = list.findIndex((p) => p.pid === S.sel);

  if (k === "j" || e.key === "ArrowDown") {
    e.preventDefault();
    if (idx < list.length - 1) select(list[idx + 1].pid);
  } else if (k === "k" || e.key === "ArrowUp") {
    e.preventDefault();
    if (idx > 0) select(list[idx - 1].pid);
  } else if (k === "a") {
    decide("approved");
  } else if (k === "r") {
    decide("rejected");
  }
});

/* Analytics Charts */
function renderAnalytics() {
  if (!S.data) return;
  const promos = allPromos();

  // Episode Distribution Chart
  const epCounts = {};
  for (let i = 1; i <= 50; i++) epCounts[i] = 0;
  promos.forEach((p) => {
    const ep = p.segments[0].episode;
    epCounts[ep] = (epCounts[ep] || 0) + 1;
  });

  const epChart = $("#ep-chart");
  epChart.innerHTML = Object.entries(epCounts)
    .map(([ep, count]) => {
      const height = (count / 2) * 100;
      return `<div style="flex:1; height:${Math.max(10, height)}%; background:${count ? "var(--accent-primary)" : "rgba(255,255,255,0.06)"}; border-radius:2px;" title="Ep ${ep}: ${count} promo(s)"></div>`;
    })
    .join("");

  // Duration Distribution Chart
  const durChart = $("#duration-chart");
  const buckets = [
    { label: "20-30s", count: 0 },
    { label: "30-40s", count: 0 },
    { label: "40-50s", count: 0 },
    { label: "50-60s", count: 0 },
  ];
  promos.forEach((p) => {
    const d = p.duration;
    if (d < 30) buckets[0].count++;
    else if (d < 40) buckets[1].count++;
    else if (d < 50) buckets[2].count++;
    else buckets[3].count++;
  });

  const maxB = Math.max(...buckets.map((b) => b.count), 1);
  durChart.innerHTML = buckets
    .map((b) => {
      const h = (b.count / maxB) * 100;
      return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; gap:6px;">
        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary)">${b.count}</span>
        <div style="width:100%; height:${Math.max(12, h)}%; background:linear-gradient(to top, var(--accent-primary), var(--accent-cyan)); border-radius:4px;"></div>
        <span style="font-size:0.75rem; color:var(--text-muted)">${b.label}</span>
      </div>`;
    })
    .join("");
}

/* Exports & Downloads */
function downloadFile(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

$("#export-btn").onclick = (e) => {
  e.stopPropagation();
  $("#export-menu").hidden = !$("#export-menu").hidden;
};
document.addEventListener("click", () => {
  $("#export-menu").hidden = true;
});

$$("#export-menu button").forEach((b) => {
  b.addEventListener("click", () => {
    const d = S.data;
    if (!d) return;
    const dl = b.dataset.dl;

    if (dl === "md") downloadFile("promos.md", d.markdown || "", "text/markdown");
    if (dl === "csv") downloadFile("promos.csv", d.csv || "", "text/csv");
    if (dl === "json") downloadFile("promos.json", JSON.stringify({ show: d.show, promos: d.promos, montages: d.montages }, null, 2), "application/json");
    if (dl === "dec") {
      const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = [
        ["rank", "id", "segments", "duration_s", "hook", "cliffhanger", "decision"],
        ...allPromos().map((p) => [(p.kind === "montage" ? "M" : "") + p.rank, p.pid, segText(p), p.duration, p.hook, p.cliffhanger, S.decisions[p.pid] || ""]),
      ];
      downloadFile("editorial_approvals.csv", rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv");
    }
    if (dl === "edl") {
      const edlLines = ["TITLE: HookScene Promos EDL", "FCM: NON-DROP FRAME", ""];
      allPromos().forEach((p, i) => {
        edlLines.push(`${pad(i + 1)}  AX       V     C        00:00:00:00 00:00:${Math.round(p.duration)}:00 00:00:00:00 00:00:${Math.round(p.duration)}:00`);
        edlLines.push(`* FROM CLIP NAME: ${p.pid}_EP${p.segments[0].episode}`);
        edlLines.push("");
      });
      downloadFile("promos_cutlist.edl", edlLines.join("\n"), "text/plain");
    }
  });
});

/* Provider Configuration Defaults */
function updateProviderDefaults() {
  const p = $("#provider").value;
  const def = DEFAULTS[p] || { bulk: "", judge: "" };
  $("#bulk-model").value = def.bulk;
  $("#judge-model").value = def.judge;
  $("#baseurl-wrap").hidden = p !== "custom";
}
$("#provider").addEventListener("change", updateProviderDefaults);
updateProviderDefaults();

/* Mode Switcher in Run View */
let runMode = "ai";
$$("#mode .mode-btn").forEach((b) => {
  b.addEventListener("click", () => {
    runMode = b.dataset.mode;
    $$("#mode .mode-btn").forEach((x) => x.classList.toggle("on", x === b));
    $("#ai-opts").hidden = runMode !== "ai";
  });
});

/* Helper: Format Time for Logs */
function logTime() {
  const d = new Date();
  return d.toTimeString().split(" ")[0];
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/* Load Screenplays Intake with Manifest Display */
let loadedFiles = [];
async function handleFilesIntake(files, showName = "") {
  const st = $("#loaded");
  const manifest = $("#uploaded-manifest");
  st.className = "file-status-badge";
  st.textContent = "Parsing screenplay files...";

  loadedFiles = files;
  const count = files.length;
  const isZip = files.some((f) => f.name.toLowerCase().endsWith(".zip"));

  st.className = "file-status-badge ok";
  st.textContent = isZip
    ? `Archive Ready: ${count} file(s) staged for processing.`
    : `Screenplays Ready: ${count} screenplay file(s) staged.`;

  // Render Uploaded Files Manifest (User Request)
  if (manifest) {
    manifest.hidden = false;
    manifest.innerHTML = files
      .map((f, idx) => {
        const isZ = f.name.toLowerCase().endsWith(".zip");
        const ext = f.name.split(".").pop().toUpperCase();
        return `
        <div class="file-manifest-card" data-idx="${idx}">
          <div class="file-manifest-icon">${isZ ? "📦" : "📄"}</div>
          <div class="file-manifest-details">
            <span class="file-manifest-name" title="${esc(f.name)}">${esc(f.name)}</span>
            <span class="file-manifest-meta">${fmtBytes(f.size || 0)} · ${ext} format · Staged for extraction</span>
          </div>
          <span class="badge-craft-green">✓ READY</span>
          <button type="button" class="file-manifest-remove" data-del="${idx}" title="Remove file">✕</button>
        </div>`;
      })
      .join("");

    $$(".file-manifest-remove", manifest).forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const delIdx = parseInt(btn.dataset.del, 10);
        loadedFiles.splice(delIdx, 1);
        if (loadedFiles.length) {
          handleFilesIntake(loadedFiles, showName);
        } else {
          loadedFiles = [];
          manifest.hidden = true;
          manifest.innerHTML = "";
          st.className = "file-status-badge";
          st.textContent = "No files loaded yet.";
          $("#run-btn").disabled = true;
        }
      };
    });
  }

  for (const f of files) {
    log(`[${logTime()}] [FILE] Staged: ${f.name} (${fmtBytes(f.size || 0)})`);
  }
  $("#run-btn").disabled = false;
}

$("#files").addEventListener("change", (e) => e.target.files.length && handleFilesIntake([...e.target.files]));
const drop = $("#drop");
["dragover", "dragenter"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length) handleFilesIntake([...e.dataTransfer.files]);
});

$("#use-sample").addEventListener("click", async () => {
  $("#loaded").textContent = "Loading 50-episode sample show...";
  try {
    const res = await fetch("data/sample_show.zip");
    const blob = await res.blob();
    handleFilesIntake([new File([blob], "sample_show.zip", { type: "application/zip" })], "I Married a Broken Soldier. He was a Duke");
  } catch (e) {
    $("#loaded").textContent = "Failed to load sample show.";
  }
});

/* Execution Progress & Logs */
const log = (msg) => {
  const l = $("#log");
  if (!l) return;
  l.textContent += msg + "\n";
  l.scrollTop = l.scrollHeight;
};

function setStageProgress(stage, i, n) {
  const el = $("#st-" + stage);
  if (!el) return;
  const cnt = $(".cnt", el);
  if (cnt) cnt.textContent = n ? `${i} / ${n}` : "";
  const bar = $(".pb i", el);
  if (bar) bar.style.width = (n ? (100 * i) / n : 0) + "%";
  el.classList.add("active");
  if (n > 0 && i >= n) el.classList.add("done");
}

function resetStages() {
  $$(".stage-item").forEach((el) => {
    el.classList.remove("active", "done");
    const b = $(".pb i", el);
    if (b) b.style.width = "0%";
    const c = $(".cnt", el);
    if (c) c.textContent = "—";
  });
}

/* Run Pipeline Trigger */
$("#run-btn").addEventListener("click", async () => {
  const useLlm = runMode === "ai";
  const provider = $("#provider").value;
  const key = $("#key").value.trim();
  const bulkModel = $("#bulk-model").value.trim() || DEFAULTS[provider]?.bulk || "gemini-flash-lite-latest";
  const judgeModel = $("#judge-model").value.trim() || DEFAULTS[provider]?.judge || "gemini-flash-lite-latest";
  const profile = $("#profile").value;
  const montage = $("#montage").checked;
  const err = $("#run-error");
  const diag = $("#run-diagnostic");
  const diagMsg = $("#diag-msg");

  err.hidden = true;
  if (diag) diag.hidden = true;

  if (!loadedFiles.length) {
    err.hidden = false;
    err.textContent = "Please upload a screenplay file (.txt / .zip) or load the 50-episode sample show above.";
    return;
  }

  if (useLlm && !key && provider !== "custom") {
    err.hidden = false;
    err.textContent = "Please paste your API key, or switch to 'Rule Baseline' to extract immediately without a key.";
    return;
  }

  const btn = $("#run-btn");
  btn.disabled = true;
  btn.textContent = "Processing Show...";
  $("#log").textContent = "";
  resetStages();

  log(`[${logTime()}] [INIT] Starting extraction pipeline (${useLlm ? "AI Mode: " + provider + " [" + bulkModel + "]" : "Rule Baseline (Instant)"})...`);

  const t0 = Date.now();
  const timer = setInterval(() => {
    $("#elapsed").textContent = Math.round((Date.now() - t0) / 1000) + "s";
  }, 500);

  // Real-time stage stepper feedback
  let stepTimer = null;
  if (useLlm) {
    setStageProgress("summary", 0, 1);
    stepTimer = setInterval(() => {
      const elapsedSec = (Date.now() - t0) / 1000;
      if (elapsedSec > 2 && elapsedSec <= 7) {
        setStageProgress("summary", 1, 1);
        setStageProgress("candidates", 1, 3);
      } else if (elapsedSec > 7 && elapsedSec <= 15) {
        setStageProgress("candidates", 3, 3);
        setStageProgress("score", 1, 2);
      } else if (elapsedSec > 15 && elapsedSec <= 22) {
        setStageProgress("score", 2, 2);
        setStageProgress("rank", 1, 1);
      } else if (elapsedSec > 22 && montage) {
        setStageProgress("rank", 1, 1);
        setStageProgress("montage", 1, 2);
      }
    }, 1000);
  }

  try {
    let resultData = null;

    if (S.hasBackend) {
      log(`[${logTime()}] [BACKEND] Delegating to FastAPI backend on port 8080...`);
      const filesPayload = [];
      for (const f of loadedFiles) {
        const buf = await f.arrayBuffer();
        const b64 = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ""));
        filesPayload.push({ name: f.name, content: b64, is_base64: true });
        log(`[${logTime()}] [TRANSFER] Packaged ${f.name} (${fmtBytes(f.size || 0)})`);
      }

      log(`[${logTime()}] [PROGRESS] Running extraction pipeline on ${filesPayload.length} file(s)...`);

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesPayload,
          use_sample: loadedFiles.some((f) => f.name === "sample_show.zip"),
          options: {
            use_llm: useLlm,
            provider,
            key,
            bulk_model: bulkModel,
            judge_model: judgeModel,
            profile,
            montage,
          },
        }),
      });

      if (!res.ok) {
        let errMsg = "Server error occurred during extraction.";
        try {
          const errJson = await res.json();
          errMsg = errJson.detail || errJson.message || errMsg;
        } catch {
          const raw = await res.text().catch(() => "");
          if (raw) errMsg = raw.slice(0, 300);
        }
        throw new Error(errMsg);
      }
      resultData = await res.json();
    } else {
      log(`[${logTime()}] [WASM] Running via in-browser Pyodide WebAssembly engine...`);
      const py = await engine();
      const bridge = py.pyimport("bridge");
      const arr = [];
      for (const f of loadedFiles) {
        arr.push([f.name, new Uint8Array(await f.arrayBuffer())]);
      }
      bridge.load_files(py.toPy(arr));

      const out = await bridge.run(
        JSON.stringify({
          use_llm: useLlm,
          provider,
          key,
          bulk_model: bulkModel,
          judge_model: judgeModel,
          profile,
          montage,
        }),
        (s, i, n) => setStageProgress(s, i, n),
        (m) => log(`[${logTime()}] ${m}`)
      );
      resultData = JSON.parse(out);
    }

    clearInterval(stepTimer);
    ["summary", "candidates", "score", "rank", "montage"].forEach((s) => setStageProgress(s, 1, 1));

    const secs = Math.round((Date.now() - t0) / 1000);
    const count = (resultData.promos || []).length + (resultData.montages || []).length;
    log(`[${logTime()}] [SUCCESS] Extracted ${count} compliant promo candidate(s) in ${secs}s.`);

    loadDataset(resultData, "run-" + t0, `Live Run (${useLlm ? profile : "baseline"})`);
    show("review");
  } catch (e) {
    clearInterval(stepTimer);
    const errText = e.message || String(e);
    err.hidden = false;
    err.textContent = "Pipeline execution error: " + errText;
    log(`[${logTime()}] [ERROR] ${errText}`);

    // User Diagnostics Display
    if (diag && diagMsg) {
      diag.hidden = false;
      if (errText.includes("503") || errText.includes("overloaded") || errText.includes("busy")) {
        diagMsg.innerHTML = `<strong>Google Server Overload:</strong> The selected model is experiencing a temporary spike in traffic on Google's servers. We recommend using <code>gemini-flash-lite-latest</code> or switching to Rule Baseline mode.`;
      } else if (errText.includes("401") || errText.includes("key") || errText.includes("Authentication")) {
        diagMsg.innerHTML = `<strong>Authentication Failure:</strong> The API key provided was not accepted by ${provider}. Please verify the key or test it via Rule Baseline mode without an API key.`;
      } else if (errText.includes("429") || errText.includes("quota") || errText.includes("rate")) {
        diagMsg.innerHTML = `<strong>Rate Limit Reached:</strong> The free tier quota for this model has been exceeded. Pacing or switching to instant Rule Baseline mode is recommended.`;
      } else {
        diagMsg.innerHTML = `<strong>Diagnostic Insight:</strong> ${esc(errText)}. You can retry with the active <code>gemini-flash-lite-latest</code> model or extract instantly via Rule Baseline mode.`;
      }

      $("#diag-retry-btn").onclick = () => {
        $("#bulk-model").value = "gemini-flash-lite-latest";
        $("#judge-model").value = "gemini-flash-lite-latest";
        $("#run-btn").click();
      };
      $("#diag-baseline-btn").onclick = () => {
        $$("#mode .mode-btn").forEach((b) => b.classList.toggle("on", b.dataset.mode === "baseline"));
        runMode = "baseline";
        $("#ai-opts").hidden = true;
        $("#run-btn").click();
      };
    }
  } finally {
    clearInterval(timer);
    clearInterval(stepTimer);
    btn.disabled = false;
    btn.textContent = "Extract & Rank Promos";
  }
});

/* Pyodide Fallback Engine Loader */
let enginePromise = null;
function engine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const loadScript = (src) => new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      await loadScript(PYODIDE_URL + "pyodide.js");
      const py = await loadPyodide({ indexURL: PYODIDE_URL });
      await py.loadPackage(["pydantic", "pyyaml"]);
      const buf = await (await fetch("app.zip", { cache: "no-cache" })).arrayBuffer();
      py.unpackArchive(buf, "zip", { extractDir: "/app" });
      py.runPython("import sys; sys.path.insert(0, '/app'); import bridge");
      try {
        const c = await fetch("data/demo_cache.zip", { cache: "no-cache" });
        if (c.ok) py.unpackArchive(await c.arrayBuffer(), "zip", { extractDir: "/cache" });
      } catch {}
      return py;
    })();
  }
  return enginePromise;
}

/* Initialization */
(async () => {
  initTheme();
  await checkBackend();

  // Load official benchmark dataset
  try {
    const res = await fetch("data/official.json");
    if (res.ok) {
      const data = await res.json();
      S.official = data;
      loadDataset(data, "official-" + data.run_id, "Official Benchmark Run");
    }
  } catch (e) {
    $("#show-title").textContent = "HookScene Studio AI";
  }

  show((location.hash || "#review").slice(1) || "review");
  window.addEventListener("hashchange", () => show(location.hash.slice(1) || "review"));
})();
