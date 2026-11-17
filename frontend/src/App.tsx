import React, { useState, useEffect } from 'react';
import { ActiveTab, Dataset } from './types';
import { Header } from './components/Header';
import { ReviewDesk } from './components/ReviewDesk';
import { RunStudio } from './components/RunStudio';
import { Analytics } from './components/Analytics';
import { Architecture } from './components/Architecture';
import { EvaluationDashboard } from './components/EvaluationDashboard';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('review');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('hookscene_decisions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save decisions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hookscene_decisions', JSON.stringify(decisions));
    } catch {
      // ignore
    }
  }, [decisions]);

  // Load official benchmark dataset on mount
  useEffect(() => {
    fetch('/api/official')
      .then((res) => {
        if (!res.ok) throw new Error('Official data not found');
        return res.json();
      })
      .then((data: Dataset) => setDataset(data))
      .catch(() => {
        // Fallback to local data if needed
        fetch('/data/official.json')
          .then((res) => res.json())
          .then((data) => setDataset(data))
          .catch(() => {});
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC] text-[#111827] selection:bg-[#FEF3C7] selection:text-[#92400E]">
      {/* Top Professional Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dataset={dataset}
        decisions={decisions}
      />

      {/* Main Workspace View */}
      <main className="flex-1 w-full">
        {activeTab === 'review' && (
          <ReviewDesk
            dataset={dataset}
            decisions={decisions}
            setDecisions={setDecisions}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'run' && (
          <RunStudio
            setDataset={setDataset}
            setActiveTab={setActiveTab}
          />
        )}

        {(activeTab === 'analytics' ||
          activeTab === 'f1_quality' ||
          activeTab === 'f2_failures' ||
          activeTab === 'f3_consistency' ||
          activeTab === 'f4_testing' ||
          activeTab === 'f5_performance' ||
          activeTab === 'f6_explainability') && (
          <Analytics
            dataset={dataset}
            activeFeature={
              activeTab === 'f1_quality'
                ? 'f1'
                : activeTab === 'f2_failures'
                ? 'f2'
                : activeTab === 'f3_consistency'
                ? 'f3'
                : activeTab === 'f4_testing'
                ? 'f4'
                : activeTab === 'f5_performance'
                ? 'f5'
                : activeTab === 'f6_explainability'
                ? 'f6'
                : 'all'
            }
            onSelectFeature={(feat) => {
              if (feat === 'f1') setActiveTab('f1_quality');
              else if (feat === 'f2') setActiveTab('f2_failures');
              else if (feat === 'f3') setActiveTab('f3_consistency');
              else if (feat === 'f4') setActiveTab('f4_testing');
              else if (feat === 'f5') setActiveTab('f5_performance');
              else if (feat === 'f6') setActiveTab('f6_explainability');
              else setActiveTab('analytics');
            }}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationDashboard />
        )}

        {activeTab === 'method' && (
          <Architecture />
        )}
      </main>

      {/* Minimal SaaS Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs font-mono text-slate-500">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8A72D]"></span>
            <span className="text-slate-900 font-bold">HOOKSCENE</span>
            <span>· Professional Microdrama Promo Intelligence & Editing Desk</span>
          </div>

          <div className="flex items-center gap-5 font-medium text-slate-600">
            <button onClick={() => setActiveTab('review')} className="hover:text-slate-900 transition-colors cursor-pointer">Review Desk</button>
            <button onClick={() => setActiveTab('run')} className="hover:text-slate-900 transition-colors cursor-pointer">Run Studio</button>
            <button onClick={() => setActiveTab('analytics')} className="hover:text-slate-900 transition-colors cursor-pointer">Analytics</button>
            <button onClick={() => setActiveTab('evaluation')} className="hover:text-slate-900 transition-colors cursor-pointer">Quality Eval</button>
            <button onClick={() => setActiveTab('method')} className="hover:text-slate-900 transition-colors cursor-pointer">Architecture</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
