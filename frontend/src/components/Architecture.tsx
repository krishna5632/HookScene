import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Film,
  Award,
  Scissors,
  Share2,
  Zap,
  ChevronRight,
  Cpu,
  Clock,
  Sliders,
  Check,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface StageDetail {
  id: string;
  num: string;
  title: string;
  badge: string;
  engine: string;
  shortDesc: string;
  whatItDoes: string;
  whyItMatters: string;
  ruleGuarantee: string;
  inputData: string;
  outputArtifact: string;
  tags: string[];
  icon: React.ReactNode;
}

const STAGES: StageDetail[] = [
  {
    id: 'summary',
    num: '01',
    title: 'Scan Full Story & Block Spoilers',
    badge: 'Stage 1 · Story Safety',
    engine: 'Gemini Flash Consensus (2-of-3 Vote)',
    shortDesc: 'Analyzes all 50 episodes, maps core character relationships, and locks down late climax episodes to prevent trailer spoilers.',
    whatItDoes: 'HookScene ingests all 50 screenplay episodes to map out narrative arcs, character dynamics, and major plot payoffs. It uses a 3-pass consensus vote to detect late climax episodes (such as episodes 44–50) and flags them for trailer suppression.',
    whyItMatters: 'Trailers must build viewer curiosity without ruining the climax. If a TikTok teaser reveals the traitor or the final wedding twist, viewer retention and show completion collapse.',
    ruleGuarantee: 'Zero Ending Spoilers: Climax and resolution episodes are strictly locked down and excluded from promo candidate selection.',
    inputData: '50 Screenplay Episodes (SRT/VTT/TXT)',
    outputArtifact: 'Show Summary & Spoiler Episode Exclusion List',
    tags: ['Eps 44–50 Suppressed', 'Consensus Voting', 'Zero Ending Leaks'],
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'candidates',
    num: '02',
    title: 'Hunt for High-Drama Moments',
    badge: 'Stage 2 · Scene Hunter',
    engine: 'Multi-Signal LLM Detection (Line-IDs)',
    shortDesc: 'Scans dialogue for emotional peaks (betrayals, confrontations, love triangles) bookmarking exact line numbers.',
    whatItDoes: 'The AI searches through every dialogue line across all episodes looking for explosive emotional moments: altar betrayals, family disownments, slap confrontations, and romantic confessions. It outputs exact line IDs rather than floating timestamps to prevent drift.',
    whyItMatters: 'Audiences on TikTok and Reels decide whether to keep watching in the first 3 seconds. HookScene finds the most gripping dialogue hooks to arrest viewer attention.',
    ruleGuarantee: 'Natural Sentence Endings: Clips bookmark exact dialogue lines so cuts happen cleanly at audio pauses, never clipping actors mid-word.',
    inputData: 'Dialogue Blocks & Character Interactions',
    outputArtifact: 'Extracted Promo Candidates with Hook & Climax Spans',
    tags: ['6-Signal Emotional Radar', 'Exact Line-ID Anchors', 'No Mid-Word Cuts'],
    icon: <Film className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'validate',
    num: '03',
    title: 'Enforce Social Video Rules',
    badge: 'Stage 3 · Mathematical Gate',
    engine: 'Pure Python Code (Zero AI Guesswork)',
    shortDesc: 'Strict mathematical filter enforcing 20.0–60.0s duration, ≤3.0s hook onset, and safe audio sentence boundaries.',
    whatItDoes: 'Deterministic code measures every candidate against strict short-form video standards. Clips must strictly satisfy 20.0s to 60.0s duration, opening hooks must hit within the first 3.0 seconds, and timestamps must maintain chronological monotonicity.',
    whyItMatters: 'Social video algorithms penalize slow-starting content. If a video takes 10 seconds to get interesting, up to 80% of viewers scroll away before reaching the core drama.',
    ruleGuarantee: '100% Social Compliance: Any candidate under 20s, over 60s, or with a slow-starting hook is automatically repaired or discarded.',
    inputData: 'Raw Extracted Candidate Spans',
    outputArtifact: 'Validated & Repaired Candidates Pool',
    tags: ['Strict 20s–60s Duration', 'Hook Window ≤ 3.0s', 'Deterministic Rule Gate'],
    icon: <Scissors className="w-4 h-4 text-amber-600" />,
  },
  {
    id: 'score',
    num: '04',
    title: 'Two Independent AI Judges Score Each Clip',
    badge: 'Stage 4 · Quality Audit',
    engine: 'Dual-Judge Shuffled LLM Evaluation',
    shortDesc: 'Two independent AI judges evaluate candidates across 5 weighted dimensions, flagging divergences &gt; 20% for review.',
    whatItDoes: 'Two separate AI judges independently grade each promo across 5 editorial dimensions: 3-Second Hook (25%), Cliffhanger Suspense (25%), Standalone Clarity (20%), Emotional Intensity (20%), and Story Relevance (10%). Shuffled order eliminates position bias.',
    whyItMatters: 'A single AI judge can suffer from hallucinations, scoring bias, or prompt sensitivity. Running two independent judges guarantees fair, balanced quality ratings.',
    ruleGuarantee: 'Objective Quality Standard: Clips with judge disagreements >20% are flagged with warning badges for human editorial verification.',
    inputData: 'Validated Candidate Transcripts & Context',
    outputArtifact: 'Composite 0–100 Scores & Rubric Breakdowns',
    tags: ['Dual-Judge Consensus', '5 Weighted Rubrics', 'Divergence Detection'],
    icon: <Award className="w-4 h-4 text-purple-600" />,
  },
  {
    id: 'rank',
    num: '05',
    title: 'Pick Top 30 & Remove Repetitive Clips',
    badge: 'Stage 5 · Smart Curation',
    engine: 'MMR & Temporal IoU De-duplication',
    shortDesc: 'Ranks the best promos from #1 to #30 across the entire season, eliminating overlapping clips for maximum variety.',
    whatItDoes: 'HookScene ranks the best promos from #1 to #30 across the full 50-episode catalog. It computes temporal Intersection-over-Union (IoU); if two high-scoring clips overlap the same scene by more than 60%, it keeps only the single best variant.',
    whyItMatters: 'Video marketing teams need diverse promotional content across different episodes, character pairings, and emotional themes—not 10 repetitive versions of the exact same scene.',
    ruleGuarantee: 'Maximum Scene Diversity: Near-duplicate clustering ensures video editors receive 30 distinct, fresh promo opportunities.',
    inputData: 'Scored Candidate Pool across 50 Episodes',
    outputArtifact: 'Ranked Top 30 Standalone Promos',
    tags: ['Top 30 Selection', 'Temporal IoU De-dup', 'Catalog-Wide Variety'],
    icon: <Zap className="w-4 h-4 text-rose-600" />,
  },
  {
    id: 'montage',
    num: '06',
    title: 'Export Ready-to-Edit Video Timelines',
    badge: 'Stage 6 · Video Editor Export',
    engine: 'Multi-Format Timeline Assembly Engine',
    shortDesc: 'Synthesizes multi-scene montages and generates broadcast-ready timeline files for Premiere, Final Cut, and DaVinci.',
    whatItDoes: 'Combines complementary dramatic moments across different episodes to construct rapid-fire multi-scene cliffhanger montages. Generates broadcast-ready CMX 3600 EDLs, Final Cut Pro XML, CSV cue sheets, and Markdown reports.',
    whyItMatters: 'Video editors do not want text documents—they want timelines they can immediately drag into their video software and start trimming footage with zero friction.',
    ruleGuarantee: 'Broadcast-Ready Formats: Direct 1-click import into Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, and CapCut.',
    inputData: 'Top 30 Promos + Multi-Scene Montages',
    outputArtifact: 'CMX 3600 EDL, FCPXML, CSV & Markdown',
    tags: ['CMX 3600 EDL', 'Final Cut Pro XML', 'Premiere Pro Ready'],
    icon: <Share2 className="w-4 h-4 text-sky-600" />,
  },
];

export const Architecture: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('summary');
  const activeStage = STAGES.find((s) => s.id === selectedId) || STAGES[0];

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 pb-20">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-white mb-2 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>System Architecture & Pipeline Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          How HookScene Turns Screenplays into Viral Promos
        </h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-3xl leading-relaxed">
          A hybrid neuro-symbolic pipeline where <strong>Artificial Intelligence</strong> identifies dramatic peaks and <strong>Deterministic Code</strong> strictly enforces social video rules.
        </p>
      </div>

      {/* Modern Architecture Overview Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4.5 mb-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
          <div className="flex items-start gap-3 pt-2 md:pt-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block">1. AI Dramatic Discovery</span>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                Scans 50 episodes for emotional betrayal, romance, slaps, and cliffhangers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 md:pt-0 md:pl-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block">2. Strict Code Quality Gates</span>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                Strict 20–60s duration, ≤3.0s hook onset, clean audio pauses, zero spoilers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 md:pt-0 md:pl-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block">3. Dual-Judge Evaluation</span>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                Two independent AI judges grade 5 rubrics; divergences &gt; 20% trigger human review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 6-Stage Process Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        {/* Left: 6 Connected Pipeline Steps (Stepper Layout) */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-1 mb-3">
            <span className="font-semibold text-zinc-800">Sequential Execution Pipeline:</span>
            <span className="text-[11px] font-mono text-zinc-400">Stages 01 &rarr; 06</span>
          </div>

          <div className="relative space-y-3">
            {/* Connecting Vertical Guide Line */}
            <div className="absolute left-[26px] top-6 bottom-6 w-0.5 bg-zinc-200 -z-0 hidden sm:block"></div>

            {STAGES.map((st) => {
              const isSelected = st.id === selectedId;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedId(st.id)}
                  className={`relative z-10 p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-white border-zinc-900 shadow-md ring-1 ring-zinc-900/10'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Step Number Circle */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-zinc-900 text-white shadow-xs'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        {st.num}
                      </div>

                      <div>
                        {/* Title & Badge */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                            {st.title}
                          </h3>
                        </div>

                        {/* Summary description */}
                        <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">
                          {st.shortDesc}
                        </p>

                        {/* Quick Tag Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                          {st.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Chevron Indicator */}
                    <div className="shrink-0 pt-1">
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-zinc-900 translate-x-0.5' : 'text-zinc-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Stage Detail Spotlight Inspector (Spec Sheet) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm sticky top-24 space-y-4">
            {/* Top Bar with Stage & Engine */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white bg-zinc-900 px-2.5 py-1 rounded-md">
                  STAGE {activeStage.num}
                </span>
                <span className="text-xs font-semibold text-zinc-600">
                  {activeStage.badge}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Active Engine
              </span>
            </div>

            {/* Title & Engine Subtitle */}
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                {activeStage.icon}
                <span>{activeStage.title}</span>
              </h2>
              <span className="text-xs font-mono text-zinc-500 block mt-1">
                Engine: <strong className="text-zinc-700 font-sans">{activeStage.engine}</strong>
              </span>
            </div>

            {/* 3 Core Structured Explanations */}
            <div className="space-y-3 pt-1">
              {/* 1. What Happens Here */}
              <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-600" />
                  What Happens in this Stage:
                </span>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  {activeStage.whatItDoes}
                </p>
              </div>

              {/* 2. Why It Matters */}
              <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl">
                <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-zinc-600" />
                  Why It Matters for Video Marketing:
                </span>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {activeStage.whyItMatters}
                </p>
              </div>

              {/* 3. Guaranteed Safety Rule */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Deterministic Code Guarantee:
                </span>
                <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                  {activeStage.ruleGuarantee}
                </p>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="pt-3 border-t border-zinc-100">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                Stage Specifications
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-200/60">
                  <span className="text-[10px] text-zinc-400 block font-mono">INPUT DATA</span>
                  <span className="font-medium text-zinc-800 text-[11px] truncate block" title={activeStage.inputData}>
                    {activeStage.inputData}
                  </span>
                </div>
                <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-200/60">
                  <span className="text-[10px] text-zinc-400 block font-mono">OUTPUT ARTIFACT</span>
                  <span className="font-medium text-zinc-800 text-[11px] truncate block" title={activeStage.outputArtifact}>
                    {activeStage.outputArtifact}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer Guarantee */}
            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Automated Verification
              </span>
              <span className="text-zinc-700 font-semibold">100% Deterministic Gate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
