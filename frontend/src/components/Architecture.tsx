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
} from 'lucide-react';
import { TestVerificationSection } from './TestVerificationSection';

interface StageDetail {
  id: string;
  num: string;
  title: string;
  simpleRole: string;
  whatItDoes: string;
  whyItMatters: string;
  ruleGuarantee: string;
  icon: React.ReactNode;
}

const STAGES: StageDetail[] = [
  {
    id: 'summary',
    num: '01',
    title: 'Scan Full Story & Block Spoilers',
    simpleRole: 'Story Understanding & Safety',
    whatItDoes: 'HookScene reads all 50 screenplay episodes to map out main characters, storylines, and major secrets. It automatically identifies the climax and ending episodes (such as episodes 44–50).',
    whyItMatters: 'Trailers and social promos should build curiosity, not ruin the story. If a promo reveals who the killer is or the final wedding twist, viewers won\'t watch the full series.',
    ruleGuarantee: 'Zero Ending Spoilers: Climax and final resolution episodes are locked down and never used in promotional teasers.',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'candidates',
    num: '02',
    title: 'Hunt for High-Drama Moments',
    simpleRole: 'Emotional Peak Hunter',
    whatItDoes: 'The AI searches through every dialogue line across all episodes looking for explosive emotional moments: altar betrayals, family disownments, slap confrontations, and romantic confessions.',
    whyItMatters: 'Microdrama audiences on TikTok and Reels decide whether to watch in the first 3 seconds. HookScene finds the most gripping moments to arrest viewer attention.',
    ruleGuarantee: 'Natural Sentence Endings: Clips bookmark exact dialogue lines so cuts happen cleanly at pauses, never clipping actors mid-word.',
    icon: <Film className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'validate',
    num: '03',
    title: 'Enforce Social Video Rules',
    simpleRole: 'Strict Mathematical Code Filter',
    whatItDoes: 'Pure code (with zero AI guesswork) strictly measures every candidate against strict social video standards. Clips must be between 20 and 60 seconds long, and the dramatic hook line must start within the first 3.0 seconds.',
    whyItMatters: 'Social video algorithms penalize slow-starting videos. If a video takes 10 seconds to get interesting, 80% of viewers scroll away.',
    ruleGuarantee: '100% Social Compliance: Any candidate under 20s, over 60s, or with a slow-starting hook is automatically adjusted or discarded.',
    icon: <Scissors className="w-4 h-4 text-amber-600" />,
  },
  {
    id: 'score',
    num: '04',
    title: 'Two Independent AI Judges Score Each Clip',
    simpleRole: 'Dual-Judge Quality Audit',
    whatItDoes: 'Two separate AI judges independently grade each promo like a Hollywood promo editor: How punchy is the opening hook? Does the ending cut create an unresolved cliffhanger? Can a brand new viewer understand the conflict?',
    whyItMatters: 'Using two independent judges eliminates bias and hallucination. If both judges disagree by more than 20%, HookScene flags the clip for human editorial review.',
    ruleGuarantee: 'Objective Grading: Every candidate gets a balanced 0–100 score based on 5 weighted dimensions before moving forward.',
    icon: <Award className="w-4 h-4 text-purple-600" />,
  },
  {
    id: 'rank',
    num: '05',
    title: 'Pick Top 30 & Remove Repetitive Clips',
    simpleRole: 'Smart Variety & Ranking',
    whatItDoes: 'HookScene ranks the best promos from #1 to #30 across the entire 50-episode show. If two high-scoring clips overlap the exact same scene, HookScene keeps only the best one.',
    whyItMatters: 'Video marketing teams need diverse promotional content across different episodes, character pairings, and emotional themes—not 10 variations of the same scene.',
    ruleGuarantee: 'Maximum Scene Diversity: Eliminates repetitive near-duplicate clips so editors receive 30 distinct, ready-to-run promos.',
    icon: <Zap className="w-4 h-4 text-rose-600" />,
  },
  {
    id: 'montage',
    num: '06',
    title: 'Export Ready-to-Edit Video Timelines',
    simpleRole: 'Video Editor Timeline Export',
    whatItDoes: 'Exports all top promos and multi-scene cliffhanger montages into standard video editor timelines (Final Cut Pro XML, Premiere Pro EDL, CSV, and Markdown).',
    whyItMatters: 'Video editors do not want text files—they want timelines they can immediately drag into their video software and start cutting footage.',
    ruleGuarantee: 'Broadcast-Ready: Direct 1-click import into Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, and CapCut.',
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>How HookScene Works · 6-Step Promo Intelligence Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-[#18181B] tracking-tight">
          Pipeline Architecture & How It Works
        </h1>
        <p className="text-sm text-[#71717A] mt-1 max-w-3xl leading-relaxed">
          How HookScene automatically transforms 50 raw microdrama screenplay episodes into viral, broadcast-ready 20–60s video teasers.
        </p>
      </div>

      {/* 30-Second Summary Callout Card for Everyone */}
      <div className="bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200 rounded-2xl p-4.5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-600 block mb-0.5">
              The 30-Second Summary for Reviewers
            </span>
            <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
              <strong>Artificial Intelligence (LLMs)</strong> finds the emotional drama (betrayals, confrontations, love triangles), while <strong>Pure Mathematical Code</strong> strictly enforces the video rules (20–60s length, hook in first 3s, no audio clipping, and zero spoilers).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>AI finds drama · Code enforces rules</span>
        </div>
      </div>

      {/* Main 6-Stage Process Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        {/* Left: 6 Interactive Stage Cards */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1 mb-1">
            <span>Click any step to inspect how it works:</span>
            <span className="text-[11px] font-mono">Steps 01 to 06</span>
          </div>

          {STAGES.map((st) => {
            const isSelected = st.id === selectedId;
            return (
              <div
                key={st.id}
                onClick={() => setSelectedId(st.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-2 border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-400 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {st.num}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {st.icon}
                      <h3 className="font-bold text-sm text-slate-900">{st.title}</h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {st.simpleRole}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-10">
                  {st.whatItDoes}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right: Stage Detail Spotlight Card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-white bg-indigo-600 px-3 py-1 rounded-lg">
                STEP {activeStage.num} OF 06
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                {activeStage.simpleRole}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {activeStage.icon}
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {activeStage.title}
              </h2>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              {/* What HookScene Does */}
              <div>
                <span className="font-bold text-slate-900 block mb-1">What Happens Here:</span>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {activeStage.whatItDoes}
                </p>
              </div>

              {/* Why It Matters */}
              <div>
                <span className="font-bold text-slate-900 block mb-1">Why It Matters:</span>
                <p className="leading-relaxed text-slate-600">
                  {activeStage.whyItMatters}
                </p>
              </div>

              {/* Rule Guarantee */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <span className="font-mono text-[10px] font-bold uppercase text-emerald-900 block mb-1">
                  Guaranteed Safety Rule:
                </span>
                <span className="font-semibold text-emerald-800 text-[11px] leading-relaxed block">
                  {activeStage.ruleGuarantee}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Fully Automated Step
              </span>
              <span className="text-indigo-600 font-semibold font-mono">
                100% Deterministic Guarantee
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
