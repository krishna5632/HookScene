import React, { useState, useEffect } from 'react';
import { ActiveTab, Dataset } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ReviewDesk } from './components/ReviewDesk';
import { RunStudio } from './components/RunStudio';
import { Analytics } from './components/Analytics';
import { Architecture } from './components/Architecture';
import { EvaluationDashboard } from './components/EvaluationDashboard';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('run');
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
    <div className="flex h-screen overflow-hidden bg-[#F9F9FB] font-sans text-neutral-900 selection:bg-[#FEF3C7] selection:text-[#92400E]">
      {/* TwelveLabs Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenApiKeyModal={() => setActiveTab('run')}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* TwelveLabs Top Minimal Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          dataset={dataset}
          decisions={decisions}
          onOpenApiKeyModal={() => setActiveTab('run')}
        />

        {/* Dynamic Main Canvas */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
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
      </div>
    </div>
  );
};
