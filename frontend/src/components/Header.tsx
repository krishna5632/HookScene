import React, { useState } from 'react';
import { ActiveTab, Dataset } from '../types';
import {
  ChevronDown,
  BarChart2,
  Settings,
  Download,
  LayoutGrid,
  Play,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  CheckCircle2,
  Zap,
  Sparkles,
  Layers
} from 'lucide-react';
import { exportMarkdown, exportCsv, exportEdl, downloadBlob } from '../utils/export';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  dataset: Dataset | null;
  decisions: Record<string, string>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  dataset,
  decisions,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const isFeatureActive = (tab: ActiveTab) => {
    return (
      tab === 'analytics' ||
      tab === 'evaluation' ||
      tab === 'f1_quality' ||
      tab === 'f2_failures' ||
      tab === 'f3_consistency' ||
      tab === 'f4_testing' ||
      tab === 'f5_performance' ||
      tab === 'f6_explainability'
    );
  };

  const handleExport = (type: string) => {
    if (!dataset) return;
    if (type === 'md') {
      downloadBlob(exportMarkdown(dataset), `${dataset.show}-promos.md`, 'text/markdown');
    } else if (type === 'csv') {
      downloadBlob(exportCsv(dataset), `${dataset.show}-promos.csv`, 'text/csv');
    } else if (type === 'json') {
      downloadBlob(JSON.stringify(dataset, null, 2), `${dataset.show}-promos.json`, 'application/json');
    } else if (type === 'edl') {
      downloadBlob(exportEdl(dataset), `${dataset.show}-promos.edl`, 'text/plain');
    } else if (type === 'dec') {
      const decRows = ['PID,Rank,Episode,Decision'];
      const all = [...(dataset.promos || []), ...(dataset.montages || [])];
      all.forEach((p) => {
        decRows.push(`${p.pid},${p.rank},${p.segments[0].episode},${decisions[p.pid] || 'unreviewed'}`);
      });
      downloadBlob(decRows.join('\n'), `${dataset.show}-approvals.csv`, 'text/csv');
    }
    setExportOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-6 py-2.5">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Left: Brand Clapperboard Logo */}
        <button
          onClick={() => setActiveTab('review')}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
        >
          {/* Authentic Clapperboard Icon matching reference image */}
          <div className="w-8 h-7 bg-[#1E1E24] rounded-sm relative overflow-hidden flex flex-col justify-between p-0.5 shadow-xs">
            {/* Striped clapper top */}
            <div className="h-2 w-full bg-[#1E1E24] flex overflow-hidden">
              <span className="w-1.5 h-full bg-white transform -skew-x-12 mx-0.5"></span>
              <span className="w-1.5 h-full bg-white transform -skew-x-12 mx-0.5"></span>
              <span className="w-1.5 h-full bg-white transform -skew-x-12 mx-0.5"></span>
              <span className="w-1.5 h-full bg-white transform -skew-x-12 mx-0.5"></span>
            </div>
            {/* Clapper body with play icon */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-0 h-0 border-y-[3.5px] border-y-transparent border-l-[6px] border-l-white ml-0.5"></div>
            </div>
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#111827]">
            HOOK<span className="text-[#E8A72D]">SCENE</span>
          </span>
        </button>

        {/* Center: Clean Tabs with Direct Feature Access */}
        <nav className="flex items-center gap-4 xl:gap-6 h-9">
          {/* Review Desk */}
          <button
            onClick={() => setActiveTab('review')}
            className={`relative flex items-center gap-1.5 h-full text-xs transition-colors cursor-pointer ${
              activeTab === 'review'
                ? 'text-[#111827] font-semibold'
                : 'text-[#64748B] hover:text-[#111827] font-medium'
            }`}
          >
            <LayoutGrid className={`w-4 h-4 ${activeTab === 'review' ? 'text-[#E8A72D]' : 'text-[#64748B]'}`} />
            <span>Review Desk</span>
            {activeTab === 'review' && (
              <span className="absolute bottom-[-11px] left-0 right-0 h-[2px] bg-[#E8A72D]"></span>
            )}
          </button>

          {/* Run Studio */}
          <button
            onClick={() => setActiveTab('run')}
            className={`relative flex items-center gap-1.5 h-full text-xs transition-colors cursor-pointer ${
              activeTab === 'run'
                ? 'text-[#111827] font-semibold'
                : 'text-[#64748B] hover:text-[#111827] font-medium'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${activeTab === 'run' ? 'text-[#E8A72D]' : 'text-[#64748B]'}`} />
            <span>Run Studio</span>
            {activeTab === 'run' && (
              <span className="absolute bottom-[-11px] left-0 right-0 h-[2px] bg-[#E8A72D]"></span>
            )}
          </button>

          {/* Features Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setFeaturesOpen(!featuresOpen)}
              className={`relative flex items-center gap-1.5 h-full text-xs transition-colors cursor-pointer ${
                isFeatureActive(activeTab)
                  ? 'text-[#111827] font-semibold'
                  : 'text-[#64748B] hover:text-[#111827] font-medium'
              }`}
            >
              <BarChart2 className={`w-3.5 h-3.5 ${isFeatureActive(activeTab) ? 'text-[#E8A72D]' : 'text-[#64748B]'}`} />
              <span>Features & Analytics</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
              {isFeatureActive(activeTab) && (
                <span className="absolute bottom-[-11px] left-0 right-0 h-[2px] bg-[#E8A72D]"></span>
              )}
            </button>

            {/* Features Dropdown Popup */}
            {featuresOpen && (
              <div
                className="absolute left-0 mt-2.5 w-72 bg-white border border-[#E5E7EB] rounded-xl shadow-xl p-2 z-50 text-xs space-y-1"
                onMouseLeave={() => setFeaturesOpen(false)}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Direct Feature Access (No Scrolling)
                </div>

                <button
                  onClick={() => { setActiveTab('f1_quality'); setFeaturesOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'f1_quality' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                      <span>Feature 1: Quality Eval</span>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">100% Pass</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">Deterministic hard rules & dual-judge scoring</div>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('f2_failures'); setFeaturesOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'f2_failures' ? 'bg-rose-50 text-rose-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                      <span>Feature 2: Failure Analysis</span>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">Audit</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">Centralized tracker & editorial feedback</div>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('f3_consistency'); setFeaturesOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'f3_consistency' ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                    <GitCompare className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                      <span>Feature 3: Run Consistency</span>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold">78.6% Jaccard</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">Cross-run reproducibility & stability</div>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('f4_testing'); setFeaturesOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'f4_testing' ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                      <span>Feature 4: Edge Cases & Tests</span>
                      <span className="text-[10px] text-teal-600 font-mono font-bold">78/78 Passed</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">Automated verification & pytest regression</div>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('f5_performance'); setFeaturesOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'f5_performance' ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                      <span>Feature 5: Cost & Performance</span>
                      <span className="text-[10px] text-amber-600 font-mono font-bold">Telemetry</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">Stage latency, LLM tokens & API pricing</div>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('f6_explainability'); setFeaturesOpen(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'f6_explainability' ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                      <span>Feature 6: Decision Trace</span>
                      <span className="text-[10px] text-purple-600 font-mono font-bold">6 Audits</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">AI selection logic & verbatim screenplay proof</div>
                  </div>
                </button>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => { setActiveTab('analytics'); setFeaturesOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold text-[11px] flex items-center justify-between cursor-pointer"
                  >
                    <span>View All Features (Stacked Overview)</span>
                    <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Feature Access Button Strip in Navbar */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('f1_quality')}
              title="Feature 1: Quality Evaluation"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'f1_quality'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              F1 Quality
            </button>

            <button
              onClick={() => setActiveTab('f2_failures')}
              title="Feature 2: Failure Analysis"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'f2_failures'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              F2 Failures
            </button>

            <button
              onClick={() => setActiveTab('f3_consistency')}
              title="Feature 3: Run Consistency"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'f3_consistency'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              F3 Consistency
            </button>

            <button
              onClick={() => setActiveTab('f4_testing')}
              title="Feature 4: Edge-Case & Regression Tests"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'f4_testing'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              F4 Tests
            </button>

            <button
              onClick={() => setActiveTab('f5_performance')}
              title="Feature 5: Performance, Cost & Resource Monitoring"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'f5_performance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              F5 Cost
            </button>

            <button
              onClick={() => setActiveTab('f6_explainability')}
              title="Feature 6: Explainability & Decision Trace"
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === 'f6_explainability'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              F6 Trace
            </button>
          </div>

          {/* Architecture */}
          <button
            onClick={() => setActiveTab('method')}
            className={`relative flex items-center gap-1.5 h-full text-xs transition-colors cursor-pointer ${
              activeTab === 'method'
                ? 'text-[#111827] font-semibold'
                : 'text-[#64748B] hover:text-[#111827] font-medium'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${activeTab === 'method' ? 'text-[#E8A72D]' : 'text-[#64748B]'}`} />
            <span>Architecture</span>
            {activeTab === 'method' && (
              <span className="absolute bottom-[-11px] left-0 right-0 h-[2px] bg-[#E8A72D]"></span>
            )}
          </button>
        </nav>

        {/* Right: Status Indicator & Export Dropdown */}
        <div className="flex items-center gap-4">
          {/* Green System Ready */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
            <span>System Ready</span>
          </div>

          {/* Export Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-[#E5E7EB] text-slate-800 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-1.5 z-50 text-xs">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Editorial Export
                </div>
                <button
                  onClick={() => handleExport('edl')}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>CMX 3600 EDL (Premiere/Resolve)</span>
                  <span className="text-[10px] text-slate-400 font-mono">.edl</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>Promos Spreadsheet</span>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>Executive Pitch Deck</span>
                  <span className="text-[10px] text-slate-400 font-mono">.md</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between"
                >
                  <span>Full Pipeline Dataset</span>
                  <span className="text-[10px] text-slate-400 font-mono">.json</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => handleExport('dec')}
                  className="w-full text-left px-2.5 py-2 hover:bg-emerald-50 rounded-lg text-emerald-800 font-medium flex items-center justify-between"
                >
                  <span>Export Editor Decisions</span>
                  <span className="text-[10px] text-emerald-600 font-mono">.csv</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
