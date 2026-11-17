import React, { useState } from 'react';
import { ActiveTab, Dataset } from '../types';
import {
  Download,
  ChevronDown,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { exportMarkdown, exportCsv, exportEdl, downloadBlob } from '../utils/export';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  dataset: Dataset | null;
  decisions: Record<string, string>;
  onOpenApiKeyModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  dataset,
  decisions,
  onOpenApiKeyModal,
}) => {
  const [exportOpen, setExportOpen] = useState(false);

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
      dataset.promos.forEach((p) => {
        decRows.push(`${p.pid},${p.rank},${p.segments[0]?.episode || 1},${decisions[p.pid] || 'pending'}`);
      });
      downloadBlob(decRows.join('\n'), `${dataset.show}-decisions.csv`, 'text/csv');
    }
    setExportOpen(false);
  };

  const getPageTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'review':
        return 'Review Desk';
      case 'run':
        return 'Run Studio';
      case 'analytics':
        return 'Performance Analytics';
      case 'f1_quality':
        return 'Feature 1: Quality Rubric Audit';
      case 'f2_failures':
        return 'Feature 2: Hard Rule Validation';
      case 'f3_consistency':
        return 'Feature 3: Repeatability & Consistency';
      case 'f4_testing':
        return 'Feature 4: Test Suite & Ground Truth';
      case 'f5_performance':
        return 'Feature 5: Cost, Tokens & Resource Latency';
      case 'f6_explainability':
        return 'Feature 6: Decision Traceability & Attributions';
      case 'method':
        return 'Architecture & Engine Pipeline';
      case 'evaluation':
        return 'Quality Assessment';
      default:
        return 'Studio';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200/80 px-6 flex items-center justify-between z-20 select-none">
      {/* Left: Breadcrumbs & Current Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
          <span className="text-neutral-900 font-semibold">HookScene</span>
          <span>/</span>
          <span className="text-neutral-800 font-medium">{getPageTitle(activeTab)}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Pipeline v2.4 Online</span>
        </div>
      </div>

      {/* Right Action Controls (TwelveLabs Header Style) */}
      <div className="flex items-center gap-3">
        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 text-xs font-semibold bg-white shadow-xs transition-colors"
          >
            <Download size={14} className="text-neutral-500" />
            <span>Export</span>
            <ChevronDown size={13} className="text-neutral-400" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-neutral-200 py-1.5 z-50 text-xs font-medium">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400">
                Editorial Deliverables
              </div>
              <button
                onClick={() => handleExport('md')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
              >
                <FileText size={14} className="text-amber-500" />
                <span>Markdown Report (.md)</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
              >
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span>Promos Spreadsheet (.csv)</span>
              </button>
              <button
                onClick={() => handleExport('edl')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
              >
                <Film size={14} className="text-blue-500" />
                <span>NLE Timeline Cutlist (.edl)</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
              >
                <FileCode size={14} className="text-purple-500" />
                <span>Full Telemetry JSON (.json)</span>
              </button>
              <div className="border-t border-neutral-100 my-1"></div>
              <button
                onClick={() => handleExport('dec')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
              >
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Editorial Decisions (.csv)</span>
              </button>
            </div>
          )}
        </div>

        {/* API Docs Button (TwelveLabs style) */}
        <a
          href="https://github.com/krishna5632/HookScene"
          target="_blank"
          rel="noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/80 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 text-xs font-semibold bg-neutral-50/70 hover:bg-neutral-100 transition-colors"
          title="Open API Documentation on GitHub"
        >
          <FileText size={13} className="text-neutral-500" />
          <span>API Docs</span>
          <ExternalLink size={11} className="text-neutral-400" />
        </a>

        {/* User Avatar Pill: KS (Krishna Singh) */}
        <div
          className="flex items-center gap-2 pl-1"
          title="Krishna Singh (ikrishnasingh10@gmail.com)"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FDE68A] border border-[#FCD34D] text-[#92400E] font-bold text-xs flex items-center justify-center shadow-xs cursor-default">
            KS
          </div>
        </div>
      </div>
    </header>
  );
};
