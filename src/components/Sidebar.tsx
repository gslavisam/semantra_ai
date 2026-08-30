import React from 'react';
import { 
  FolderGit2, 
  SearchCode, 
  TrendingUp, 
  ShieldCheck, 
  Settings, 
  HelpCircle
} from 'lucide-react';
import { SemantraCopilot } from './SemantraCopilot';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeModelName?: string;
  onOpenHelp?: () => void;
  mappingCount?: number;
  lowConfidenceCount?: number;
  activeBranch?: string;
  selectedPreset?: string;
  workspaceStep?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  activeModelName = 'gemini-3.7-flash', 
  onOpenHelp,
  mappingCount = 5,
  lowConfidenceCount = 1,
  activeBranch = 'main',
  selectedPreset = 'customer_sales_area',
  workspaceStep = 'setup'
}) => {
  const menuItems = [
    { id: 'workspace', label: 'Workspace', icon: FolderGit2, description: 'Design & Map Data' },
    { id: 'catalog', label: 'Catalog', icon: SearchCode, description: 'Approved Concept Reuse' },
    { id: 'benchmarks', label: 'Benchmarks', icon: TrendingUp, description: 'Evaluation & Impact' },
    { id: 'admin', label: 'Governance', icon: ShieldCheck, description: 'Canonical Console' },
    { id: 'system', label: 'AI & System Settings', icon: Settings, description: 'Models & API Contract' }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0">
      <div className="flex flex-col flex-1">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-900 tracking-tight text-lg shadow-md">
            S
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-white leading-none tracking-tight">Semantra</h1>
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">v1.3 Workbench</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-left transition-all duration-200 group ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700/50' 
                    : 'hover:bg-slate-800/40 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
                }`} />
                <div className="leading-none">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-light">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {/* Semantra Copilot Assistant Widget */}
        <SemantraCopilot
          activeTab={activeTab}
          workspaceStep={workspaceStep}
          mappingCount={mappingCount}
          lowConfidenceCount={lowConfidenceCount}
          activeBranch={activeBranch}
          selectedPreset={selectedPreset}
          onNavigateTab={setActiveTab}
        />

        {onOpenHelp && (
          <button 
            onClick={onOpenHelp}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-emerald-400 hover:bg-emerald-950/40 rounded-lg hover:text-emerald-300 text-left transition-colors font-medium border border-emerald-900/40"
            title="Open Semantra Help Documentation (help.en.md)"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Help (help.en.md)</span>
            </div>
            <span className="text-[9px] font-mono bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded uppercase">Docs</span>
          </button>
        )}

        <div className="px-4 py-2 text-[10px] font-mono text-slate-500 bg-slate-950/60 rounded-lg my-1 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">MODEL:</span>
            <span className="text-emerald-400 font-bold truncate max-w-[100px]">{activeModelName}</span>
          </div>
          <div className="flex justify-between items-center text-[9px]">
            <span>PORT: 3000</span>
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ONLINE
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};


