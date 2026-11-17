import React from 'react';
import { ActiveTab } from '../types';
import { Zap, Play, CheckCircle2 } from 'lucide-react';

interface SpotlightHeroProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const SpotlightHero: React.FC<SpotlightHeroProps> = ({ setActiveTab }) => {
  return (
    <div className="pt-6 pb-10 px-4 sm:px-6">
      <div className="max-w-[1240px] mx-auto text-center">
        {/* 1. CENTRAL PIXEL BOX (MATCHING EXACT IMAGE 2) */}
        <div className="inline-block mb-6">
          <div className="bg-white border-2 border-black px-10 sm:px-20 py-5 sm:py-6 rounded-md shadow-craft-md">
            <h1 className="font-pixel text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider text-black select-none">
              HOOKSCENE
            </h1>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-widest text-[#2563eb]">
              <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
              <span className="uppercase">MICRODRAMA SCREENPLAY EXTRACTION STUDIO</span>
            </div>
          </div>
        </div>

        {/* 2. HEADLINE (MATCHING IMAGE 2) */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black tracking-tight leading-[1.2] mb-6">
          I extract promos that <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-emerald-600 bg-white text-emerald-600 text-sm align-middle mx-1 shadow-craft-xs">🎯</span> keep viewers hooked. <span className="align-middle inline-block">🌸</span>
        </h2>

        {/* 3. BUTTONS (MATCHING IMAGE 2) */}
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('run')}
            className="inline-flex items-center gap-2 bg-black hover:bg-stone-800 text-white font-mono text-xs sm:text-sm font-bold uppercase tracking-wider px-5 py-2.5 rounded border-2 border-black shadow-craft transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-craft-yellow" />
            <span>EXTRACT FROM SCREENPLAY</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 text-black font-mono text-xs sm:text-sm font-bold uppercase tracking-wider px-5 py-2.5 rounded border-2 border-black shadow-craft transition-all cursor-pointer"
          >
            <span>📊 VERIFY 32 OFFICIAL PICKS</span>
          </button>
        </div>

        {/* 4. PILL STICKERS (MATCHING IMAGE 2) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          <span className="bg-[#fef08a] text-black text-xs font-bold font-mono px-3 py-1 rounded border-2 border-black shadow-craft-xs">
            20-60s Safe Clips
          </span>
          <span className="bg-[#a7f3d0] text-black text-xs font-bold font-mono px-3 py-1 rounded border-2 border-black shadow-craft-xs">
            Hook Line ≤ 3.0s
          </span>
          <span className="bg-[#fda4af] text-black text-xs font-bold font-mono px-3 py-1 rounded border-2 border-black shadow-craft-xs">
            Unresolved Cliffhanger
          </span>
          <span className="bg-[#bfdbfe] text-black text-xs font-bold font-mono px-3 py-1 rounded border-2 border-black shadow-craft-xs">
            Zero Dialogue Truncation
          </span>
          <span className="bg-[#e9d5ff] text-black text-xs font-bold font-mono px-3 py-1 rounded border-2 border-black shadow-craft-xs">
            Borda Rank Aggregation
          </span>
        </div>

        {/* 5. TOP PICK CARD WITH YELLOW WASHI TAPE (MATCHING IMAGE 2) */}
        <div className="relative max-w-[940px] mx-auto text-left bg-white border-2 border-black rounded-lg p-5 shadow-craft-md">
          {/* Yellow washi tape strip at top left */}
          <div className="absolute -top-3 left-6 w-16 h-6 bg-[#fde047]/80 transform -rotate-1 border border-black/20 shadow-sm pointer-events-none"></div>

          {/* Top Metadata Row inside Card */}
          <div className="flex items-center gap-2.5 flex-wrap mb-4 pt-1">
            <span className="bg-craft-yellow text-black text-xs font-bold font-mono px-2.5 py-1 rounded border-2 border-black shadow-craft-xs">
              ★ OFFICIAL BENCHMARK TOP PICK
            </span>
            <span className="bg-white text-black text-xs font-mono font-bold px-2.5 py-1 rounded border-2 border-black">
              Episode 02 · 0:00-0:45 · 45s
            </span>
            <span className="bg-white text-black text-xs font-mono font-bold px-2.5 py-1 rounded border-2 border-black">
              Hook Attn: 71% · Hold: 81% · 100% Rule Safe
            </span>
          </div>

          {/* Body Split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Dialogues */}
            <div className="md:col-span-8 space-y-3">
              <div className="bg-[#fcfbf9] border-2 border-black rounded p-3">
                <span className="inline-block bg-[#a7f3d0] text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-black mb-1.5">
                  0s HOOK LINE
                </span>
                <p className="font-mono text-sm font-bold text-black">
                  "I cannot marry you, Juliana."
                </p>
              </div>

              <div className="bg-[#fcfbf9] border-2 border-black rounded p-3">
                <span className="inline-block bg-[#fda4af] text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-black mb-1.5">
                  45s CLIFFHANGER CUT
                </span>
                <p className="font-mono text-sm font-bold text-black">
                  "Do not disgrace us further..."
                </p>
              </div>
            </div>

            {/* Right Mini Timeline Preview */}
            <div className="md:col-span-4 h-full min-h-[110px] bg-[#fcfbf9] border-2 border-black rounded p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 font-bold">
                <span>0:00</span>
                <span className="text-black font-bold">45s CUT</span>
                <span>1:50</span>
              </div>
              <div className="relative w-full h-8 bg-stone-100 rounded border border-black overflow-hidden flex items-center">
                <div className="h-full bg-craft-yellow border-r-2 border-black" style={{ width: '40%' }}></div>
                <div className="absolute left-[40%] top-0 bottom-0 w-0.5 bg-rose-500"></div>
              </div>
              <span className="text-[10px] font-mono text-stone-500 text-center">
                Strict sentence boundary verified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
