import React, { useState } from 'react';
import { Layers, CheckCircle2, Cpu, ArrowRight } from 'lucide-react';
import { TestVerificationSection } from './TestVerificationSection';

interface StageDetail {
  id: string;
  num: string;
  title: string;
  role: string;
  desc: string;
  rule: string;
}

const STAGES: StageDetail[] = [
  {
    id: 'summary',
    num: '01',
    title: 'Narrative Arc & Spoiler Suppression',
    role: 'LLM Consensus (2-of-3)',
    desc: 'Extracts core character arcs and identifies late payoff episodes (e.g. Eps 44–50) to strictly prevent early trailer spoilers.',
    rule: 'Majority voting across 3 passes ensures deterministic spoiler exclusion.',
  },
  {
    id: 'candidates',
    num: '02',
    title: 'Multi-Signal Candidate Extraction',
    role: 'LLM Generator (Line-IDs)',
    desc: 'Reads screenplay blocks and extracts high-tension spans evaluating Conflict, Surprise, Emotion, Suspense, Action, and Romance. Models output exact Line IDs (never raw timecodes), preventing arithmetic drift.',
    rule: 'Eliminates mid-sentence audio cuts and hallucinated cuts.',
  },
  {
    id: 'validate',
    num: '03',
    title: 'Deterministic Code Validation',
    role: 'Pure Python (Zero AI)',
    desc: 'Hard mathematical enforcement: strictly bounds duration to 20.0–60.0s, verifies hook start ≤ 3.0s, and checks dialogue safe pauses.',
    rule: 'Candidates failing constraints are automatically repaired or discarded.',
  },
  {
    id: 'score',
    num: '04',
    title: 'Dual-Judge Weighted Scoring',
    role: 'LLM Dual Judge & Disagreement Check',
    desc: 'Grades candidate promos across 5 weighted dimensions (Hook 25%, Cliffhanger 25%, Standalone 20%, Intensity 20%, Relevance 10%). Flags judge divergences >20% for human editorial review.',
    rule: 'Independent shuffled passes eliminate position-bias in scoring.',
  },
  {
    id: 'rank',
    num: '05',
    title: 'Listwise Ranking & Overlap Removal',
    role: 'MMR & Temporal De-duplication',
    desc: 'Performs listwise candidate comparisons, calculates exact temporal overlap, and de-duplicates overlapping timestamps (>60%), selecting the optimal top picks for the show.',
    rule: 'Near-duplicate grouping ensures maximum scene diversity for editors.',
  },
  {
    id: 'montage',
    num: '06',
    title: 'Montage Synthesis & CMX 3600 EDL',
    role: 'Assembly & Export Engine',
    desc: 'Pairs 2–3 complementary moments across episodes to construct fast-paced teasers, generating broadcast-ready CMX 3600 EDLs.',
    rule: 'Instant timeline import for Premiere Pro, DaVinci Resolve, and Final Cut Pro.',
  },
];

export const Architecture: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('summary');
  const activeStage = STAGES.find((s) => s.id === selectedId) || STAGES[0];

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Pipeline Architecture & Engineering
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          A hybrid neuro-symbolic design: language models identify emotional peaks while deterministic code strictly enforces editorial hard rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 6-Stage Flow */}
        <div className="lg:col-span-7 space-y-3">
          {STAGES.map((st) => {
            const isSelected = st.id === selectedId;
            return (
              <div
                key={st.id}
                onClick={() => setSelectedId(st.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50/40 border-[#E8A72D] shadow-xs translate-x-1'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      isSelected ? 'bg-[#E8A72D] text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {st.num}
                    </span>
                    <h3 className="font-semibold text-sm text-slate-900">{st.title}</h3>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {st.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-9">
                  {st.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right: Stage Deep-Dive */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-slate-950 bg-[#E8A72D] px-2.5 py-0.5 rounded">
                STAGE {activeStage.num}
              </span>
              <span className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                {activeStage.role}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {activeStage.title}
            </h2>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p>{activeStage.desc}</p>
              <div className="p-3.5 bg-amber-50/60 rounded-lg border border-amber-200">
                <span className="font-mono text-[10px] font-bold uppercase text-amber-800 block mb-1">
                  Enforcement Principle:
                </span>
                <span className="font-medium text-amber-950">{activeStage.rule}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                Neuro-symbolic execution
              </span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Deterministic
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 4: Edge-Case & Regression Verification Suite */}
      <TestVerificationSection />
    </div>
  );
};
