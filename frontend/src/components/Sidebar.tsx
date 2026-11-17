import React, { useState } from 'react';
import { ActiveTab } from '../types';
import {
  Plus,
  Rocket,
  Home,
  Box,
  Search,
  Sparkles,
  SlidersHorizontal,
  Scan,
  Shapes,
  Lock,
  Sliders,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  CheckCircle2,
  Cpu,
  Layers,
  FileText
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenApiKeyModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenApiKeyModal,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Group 1: Overview & Data
  const mainItems = [
    {
      id: 'review' as ActiveTab,
      label: 'Overview',
      icon: Home,
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'My Data',
      icon: Box,
    },
  ];

  // Group 2: Core Operations (TwelveLabs Search, Analyze, Segment, Embed, Examples)
  const intelligenceItems = [
    {
      id: 'review' as ActiveTab,
      label: 'Search',
      icon: Search,
    },
    {
      id: 'run' as ActiveTab,
      label: 'Analyze',
      icon: Sparkles,
    },
    {
      id: 'f1_quality' as ActiveTab,
      label: 'Segment',
      icon: SlidersHorizontal,
    },
    {
      id: 'f6_explainability' as ActiveTab,
      label: 'Embed',
      icon: Scan,
    },
    {
      id: 'method' as ActiveTab,
      label: 'Examples',
      icon: Shapes,
    },
  ];

  // Group 3: Comprehensive Evaluation & Audits (F1-F5)
  const auditItems = [
    {
      id: 'f2_failures' as ActiveTab,
      label: 'Format Rules (F2)',
      icon: AlertTriangle,
    },
    {
      id: 'f3_consistency' as ActiveTab,
      label: 'Consistency (F3)',
      icon: GitCompare,
    },
    {
      id: 'f4_testing' as ActiveTab,
      label: 'Benchmark Tests (F4)',
      icon: CheckCircle2,
    },
    {
      id: 'f5_performance' as ActiveTab,
      label: 'Cost & Latency (F5)',
      icon: Cpu,
    },
  ];

  return (
    <aside
      className={`h-screen bg-[#F0F0F2] border-r border-[#E0E0E4] flex flex-col transition-all duration-200 z-30 select-none font-sans ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. BRAND LOGO HEADER (TwelveLabs Stepped Mark + Logo) */}
      <div className="h-16 px-6 flex items-center justify-between">
        <div
          onClick={() => setActiveTab('review')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          {/* Digitized Stepped Mark (exact TwelveLabs horse/creature style) */}
          <svg
            className="w-7 h-7 text-[#18181B]"
            viewBox="0 0 28 28"
            fill="currentColor"
          >
            {/* Stepped barcode lines mimicking TwelveLabs logo */}
            <rect x="2" y="6" width="6" height="2.2" rx="0.5" />
            <rect x="5" y="9.5" width="8" height="2.2" rx="0.5" />
            <rect x="3" y="13" width="12" height="2.2" rx="0.5" />
            <rect x="7" y="16.5" width="9" height="2.2" rx="0.5" />
            <rect x="11" y="20" width="5" height="2.2" rx="0.5" />
            <rect x="18" y="7" width="5" height="2.2" rx="0.5" />
            <rect x="19" y="10.5" width="4" height="2.2" rx="0.5" />
            <rect x="20" y="14" width="3" height="2.2" rx="0.5" />
          </svg>

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
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* 2. TOP ACTION BUTTONS: "New +" & "Get Started 🚀" */}
      <div className="px-5 pt-1 pb-4 space-y-2.5">
        {/* Prominent Deep Black "New +" Button */}
        <button
          onClick={() => setActiveTab('run')}
          className={`w-full bg-[#18181B] hover:bg-[#000000] text-white rounded-2xl py-3 px-5 flex items-center justify-between text-[15px] font-semibold shadow-xs transition-all ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Start new analysis"
        >
          {!collapsed && <span>New</span>}
          <Plus size={18} className="text-white stroke-[2.5]" />
        </button>

        {/* Medium-Gray "Get Started 🚀" Active Pill */}
        {!collapsed && (
          <button
            onClick={() => setActiveTab('run')}
            className={`w-full rounded-xl py-2 px-4 flex items-center justify-between text-[14px] font-semibold transition-colors ${
              activeTab === 'run'
                ? 'bg-[#BDC0C8] text-[#111113] shadow-xs'
                : 'bg-transparent text-[#27272A] hover:bg-[#E4E4E8]'
            }`}
          >
            <span>Get Started</span>
            <Rocket size={16} className="text-[#18181B]" />
          </button>
        )}
      </div>

      {/* 3. NAVIGATION ITEMS LIST (Label on LEFT, Icon on RIGHT) */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-6 scrollbar-thin scrollbar-thumb-neutral-300">
        {/* Section 1: Overview & My Data */}
        <div className="space-y-1">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] transition-colors group ${
                  isActive
                    ? 'bg-[#BDC0C8] text-[#111113] font-semibold shadow-xs'
                    : 'text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                {!collapsed && <span>{item.label}</span>}
                <Icon
                  size={18}
                  className={`shrink-0 ${
                    isActive ? 'text-[#111113]' : 'text-[#3F3F46] group-hover:text-[#18181B]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Section 2: Core Capabilities (Search, Analyze, Segment, Embed, Examples) */}
        <div className="space-y-1">
          {intelligenceItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] transition-colors group ${
                  isActive
                    ? 'bg-[#BDC0C8] text-[#111113] font-semibold shadow-xs'
                    : 'text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                {!collapsed && <span>{item.label}</span>}
                <Icon
                  size={18}
                  className={`shrink-0 ${
                    isActive ? 'text-[#111113]' : 'text-[#3F3F46] group-hover:text-[#18181B]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Section 3: Deep Audit & Ground Truth Features */}
        {!collapsed && (
          <div className="space-y-1 pt-2 border-t border-[#E0E0E4]/60">
            <div className="px-3.5 pb-1 text-[11px] font-bold tracking-wider text-[#71717A] uppercase">
              Audits & Tests
            </div>
            {auditItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl text-[13px] transition-colors group ${
                    isActive
                      ? 'bg-[#BDC0C8] text-[#111113] font-semibold shadow-xs'
                      : 'text-[#3F3F46] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal'
                  }`}
                  title={item.label}
                >
                  <span className="truncate">{item.label}</span>
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
        )}
      </div>

      {/* 4. BOTTOM FOOTER SECTION (API Keys, Settings, Help, Collapse) */}
      <div className="px-5 py-4 border-t border-[#E0E0E4] space-y-1">
        <button
          onClick={() => {
            if (onOpenApiKeyModal) onOpenApiKeyModal();
            else setActiveTab('run');
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal transition-colors group ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="API Keys Vault"
        >
          {!collapsed && <span>API Keys</span>}
          <Lock size={17} className="text-[#3F3F46] group-hover:text-[#18181B]" />
        </button>

        <button
          onClick={() => setActiveTab('run')}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal transition-colors group ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Engine Settings"
        >
          {!collapsed && <span>Settings</span>}
          <Sliders size={17} className="text-[#3F3F46] group-hover:text-[#18181B]" />
        </button>

        <a
          href="https://github.com/krishna5632/HookScene"
          target="_blank"
          rel="noreferrer"
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal transition-colors group ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Documentation & GitHub Repo"
        >
          {!collapsed && <span>Help</span>}
          <HelpCircle size={17} className="text-[#3F3F46] group-hover:text-[#18181B]" />
        </a>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[14px] text-[#27272A] hover:text-[#000000] hover:bg-[#E4E4E8] font-normal transition-colors group ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {!collapsed && <span>Collapse</span>}
          {collapsed ? (
            <PanelLeftOpen size={17} className="text-[#3F3F46]" />
          ) : (
            <PanelLeftClose size={17} className="text-[#3F3F46]" />
          )}
        </button>
      </div>
    </aside>
  );
};
