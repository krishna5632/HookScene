import React, { useState } from 'react';
import { ActiveTab } from '../types';
import {
  Plus,
  Rocket,
  Film,
  Sparkles,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Sliders,
  PlayCircle
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

  const navItems = [
    {
      id: 'review' as ActiveTab,
      label: 'Review Desk',
      icon: Film,
      badge: 'Main',
    },
    {
      id: 'run' as ActiveTab,
      label: 'Run Studio',
      icon: Sparkles,
      badge: 'Engine',
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Analytics',
      icon: BarChart2,
    },
  ];

  const auditItems = [
    {
      id: 'f1_quality' as ActiveTab,
      label: 'Quality Audit (F1)',
      icon: ShieldCheck,
    },
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
      label: 'Cost & Tokens (F5)',
      icon: Cpu,
    },
    {
      id: 'f6_explainability' as ActiveTab,
      label: 'Decision Trace (F6)',
      icon: Layers,
    },
    {
      id: 'method' as ActiveTab,
      label: 'Architecture',
      icon: FileText,
    },
  ];

  return (
    <aside
      className={`h-screen bg-white border-r border-neutral-200/80 flex flex-col transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Logo Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-100">
        <div
          onClick={() => setActiveTab('review')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Geometric AI Logo Mark (TwelveLabs style) */}
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-amber-400 mr-0.5">H</span>S
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900 tracking-tight text-[15px] leading-tight">
                HookScene
              </span>
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                Video Intelligence
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* Top Action Buttons (TwelveLabs "+ New" & "Get Started") */}
      <div className="p-3.5 space-y-2 border-b border-neutral-100">
        <button
          onClick={() => setActiveTab('run')}
          className={`w-full bg-black hover:bg-neutral-800 text-white rounded-xl py-2.5 px-3.5 flex items-center justify-between text-sm font-medium shadow-sm transition-all ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Start a new extraction run"
        >
          <span className="flex items-center gap-2">
            <Plus size={16} className="text-amber-400" />
            {!collapsed && <span>New Run</span>}
          </span>
          {!collapsed && (
            <span className="text-[11px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-mono">
              +
            </span>
          )}
        </button>

        {!collapsed && (
          <button
            onClick={() => setActiveTab('run')}
            className={`w-full rounded-xl py-2 px-3 flex items-center gap-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'run'
                ? 'bg-neutral-100 text-neutral-900 font-bold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <Rocket size={15} className="text-neutral-500" />
            <span>Get Started</span>
          </button>
        )}
      </div>

      {/* Navigation Links Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-neutral-200">
        {/* Core Workspace Section */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
              Workspace
            </div>
          )}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={item.label}
                >
                  <Icon
                    size={17}
                    className={
                      isActive
                        ? 'text-amber-400'
                        : 'text-neutral-500 group-hover:text-neutral-900'
                    }
                  />
                  {!collapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge && !isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-medium">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit & Intelligence Features (F1–F6) */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
              Audit & Intelligence
            </div>
          )}
          <div className="space-y-0.5">
            {auditItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={item.label}
                >
                  <Icon
                    size={16}
                    className={
                      isActive ? 'text-amber-400' : 'text-neutral-400'
                    }
                  />
                  {!collapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer Section (TwelveLabs API Keys, Settings, Docs, User) */}
      <div className="p-3 border-t border-neutral-100 space-y-1">
        <button
          onClick={() => {
            if (onOpenApiKeyModal) onOpenApiKeyModal();
            else setActiveTab('run');
          }}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="API Keys & Engine Provider"
        >
          <Lock size={16} className="text-neutral-400" />
          {!collapsed && <span>API Keys</span>}
        </button>

        <a
          href="https://github.com/krishna5632/HookScene"
          target="_blank"
          rel="noreferrer"
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="GitHub Repository & Specification"
        >
          <HelpCircle size={16} className="text-neutral-400" />
          {!collapsed && <span>Docs & Repo</span>}
        </a>

        {/* Collapse toggle at very bottom */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[13px] font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} className="text-neutral-400" />
          ) : (
            <>
              <PanelLeftClose size={16} className="text-neutral-400" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
