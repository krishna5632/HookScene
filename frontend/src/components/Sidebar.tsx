import React, { useState } from 'react';
import { ActiveTab } from '../types';
import {
  Plus,
  Film,
  Zap,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  CheckCircle2,
  Cpu,
  Layers,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Clapperboard,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Primary studio tools
  const primaryItems = [
    {
      id: 'review' as ActiveTab,
      label: 'Review Desk',
      icon: Film,
    },
    {
      id: 'run' as ActiveTab,
      label: 'Run Studio',
      icon: Zap,
    },
  ];

  const featureItems = [
    {
      id: 'f1_quality' as ActiveTab,
      label: 'F1 Quality',
      icon: ShieldCheck,
    },
    {
      id: 'f2_failures' as ActiveTab,
      label: 'F2 Failures',
      icon: AlertTriangle,
    },
    {
      id: 'f3_consistency' as ActiveTab,
      label: 'F3 Consistency',
      icon: GitCompare,
    },
    {
      id: 'f4_testing' as ActiveTab,
      label: 'F4 Testing',
      icon: CheckCircle2,
    },
    {
      id: 'f5_performance' as ActiveTab,
      label: 'F5 Performance',
      icon: Cpu,
    },
    {
      id: 'f6_explainability' as ActiveTab,
      label: 'F6 Explainability',
      icon: Layers,
    },
    {
      id: 'method' as ActiveTab,
      label: 'Method',
      icon: FileText,
    },
  ];

  return (
    <aside
      className={`h-screen bg-[#F0F0F2] border-r border-[#E0E0E4] flex flex-col transition-all duration-200 z-30 select-none font-sans ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* 1. BRAND LOGO HEADER */}
      <div className="h-16 px-5 flex items-center justify-between">
        <div
          onClick={() => setActiveTab('review')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          {/* HookScene Modern Film & Scene Badge */}
          <div className="w-8 h-8 rounded-xl bg-[#18181B] group-hover:bg-[#000000] flex items-center justify-center text-white shadow-xs transition-all">
            <Clapperboard size={17} strokeWidth={2.2} className="text-white" />
          </div>

          {!collapsed && (
            <span className="font-bold text-[#18181B] tracking-tight text-[17px] leading-none">
              HookScene
            </span>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#71717A] hover:text-[#18181B] p-1 rounded-lg hover:bg-[#E4E4E8] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* 2. NEW RUN BUTTON (TwelveLabs Pitch Black "New +") */}
      <div className="px-4 pt-1 pb-3">
        <button
          onClick={() => setActiveTab('run')}
          className={`w-full bg-[#18181B] hover:bg-[#000000] text-white rounded-2xl py-2.5 px-4 flex items-center justify-between text-[14px] font-semibold shadow-xs transition-all cursor-pointer ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="New Extraction Run"
        >
          {!collapsed && <span>New</span>}
          <Plus size={17} className="text-white stroke-[2.5]" />
        </button>
      </div>

      {/* 3. NAVBAR-ONLY NAVIGATION ITEMS (Label on LEFT, Icon on RIGHT) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin scrollbar-thumb-neutral-300">
        {/* Core Workspace Tabs */}
        <div className="space-y-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] transition-colors group cursor-pointer ${
                  isActive
                    ? 'bg-[#BDC0C8] text-[#111113] font-semibold shadow-xs'
                    : 'text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                {!collapsed && <span>{item.label}</span>}
                <Icon
                  size={17}
                  className={`shrink-0 ${
                    isActive ? 'text-[#111113]' : 'text-[#3F3F46] group-hover:text-[#18181B]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Feature Direct Navigation (F1 through F6 + Method) */}
        <div className="space-y-1 pt-3 border-t border-[#E0E0E4]/70">
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-bold tracking-wider text-[#71717A] uppercase">
              Features & Analysis
            </div>
          )}
          {featureItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl text-[13px] transition-colors group cursor-pointer ${
                  isActive
                    ? 'bg-[#BDC0C8] text-[#111113] font-semibold shadow-xs'
                    : 'text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                {!collapsed && <span className="truncate">{item.label}</span>}
                <Icon
                  size={16}
                  className={`shrink-0 ${
                    isActive ? 'text-[#111113]' : 'text-[#52525B] group-hover:text-[#18181B]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM COLLAPSE ONLY */}
      <div className="px-4 py-3 border-t border-[#E0E0E4]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-medium transition-colors group cursor-pointer ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {!collapsed && <span>Collapse</span>}
          {collapsed ? (
            <PanelLeftOpen size={16} className="text-[#3F3F46]" />
          ) : (
            <PanelLeftClose size={16} className="text-[#3F3F46]" />
          )}
        </button>
      </div>
    </aside>
  );
};
