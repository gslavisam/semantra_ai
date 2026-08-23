import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  BookOpen, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Search,
  ChevronRight,
  Terminal,
  CheckCircle2,
  Calculator,
  Scale,
  Zap,
  Check,
  Code,
  Info,
  Sliders,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  ArrowRight,
  Database,
  RefreshCw,
  GitPullRequest,
  Network
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('signals_scoring');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const helpSections = [
    { id: 'signals_scoring', title: '1. Mapping Signals & Scoring Reference', icon: Calculator, badge: 'Core Theory' },
    { id: 'mental_model', title: '2. Canonical, Knowledge & Overlay Model', icon: GitBranch, badge: 'Core Theory' },
    { id: 'overview', title: '3. Overview & Architecture', icon: BookOpen },
    { id: 'pipeline', title: '4. Workspace Mapping Pipeline', icon: Layers },
    { id: 'bounded_ai', title: '5. Bounded AI Gate & Rules', icon: Sparkles },
    { id: 'governance', title: '6. Governance & Canonical Catalog', icon: ShieldCheck },
    { id: 'benchmarks', title: '7. Benchmarks & Learning Curves', icon: TrendingUp },
    { id: 'standalone_web', title: '8. Web Workbench vs Python CLI', icon: Terminal },
    { id: 'workflows', title: '9. Supported Workflows & Navigation (WF-01–13)', icon: GitPullRequest, badge: 'WF-01–13' }
  ];

  const filteredSections = helpSections.filter(sec => 
    !searchQuery || 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-sans tracking-tight">Semantra Documentation & Reference Console</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700 rounded">v1.3 Enterprise &amp; Pilot Spec</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Deterministic-first semantic integration workbench with bounded AI validation</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Help Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search documentation (e.g. 'signals', 'scoring profile', 'canonical lock', 'llm gate', 'weights')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-500 hover:text-slate-300">
              Clear
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <div className="w-72 bg-slate-950/50 border-r border-slate-800 p-3 space-y-1 overflow-y-auto shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-1.5 block font-semibold">Documentation Index</span>
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-left transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs border border-slate-700/80' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{sec.title}</span>
                  </div>
                  {sec.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded shrink-0">
                      {sec.badge}
                    </span>
                  )}
                  {isActive && !sec.badge && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                </button>
              );
            })}

            <div className="mt-6 p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Semantra Operating Model
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Deterministic heuristics first, bounded LLM validation second. Human-in-the-loop stewardship guarantees zero silent AI mistakes in production.
              </p>
            </div>
          </div>

          {/* Right Section Content Viewer */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 font-sans text-xs leading-relaxed text-slate-300">
            
            {/* SECTION 1: MAPPING SIGNALS & SCORING REFERENCE */}
            {activeSection === 'signals_scoring' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-400" />
                      Mapping Signals and Scoring Reference
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      backend/app/services/mapping_service.py
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Detailed reference for how Semantra computes mapping scores, derives confidence labels, and applies bounded LLM validation.
                  </p>
                </div>

                {/* Framing & Purpose */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2 font-mono">
                    <Info className="w-4 h-4 text-emerald-400" />
                    Operational Framing: What the Score Means
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    The Semantra mapping score is a <strong>normalized heuristic score in the 0.00 – 1.00 range</strong> designed for ranking and review prioritization — <em>not</em> a calibrated mathematical probability of correctness.
                  </p>
                  <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1 pt-1">
                    <li><strong>Higher score:</strong> Candidate possesses stronger composite evidence relative to the active scoring profile.</li>
                    <li><strong>Review necessity:</strong> Governance and analyst validation still apply even for high-confidence candidates.</li>
                  </ul>
                </div>

                {/* Score Profiles & Weights Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Built-in Scoring Profiles & Weights Matrix
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Semantra uses configurable scoring profiles selected via <code className="text-emerald-400 font-mono text-[10px]">SEMANTRA_SCORING_PROFILE</code> in configuration.
                  </p>

                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                          <th className="p-2.5">Signal</th>
                          <th className="p-2.5 text-emerald-400">Balanced (Default)</th>
                          <th className="p-2.5">Schema Only</th>
                          <th className="p-2.5">Data Rich</th>
                          <th className="p-2.5">Canonical First</th>
                          <th className="p-2.5">Description Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">name</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.20</td>
                          <td className="p-2.5 text-slate-400">0.30</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                          <td className="p-2.5 text-slate-400">0.15</td>
                          <td className="p-2.5 text-slate-400">0.15</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">semantic</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.12</td>
                          <td className="p-2.5 text-slate-400">0.20</td>
                          <td className="p-2.5 text-slate-400">0.08</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                          <td className="p-2.5 text-slate-400">0.25</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">knowledge</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.10</td>
                          <td className="p-2.5 text-slate-400">0.15</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.25</td>
                          <td className="p-2.5 text-slate-400">0.20</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">canonical</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.05</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                          <td className="p-2.5 text-slate-400">0.02</td>
                          <td className="p-2.5 text-slate-400">0.20</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">pattern</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.20</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.25</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">statistical</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.15</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.25</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">overlap</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.10</td>
                          <td className="p-2.5 text-slate-400">0.00</td>
                          <td className="p-2.5 text-slate-400">0.20</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">embedding</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.12</td>
                          <td className="p-2.5 text-slate-400">0.10</td>
                          <td className="p-2.5 text-slate-400">0.03</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">correction</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.10</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.02</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                          <td className="p-2.5 text-slate-400">0.05</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-slate-200">llm</td>
                          <td className="p-2.5 font-bold text-emerald-400 bg-emerald-500/5">0.05</td>
                          <td className="p-2.5 text-slate-400">0.00</td>
                          <td className="p-2.5 text-slate-400">0.00</td>
                          <td className="p-2.5 text-slate-400">0.00</td>
                          <td className="p-2.5 text-slate-400">0.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 10 Signal Meanings Breakdown */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    The 10 Signal Meanings Breakdown
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-emerald-400">
                        <span>1. name (Lexical)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.20</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Fuzzy similarity & Jaccard token overlap between normalized physical field names.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-teal-400">
                        <span>2. semantic (Tokens)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.12</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Normalized field meaning & metadata token expansion for domain acronyms and synonyms.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-cyan-400">
                        <span>3. knowledge (Catalog)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.10</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Metadata knowledge layer alignment & active user stewardship overlays.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-sky-400">
                        <span>4. canonical (Concepts)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.05</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Direct alignment through shared canonical business concept models.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-indigo-400">
                        <span>5. pattern (Value Shapes)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.20</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Value shape compatibility (emails, dates, codes, ISO currencies, numeric ranges).
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-violet-400">
                        <span>6. statistical (Distributions)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.15</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Column statistics compatibility: unique_ratio, null_ratio, average length.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-fuchsia-400">
                        <span>7. overlap (Sample Values)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.10</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Direct Jaccard overlap of representative sample values (inactive when data absent).
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-amber-400">
                        <span>8. embedding (Vectors)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.12</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Dense vector embedding similarity hint when an embedding provider is configured.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-emerald-300">
                        <span>9. correction (History)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.10</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Historical signal from durable review feedback & promoted reusable rules.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-purple-400">
                        <span>10. llm (AI Gate)</span>
                        <span className="text-[10px] text-slate-500">Weight: 0.05</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Bounded LLM recommendation score (only added if LLM is executed and valid).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Formula & Active Normalization */}
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Final Normalized Score Formula
                  </h4>
                  <p className="text-slate-300 font-sans text-xs">
                    Semantra normalizes strictly over <strong>active signals</strong> ($A$), ensuring schema-only cases or datasets without sample values are never unfairly penalized.
                  </p>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 text-xs overflow-x-auto space-y-1">
                    <div><span className="text-slate-400">raw_score</span> = ∑<sub>i ∈ A</sub> (signal<sub>i</sub> × weight<sub>i</sub>)</div>
                    <div><span className="text-emerald-400">final_score</span> = clamp( raw_score / ∑<sub>i ∈ A</sub> weight<sub>i</sub>, 0.0, 1.0 )</div>
                  </div>
                </div>

                {/* Canonical Lock & Special Rules */}
                <div className="p-4 bg-purple-950/30 border border-purple-900/50 rounded-xl space-y-2">
                  <h4 className="font-bold text-purple-200 text-xs flex items-center gap-2 font-mono">
                    <Zap className="w-4 h-4 text-purple-400" />
                    Canonical Concept Lock Behavior
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    When target resolves to a canonical concept with <code className="text-purple-300 font-mono">knowledge &gt;= 0.85</code> and <code className="text-purple-300 font-mono">canonical &gt;= 0.60</code>, physical field-name mismatch is automatically removed from active signals to prevent lexical dilution of strong business concept locks.
                  </p>
                </div>

                {/* Reciprocal Rank Fusion (RRF) Hybrid Search Diagnostics & Interpretation */}
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-300 text-xs flex items-center gap-2 font-mono">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      RRF (Reciprocal Rank Fusion) Hybrid Search Consensus
                    </h4>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                      Industry Standard (k=60)
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Semantra employs <strong>Reciprocal Rank Fusion (RRF)</strong> to combine results from two independent search engines: <em>Lexical exact-match (BM25/Fuzzy)</em> and <em>Semantic conceptual similarity (Vector/Synonym embeddings)</em>. This provides mathematical explainability and guarantees candidates are vetted against false hallucinations.
                  </p>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400">
                      <strong>Mathematical Formula:</strong>
                    </div>
                    <div className="text-emerald-400 pl-2">
                      RRF_Score = 1 / (60 + Rank<sub>Lexical</sub>) + 1 / (60 + Rank<sub>Semantic</sub>)
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-200 font-mono uppercase tracking-wider block">
                      Score Range & Interpretation Matrix:
                    </span>
                    <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/80">
                      <table className="w-full text-left text-[11px] font-sans">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <th className="p-2">RRF Range</th>
                            <th className="p-2">Consensus Level</th>
                            <th className="p-2">Underlying Meaning</th>
                            <th className="p-2">Status Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          <tr className="text-emerald-300">
                            <td className="p-2 font-bold">0.03000 – 0.03279</td>
                            <td className="p-2 font-sans font-bold">🟢 Perfect Consensus (Gold Standard)</td>
                            <td className="p-2 font-sans text-slate-300">Both Lexical & Semantic ranked #1 (Max theoretical: 0.03279).</td>
                            <td className="p-2 font-bold text-emerald-400">Auto-Accepted</td>
                          </tr>
                          <tr className="text-teal-300">
                            <td className="p-2 font-bold">0.02000 – 0.02999</td>
                            <td className="p-2 font-sans font-bold">🔵 High Alignment</td>
                            <td className="p-2 font-sans text-slate-300">Top-1 in one engine, top 10–15 in the other (e.g. acronyms).</td>
                            <td className="p-2 font-sans text-slate-300">Recommended Accept</td>
                          </tr>
                          <tr className="text-amber-300">
                            <td className="p-2 font-bold">0.01000 – 0.01999</td>
                            <td className="p-2 font-sans font-bold">🟡 Moderate / Partial</td>
                            <td className="p-2 font-sans text-slate-300">Weaker ranking across one or both engines.</td>
                            <td className="p-2 font-bold text-amber-400">Needs Review</td>
                          </tr>
                          <tr className="text-rose-400">
                            <td className="p-2 font-bold">&lt; 0.01000</td>
                            <td className="p-2 font-sans font-bold">🔴 Low / Disjoint</td>
                            <td className="p-2 font-sans text-slate-300">Low mutual rank across both engines.</td>
                            <td className="p-2 font-bold text-rose-400">Review / Override</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Confidence Labels & Auto-Accept */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200 text-xs font-mono uppercase tracking-wider text-emerald-400">
                      Confidence Labels
                    </h5>
                    <ul className="space-y-1.5 text-[11px] font-mono">
                      <li className="flex items-center justify-between text-emerald-400">
                        <span>HIGH CONFIDENCE:</span>
                        <span className="font-bold">&ge; 0.85 (SAP: 0.82)</span>
                      </li>
                      <li className="flex items-center justify-between text-amber-400">
                        <span>MEDIUM CONFIDENCE:</span>
                        <span className="font-bold">&ge; 0.65 (SAP: 0.58)</span>
                      </li>
                      <li className="flex items-center justify-between text-rose-400">
                        <span>LOW CONFIDENCE:</span>
                        <span className="font-bold">&lt; 0.65</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200 text-xs font-mono uppercase tracking-wider text-emerald-400">
                      Auto-Accept Thresholds
                    </h5>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Candidates with score <strong className="text-slate-200 font-mono">&ge; 0.85</strong> (0.82 for SAP PIR) default to status <span className="text-emerald-400 font-mono font-bold">accepted</span>. Candidates below require <span className="text-amber-400 font-mono font-bold">needs_review</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: CANONICAL, KNOWLEDGE & OVERLAY MENTAL MODEL */}
            {activeSection === 'mental_model' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-emerald-400" />
                      Canonical, Knowledge, Overlay & Runtime Mental Model
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      backend/app/services/metadata_knowledge_service.py
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Theoretical foundations of knowledge organization and decision-making: from stable canonical business terms to operational runtime layers.
                  </p>
                </div>

                {/* 4 Layer Mental Model */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    The Four Core Layers (Mental Model)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between font-mono font-bold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Canonical Glossary
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">Highest Authority</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Stable business language:</strong> Defines what the "correct" business concept is (e.g. <code className="text-emerald-300 font-mono">Customer_Tax_ID</code>, <code className="text-emerald-300 font-mono">Payment_Terms</code>). Represents the ultimate semantic source of truth within the system.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-mono font-bold text-cyan-400">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-cyan-400" />
                          Knowledge Concepts
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">Operational Translation</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>System-level operational translation:</strong> How a canonical concept manifests across real vendor and legacy systems (e.g. SAP <code className="text-cyan-300 font-mono">KUNNR</code>, Oracle <code className="text-cyan-300 font-mono">CUST_ACCT_NUM</code>, Salesforce <code className="text-cyan-300 font-mono">AccountId</code>).
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-purple-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-mono font-bold text-purple-400">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-purple-400" />
                          Active Overlay
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 rounded border border-purple-500/40">Fast Patch</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Controlled additions without database revisions:</strong> Quickly add local aliases and context for specific rollouts or projects. Takes highest precedence over base entries in the runtime.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-mono font-bold text-indigo-400">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 text-indigo-400" />
                          Runtime View
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/40">Effective State</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Active real-time composition:</strong> The "effective state" that the mapping engine actually uses during recommendations. Not a separate source of truth, but the composite sum of active rules.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Semantic Hierarchy & Authority */}
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2 text-emerald-400">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Authority Hierarchy (Precedence Order)
                  </h4>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-center">
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg w-full md:w-auto font-bold">
                      Canonical Glossary <br/><span className="text-[10px] text-slate-400 font-normal">Highest Semantic Authority</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden md:block" />
                    <div className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg w-full md:w-auto font-bold">
                      Knowledge Concepts <br/><span className="text-[10px] text-slate-400 font-normal">System / Vendor Translation</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden md:block" />
                    <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-lg w-full md:w-auto font-bold">
                      Active Overlay <br/><span className="text-[10px] text-slate-400 font-normal">Runtime Override Precedence</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 hidden md:block" />
                    <div className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-lg w-full md:w-auto font-bold">
                      Runtime State <br/><span className="text-[10px] text-slate-400 font-normal">Effective Engine Input</span>
                    </div>
                  </div>
                </div>

                {/* How Engine Uses Layers Across Phases */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    How and When Each Layer Influences Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-emerald-400 block font-mono">1. Candidate Phase</span>
                      <p className="text-slate-400 text-[11px]">
                        Candidate generation based on physical field names, semantics, data types, value patterns, statistics + knowledge and canonical signals.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-cyan-400 block font-mono">2. Ranking Phase</span>
                      <p className="text-slate-400 text-[11px]">
                        Knowledge and canonical signals enter as weighted inputs into the final confidence score based on the active scoring profile.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-indigo-400 block font-mono">3. Explainability Phase</span>
                      <p className="text-slate-400 text-[11px]">
                        Explanations explicitly state whether a match originated from a direct canonical concept lock or a system knowledge alias.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-purple-400 block font-mono">4. Canonical-Only Mode</span>
                      <p className="text-slate-400 text-[11px]">
                        When the target schema is virtual, canonical signals carry even higher weight to guarantee semantic coherence.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Recommendation Cases */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Typical Recommendation Flow Scenarios (5 Cases)
                  </h4>
                  <div className="space-y-2 text-xs font-sans">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 rounded shrink-0 font-bold">CASE 1</span>
                      <div>
                        <strong className="text-white block font-mono">Direct Canonical Match</strong>
                        <p className="text-slate-400 text-[11px]">Source column and target align directly to the same canonical concept. High score, eligible for auto-accept.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 rounded shrink-0 font-bold">CASE 2</span>
                      <div>
                        <strong className="text-white block font-mono">Knowledge Alias Match</strong>
                        <p className="text-slate-400 text-[11px]">Candidate identified via a system-specific alias from the source domain (e.g. SAP <code className="text-cyan-300 font-mono">KUNNR</code> or <code className="text-cyan-300 font-mono">MATNR</code>).</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-400 rounded shrink-0 font-bold">CASE 3</span>
                      <div>
                        <strong className="text-white block font-mono">Overlay-Assisted Match</strong>
                        <p className="text-slate-400 text-[11px]">Match achieved after adding an overlay alias that bridges a specific domain gap without database revision.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-400 rounded shrink-0 font-bold">CASE 4</span>
                      <div>
                        <strong className="text-white block font-mono">No Canonical Trace (Canonical Gap)</strong>
                        <p className="text-slate-400 text-[11px]">Flagged as <code className="text-amber-300 font-mono">needs_review</code>, triggering a suggestion to register a new concept or alias in the catalog.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-rose-500/20 text-rose-400 rounded shrink-0 font-bold">CASE 5</span>
                      <div>
                        <strong className="text-white block font-mono">Close Competing Candidates (Arbitration)</strong>
                        <p className="text-slate-400 text-[11px]">Requires analyst decision. Bounded LLM arbitration or manual review prevents risky auto-accept.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lifecycle & Promotion Workflow */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2 text-emerald-400">
                    <GitPullRequest className="w-4 h-4 text-emerald-400" />
                    Knowledge Lifecycle & Stewardship Promotion Flow
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-purple-400 font-bold block mb-0.5">1. Active Overlay</span>
                      <span className="text-[10px] text-slate-400">New alias/signal enters as a rapid local patch</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-amber-400 font-bold block mb-0.5">2. Stewardship</span>
                      <span className="text-[10px] text-slate-400">Analyst validates and reviews (approve / reject)</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-emerald-400 font-bold block mb-0.5">3. Catalog Promotion</span>
                      <span className="text-[10px] text-slate-400">Durable promotion into Canonical / Knowledge</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-indigo-400 font-bold block mb-0.5">4. Runtime Refresh</span>
                      <span className="text-[10px] text-slate-400">New signal immediately influences subsequent workspaces</span>
                    </div>
                  </div>
                </div>

                {/* Quick Decision Playbook */}
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2">
                  <h4 className="font-bold text-emerald-300 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Quick Decision Playbook for Users & Analysts
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold font-mono shrink-0">•</span>
                      <span>If the issue affects a single specific system or client rollout: use an <strong>Active Overlay</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold font-mono shrink-0">•</span>
                      <span>If the term is enterprise-wide, universal, and permanent: register it in the <strong>Canonical Glossary</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold font-mono shrink-0">•</span>
                      <span>If it is a vendor-specific mapping, technical field name, or legacy synonym: use <strong>Knowledge Concepts</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold font-mono shrink-0">•</span>
                      <span>If a UI recommendation appears counter-intuitive: <strong>first inspect the Runtime / Active Overlay</strong> before tuning scoring profile weights.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 3: OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                      3. Semantra Architecture & Core Overview
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      backend/app/main.py
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Authoritative architectural guide for Semantra Pilot-Ready Semantic Integration Workbench.</p>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase font-mono tracking-wider">Core Enterprise Purpose</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Semantra bridges raw heterogeneous source datasets (SAP ERP, Oracle EBS, Salesforce CRM, legacy CSVs) with normalized enterprise canonical business models. It eliminates manual mapping drudgery through a multi-signal scoring engine while maintaining strict governance, complete auditability, and bounded AI safety.
                  </p>
                </div>

                {/* Core Architecture Principles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-100 text-xs flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Deterministic-First Design
                    </h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Exact field names, token overlap, catalog rules, and metadata type compatibility always take priority over probabilistic predictions. Statistical models enhance accuracy without overriding verified rules.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-100 text-xs flex items-center gap-2 font-mono">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Bounded & Inspectable AI
                    </h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      LLMs operate within strict execution gates (0.30–0.75 confidence band) and receive closed candidate choices. AI never invents unlisted target fields or modifies database schemas autonomously.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-100 text-xs flex items-center gap-2 font-mono">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      Backend Contract Governance
                    </h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Governance checks are enforced in backend REST contracts (<code className="text-cyan-300 font-mono text-[10px]">backend/app/api/routes</code>), not merely in UI validation logic, ensuring zero silent bypasses.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-100 text-xs flex items-center gap-2 font-mono">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      Overlay-First Persistence
                    </h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Analyst corrections enter as non-destructive overlays before undergoing stewardship review and promotion to the durable canonical baseline, preventing master data pollution.
                    </p>
                  </div>
                </div>

                {/* Key Backend & UI Modules */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Key Python Backend Services & UI Modules
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-emerald-400 font-bold block">backend/app/services/mapping_service.py</span>
                      <span className="text-[10px] text-slate-400 font-sans">Multi-signal heuristic scoring, candidate ranking, and bipartite matching engine.</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-cyan-400 font-bold block">backend/app/services/metadata_knowledge_service.py</span>
                      <span className="text-[10px] text-slate-400 font-sans">Canonical glossary, knowledge concept runtime, and active overlay composition.</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-indigo-400 font-bold block">backend/app/services/mapping_job_service.py</span>
                      <span className="text-[10px] text-slate-400 font-sans">Asynchronous batch mapping execution, status tracking, and thread worker management.</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-purple-400 font-bold block">backend/app/services/persistence_service.py</span>
                      <span className="text-[10px] text-slate-400 font-sans">SQLite database interface (<code className="text-purple-300">semantra.sqlite3</code>) for durable workspace state.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: PIPELINE */}
            {activeSection === 'pipeline' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-400" />
                      4. Workspace Mapping Pipeline & Integration Modes
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      End-to-End Workflow
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Semantra provides two dedicated workspace operating modes for different integration patterns: Tabular/Database Datasets (Mode 1) and Middleware API Contracts (Mode 2).
                  </p>
                </div>

                {/* Workspace Modes Overview Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        Mode 1: Standard Integration
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 rounded">Tabular &amp; DB Schemas</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Designed for tabular datasets, data warehouses, and system database tables (e.g. SAP KNA1, MARC, LFA1, custom CSV/SQL tables). Follows a 5-step structured pipeline for ingestion, interactive candidate review, governance stewardship, executable code generation, and BA specification reporting.
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-indigo-400" />
                        Mode 2: Contract Reverse Engineering
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono bg-indigo-500/20 text-indigo-300 rounded">API &amp; Middleware Payloads</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Purpose-built for reverse engineering raw middleware payloads (JSON/XML), REST API schemas, and legacy message definitions into canonical integration contracts. Automatically flattens nested structures, matches candidates against canonical glossaries, synthesizes canonical JSON Schema contracts, and generates Python/TypeScript payload transformation code.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3 text-emerald-400 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    Mode 1: Standard Pipeline (Steps 1–5)
                  </h4>
                </div>

                <div className="space-y-3">
                  {/* STEP 1 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px]">STEP 1</span>
                        <span>Ingest Setup & Schema Analysis</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Source Selection</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Select or upload a raw source dataset (e.g. SAP Customer Sales Area, Material Master, Supplier Master, or custom CSV/JSON files). Semantra parses the metadata schema, samples column value distributions, and triggers the multi-signal heuristic engine across all fields automatically.
                    </p>
                  </div>

                  {/* STEP 2 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[10px]">STEP 2</span>
                        <span>Trust Review & Candidate Inspection</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Interactive Review</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Inspect generated field candidates filtered by confidence bands: High (<code className="text-emerald-400 font-mono">&gt;= 0.85</code>), Medium (<code className="text-amber-400 font-mono">0.60–0.84</code>), Low (<code className="text-rose-400 font-mono">&lt; 0.60</code>). Drill down into exact signal score breakdowns (Exact, Token, Catalog, LLM, Semantic), invoke bounded LLM enrichment on ambiguous fields, and override candidate choices.
                    </p>
                  </div>

                  {/* STEP 3 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[10px]">STEP 3</span>
                        <span>Active Decisions & Stewardship</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Governance Gate</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Review human analyst decisions, approve or reject overlay promotion proposals, and register new aliases or canonical concepts for unmapped fields (Canonical Gap management). All accepted stewardship proposals immediately update the runtime active overlay.
                    </p>
                  </div>

                  {/* STEP 4 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[10px]">STEP 4</span>
                        <span>Code Output & Transformation Engine</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Artifact Generation</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Export production-grade executable code tailored for enterprise data engineering stacks: PySpark DataFrames, SQL DDL/SELECT transformations, dbt models, or Python Pandas scripts. Code includes embedded type casting, value mapping, data quality assertions, and unit test sets.
                    </p>
                  </div>

                  {/* STEP 5 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px]">STEP 5</span>
                        <span>BA Specification & Audit Report</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Documentation</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Generate comprehensive Business Analyst mapping specification sheets, export searchable data dictionaries, view schema coverage metrics (mapped vs. unmapped percentage), and review full governance audit trails for executive sign-off.
                    </p>
                  </div>
                </div>

                {/* MODE 2 STEPS */}
                <div className="border-t border-slate-800 pt-6 mt-6">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3 text-indigo-400 flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-400" />
                    Mode 2: Contract Reverse Engineering Pipeline (Steps 1–5)
                  </h4>
                </div>

                <div className="space-y-3">
                  {/* MODE 2 - STEP 1 */}
                  <div className="p-4 bg-slate-950 border border-indigo-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">STEP 1</span>
                        <span>Contract Ingest & Health Audit</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400">Syntax & Health Score</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Paste or upload raw integration contract JSON/XML for ANY two applications (e.g. SAP S/4HANA ↔ Salesforce CRM, SAP ↔ ServiceNow, or Workday ↔ TimeClock presets). Automatically runs a 10-point structural health audit checking for missing entity trees, unconfigured OData/WSDL endpoint URLs, disabled sync entities with active URLs, and target attribute collisions. Offers one-click automated syntax and contract repair fixes.
                    </p>
                  </div>

                  {/* MODE 2 - STEP 2 */}
                  <div className="p-4 bg-slate-950 border border-indigo-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">STEP 2</span>
                        <span>Deconstruction & Pair Mapping</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400">Entity Breakdown</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Flattens complex nested API JSON structures into explicit source-to-target entity mapping pairs (e.g. SAP <code className="text-indigo-300 font-mono">customer_master</code> ↔ Salesforce <code className="text-indigo-300 font-mono">Account</code>, SAP <code className="text-indigo-300 font-mono">plant_material</code> ↔ ServiceNow <code className="text-indigo-300 font-mono">alm_hardware</code>, or Workday <code className="text-indigo-300 font-mono">worker</code> ↔ TimeClock <code className="text-indigo-300 font-mono">employee</code>). Enables interactive toggling of entity sync statuses, field-level inspection, search filtering, and OData/WSDL endpoint verification.
                    </p>
                  </div>

                  {/* MODE 2 - STEP 3 */}
                  <div className="p-4 bg-slate-950 border border-indigo-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">STEP 3</span>
                        <span>Canonical Model Synthesis</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400">Canonical Extraction</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Synthesizes vendor-agnostic Canonical Integration Models (e.g., <code className="text-indigo-300 font-mono">Canonical_Worker</code>, <code className="text-indigo-300 font-mono">Canonical_JobProfile</code>, <code className="text-indigo-300 font-mono">Canonical_ShiftBlock</code>) with calculated confidence scores (&gt; 90%). Allows importing synthesized canonical definitions directly into the core Semantra mapping workspace for governance enrichment.
                    </p>
                  </div>

                  {/* MODE 2 - STEP 4 */}
                  <div className="p-4 bg-slate-950 border border-indigo-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">STEP 4</span>
                        <span>Refined Contract & Code Export</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400">Artifact Generation</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Generates cleaned, auto-repaired integration contract JSON/YAML payloads alongside executable Python and TypeScript payload transformation code for ESB/middleware integration (MuleSoft, Boomi, Apache Camel, or custom API gateways).
                    </p>
                  </div>

                  {/* MODE 2 - STEP 5 */}
                  <div className="p-4 bg-slate-950 border border-indigo-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white text-xs font-mono">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">STEP 5</span>
                        <span>Visual Architecture & BA Docs</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400">Architecture Diagram</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Renders an interactive topology and flow diagram of source system endpoints, enterprise middleware, and target applications. Produces executive business analyst summary reports containing integration health metrics, entity sync tables, and compliance status.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: BOUNDED AI GATE */}
            {activeSection === 'bounded_ai' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      5. Bounded AI Gate, Surfaces & Execution Use Cases
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded">
                      backend/app/services/mapping_service.py
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Comprehensive breakdown of all Bounded AI surfaces, execution gates, guardrail rules, and arbitration logic across Semantra.</p>
                </div>

                {/* Core Philosophy Banner */}
                <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase font-mono tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Semantra Bounded AI Architecture Principle
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Semantra uses <strong>Bounded AI</strong> strictly in closed, inspectable, workflow-local surfaces. Large Language Models (Gemini, OpenAI, Ollama, LM Studio) never run autonomously, never alter ground-truth databases silently, and never invent target schema fields. Every AI invocation uses closed candidate prompts, temperature 0.0, and JSON schema guardrails.
                  </p>
                </div>

                {/* 4 Primary Bounded AI Use Cases Grid */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Complete Inventory of Active Bounded AI Surfaces & Integration Points (13 Surfaces)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Point 1 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          1. Companion Metadata Spec Analysis
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-mono">/api/ai/analyze-companion</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Deep semantic extraction from uploaded SAP spec sheets, DDLs, CSVs, or JSON data dictionaries. Automatically extracts descriptions, business rules, and semantic categories.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-300 font-semibold">Location:</span> Workspace &gt; Setup (Source & Target Companion Metadata cards)<br/>
                        <span className="text-emerald-300 font-semibold">Outcome:</span> Enriches fields with domain context &amp; business logic
                      </div>
                    </div>

                    {/* Point 2 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400 font-mono text-xs flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-indigo-400" />
                          2. AI-Enhanced Mapping Engine
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded font-mono">/api/ai/enhance-mappings</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Evaluates source fields against candidate target fields using active companion specification metadata, field descriptions, and sample data values.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-indigo-300 font-semibold">Location:</span> Workspace &gt; Setup (Trigger Mapping)<br/>
                        <span className="text-indigo-300 font-semibold">Outcome:</span> Explainable semantic mappings, confidence scores &amp; conflict alerts
                      </div>
                    </div>

                    {/* Point 3 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-400 font-mono text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          3. Bounded LLM Ambiguity Validation
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded font-mono">LLM Gate</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Evaluates ambiguous mapping candidates falling within the uncertainty score band (0.30 - 0.75) without overriding deterministic heuristic scores.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-cyan-300 font-semibold">Location:</span> Workspace &gt; Setup (Use LLM validation toggle)<br/>
                        <span className="text-cyan-300 font-semibold">Outcome:</span> Rationale notes &amp; candidate arbitration in Review
                      </div>
                    </div>

                    {/* Point 4 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 font-mono text-xs flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-amber-400" />
                          4. Per-Row & Batch LLM Mapping Refinement
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded font-mono">LLM Refine</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Allows analysts to provide custom field context, negative instructions, or targeted guidance for low-confidence rows.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-amber-300 font-semibold">Location:</span> Workspace &gt; Review (LLM refine button per row)<br/>
                        <span className="text-amber-300 font-semibold">Outcome:</span> Refined candidate proposals with accept/revert controls
                      </div>
                    </div>

                    {/* Point 5 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-400 font-mono text-xs flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-purple-400" />
                          5. LLM Decision Proposals Panel
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 rounded font-mono">Proposals</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Materializes proposal candidates for needs_review rows from cached trace logs or triggers live bounded LLM fill.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-purple-300 font-semibold">Location:</span> Workspace &gt; Review &amp; Workspace &gt; Decisions<br/>
                        <span className="text-purple-300 font-semibold">Outcome:</span> Single or safe-batch proposal application workflows
                      </div>
                    </div>

                    {/* Point 6 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-400 font-mono text-xs flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-rose-400" />
                          6. Mapping Analysis Overview &amp; Narrative Summary
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-rose-500/20 text-rose-300 rounded font-mono">Narrative</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Generates a comprehensive summary of mapping health, signal distribution, potential risks, and transformation readiness.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-rose-300 font-semibold">Location:</span> Workspace &gt; Review<br/>
                        <span className="text-rose-300 font-semibold">Outcome:</span> Structured analysis text &amp; narrative rationale
                      </div>
                    </div>

                    {/* Point 7 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-400 font-mono text-xs flex items-center gap-1.5">
                          <Code className="w-4 h-4 text-blue-400" />
                          7. Transformation Code Synthesis
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-blue-500/20 text-blue-300 rounded font-mono">Codegen</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Synthesizes production-ready transformation code for Pandas, PySpark, or dbt based on accepted decisions and target grain.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-blue-300 font-semibold">Location:</span> Workspace &gt; Output<br/>
                        <span className="text-blue-300 font-semibold">Outcome:</span> Governed, executable transformation code
                      </div>
                    </div>

                    {/* Point 8 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 text-emerald-400" />
                          8. Artifact Refinement with LLM
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-mono">Refine LLM</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Refines generated code or specification artifacts based on custom analyst instructions or compliance requirements.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-300 font-semibold">Location:</span> Workspace &gt; Output (Refine with LLM)<br/>
                        <span className="text-emerald-300 font-semibold">Outcome:</span> Side-by-side comparison with explicit accept/discard
                      </div>
                    </div>

                    {/* Point 9 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-400 font-mono text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          9. Test Set & Assertion Synthesis
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-teal-500/20 text-teal-300 rounded font-mono">Test Sets</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Generates automated unit test assertions and test sets for verified mapping decisions.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-teal-300 font-semibold">Location:</span> Workspace &gt; Output<br/>
                        <span className="text-teal-300 font-semibold">Outcome:</span> Repeatable unit test sets for output data regression
                      </div>
                    </div>

                    {/* Point 10 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400 font-mono text-xs flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-indigo-400" />
                          10. Workspace Copilot
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded font-mono">WS Copilot</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Context-aware Q&amp;A companion providing guidance on workspace status, blocker identification, and review risk summaries.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-indigo-300 font-semibold">Location:</span> Left Sidebar &amp; Main Panel headers<br/>
                        <span className="text-indigo-300 font-semibold">Outcome:</span> Live workflow assistance &amp; risk advice
                      </div>
                    </div>

                    {/* Point 11 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 font-mono text-xs flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          11. Benchmark Explanation Engine
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded font-mono">Benchmarks</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Analyzes benchmark run evidence, confidence bucket distributions, scoring profile deltas, and correction impact metrics.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-amber-300 font-semibold">Location:</span> Benchmarks tab<br/>
                        <span className="text-amber-300 font-semibold">Outcome:</span> Technical explanations &amp; benchmark performance summaries
                      </div>
                    </div>

                    {/* Point 12 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-emerald-400" />
                          12. Canonical & Knowledge Gap Suggestions
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-mono">Governance</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Recommends canonical concept additions or overlay promotions for unmapped field patterns across workspace sessions.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-300 font-semibold">Location:</span> Governance &gt; Canonical Console<br/>
                        <span className="text-emerald-300 font-semibold">Outcome:</span> Stewardship concept proposals &amp; vocabulary growth
                      </div>
                    </div>

                    {/* Point 13 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-400 font-mono text-xs flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-cyan-400" />
                          13. Catalog Workspace Reuse Fit & Explanation
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded font-mono">Catalog Reuse</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Analyzes fit and field-level overlap between saved catalog integration versions and active workspace datasets.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-cyan-300 font-semibold">Location:</span> Catalog tab<br/>
                        <span className="text-cyan-300 font-semibold">Outcome:</span> Compatibility readouts &amp; reuse recommendation reasoning
                      </div>
                    </div>

                    {/* Point 14 */}
                    <div className="p-3.5 bg-slate-950 border border-indigo-800/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400 font-mono text-xs flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-indigo-400" />
                          14. Integration Contract Reverse Engineering (7-Step Engine)
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded font-mono">Mode 2 Engine</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Reverse-engineers raw middleware JSON/XML payloads, SAP/Salesforce contracts, and legacy schemas. Automatically extracts cross-entity Foreign Keys (cardinality, CASCADE/RESTRICT rules), discovers schema constraints (<code className="text-indigo-300 font-mono">PRIMARY_KEY</code>, <code className="text-indigo-300 font-mono">NOT_NULL</code>, <code className="text-indigo-300 font-mono">CHECK</code>, <code className="text-indigo-300 font-mono">PII_MASKED</code>), synchronizes 1-click test invariants directly into the Semantra Assertions Test Suite, synthesizes canonical JSON Schema contracts, and generates executable Python/TS/SQL code with Business Analyst executive architecture reports.
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                        <span className="text-indigo-300 font-semibold">Location:</span> Workspace &gt; Mode Selector (Mode 2: Contract Reverse Engineering)<br/>
                        <span className="text-indigo-300 font-semibold">Outcome:</span> Smart Graph FK Explorer, Assertions Synchronization, Canonical JSON Schemas, and Executive Architecture Reports
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trigger Conditions */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs uppercase font-mono tracking-wider text-indigo-400 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    LLM Execution Gate Trigger Conditions (When AI Fires)
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-emerald-400 block font-mono">Case 1. Standard Ambiguity Confidence Band</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        The LLM validator is executed <em>only</em> when the top heuristic score falls inside the ambiguity window: <code className="text-emerald-300 font-mono">0.30 &lt; top_score &lt; 0.75</code>. Clear deterministic matches bypass LLM costs, while extremely low scores are protected from hallucinated guesses.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-cyan-400 block font-mono">Case 2. Close Competitor Tie-Breaking</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        If two or more candidates sit within a narrow confidence margin (<code className="text-cyan-300 font-mono">score_gap &lt;= 0.05</code>), the LLM gate triggers closed-choice arbitration to evaluate contextual business descriptions and disambiguate the winner.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-purple-400 block font-mono">Case 3. Canonical Semantic Rescue Path</span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Triggered when heuristic score is low (<code className="text-purple-300 font-mono">0.20–0.30</code>), the target candidate is a registered canonical concept, and semantic similarity is high (<code className="text-purple-300 font-mono">semantic &gt;= 0.45</code>), but system knowledge rules are absent.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PHASE 2: PII MASKING & CIRCUIT BREAKER RESILIENCE */}
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2.5">
                    <h4 className="font-bold text-emerald-300 text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Phase 2 Architecture: PII Sanitization &amp; Circuit Breaker Fault-Tolerance
                    </h4>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">
                      Enterprise Privacy &amp; Reliability
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* PII Sanitization Engine */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                      <span className="font-bold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                        🛡️ 1. Pre-Flight PII Masking &amp; Tokenization
                      </span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Before any prompt, payload, or companion file content is transmitted to Gemini or external LLMs, Semantra scans and intercepts sensitive PII entities:
                      </p>
                      <ul className="list-disc list-inside text-slate-400 text-[10px] space-y-1 font-mono">
                        <li><strong>Emails:</strong> <code className="text-emerald-300">user@corp.com</code> &rarr; <code className="text-emerald-400">[MASKED_EMAIL_1]</code></li>
                        <li><strong>IBAN / Bank Accounts:</strong> <code className="text-emerald-300">RS35...</code> &rarr; <code className="text-emerald-400">[MASKED_IBAN_1]</code></li>
                        <li><strong>Tax IDs &amp; PIB:</strong> <code className="text-emerald-300">104582910</code> &rarr; <code className="text-emerald-400">[MASKED_TAX_ID_1]</code></li>
                        <li><strong>National IDs / JMBG:</strong> 13-digit IDs &rarr; <code className="text-emerald-400">[MASKED_NATIONAL_ID_1]</code></li>
                        <li><strong>Credit Cards &amp; Phones:</strong> Intercepted and tokenized with safe dictionary map.</li>
                      </ul>
                      <p className="text-slate-400 text-[10px] pt-1">
                        Token dictionaries remain securely in memory. Authorized views can perform reverse rehydration without ever leaking raw data over the network.
                      </p>
                    </div>

                    {/* Circuit Breaker Machine */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                      <span className="font-bold text-amber-400 font-mono text-xs flex items-center gap-1.5">
                        ⚡ 2. Circuit Breaker &amp; Deterministic Fallback
                      </span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Protects UI responsiveness and guarantees zero mapping pipeline blockage during API outages or quota limits:
                      </p>
                      <div className="space-y-1.5 text-[10px] font-mono">
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex justify-between">
                          <span className="text-emerald-400 font-bold">CLOSED:</span>
                          <span className="text-slate-300">Normal execution. Latency &lt; 8,000ms.</span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex justify-between">
                          <span className="text-rose-400 font-bold">OPEN:</span>
                          <span className="text-slate-300">Trips on 3 consecutive failures. Fast fallback.</span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800 flex justify-between">
                          <span className="text-amber-400 font-bold">HALF_OPEN:</span>
                          <span className="text-slate-300">Probes service recovery after 15s cooldown.</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[10px] pt-1">
                        When OPEN, endpoints immediately engage multi-signal heuristic rules (Levenshtein, Taxonomy, Canonical) with 100% fidelity.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Closed Choice & Global Assignment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2">
                    <h4 className="font-bold text-indigo-300 text-xs flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      Closed Choice Prompt Constraint
                    </h4>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      The LLM prompt strictly receives a pre-filtered list of candidate target fields plus an explicit <code className="text-indigo-300 font-mono">no_match</code> option. The model is forbidden from suggesting target names outside the provided list.
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2">
                    <h4 className="font-bold text-indigo-300 text-xs flex items-center gap-1.5 font-mono">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                      Global Bipartite Target Assignment
                    </h4>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      After individual candidate scores are computed, Semantra runs a global 1-to-1 bipartite optimal assignment algorithm (Hungarian method) across the workspace to guarantee that no target field is mapped twice unintentionally.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: GOVERNANCE & CANONICAL CATALOG CONSOLE */}
            {activeSection === 'governance' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      6. Governance, Canonical Glossary & Knowledge Runtime
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      backend/app/services/metadata_knowledge_service.py
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Authoritative guide to canonical concepts, metadata knowledge runtime, overlay lifecycle, gap triage, and stewardship promotion pathways.
                  </p>
                </div>

                {/* Core Canonical & Knowledge Operating Model */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-emerald-300 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Canonical & Knowledge Runtime Model (<code className="text-emerald-400 font-mono text-[10px]">KnowledgeRuntimeStatus</code>)
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    The Governance surface provides enterprise data stewards and architects with full control over Semantra's DB-first canonical runtime (persisted in <code className="text-emerald-300 font-mono text-[10px]">semantra.sqlite3</code>). The runtime dynamically fuses the base master canonical glossary with active overlay layers to serve heuristic and semantic mapping queries in real time.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono text-xs">base_only Mode</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Durable Baseline</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Only the persisted master canonical glossary and system knowledge rules are active. Scoring operates strictly against audited ground-truth definitions.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-400 font-mono text-xs">overlay_active Mode</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded font-mono">Merged Overlay</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        One validated knowledge overlay version is merged on top of the base glossary, extending alias coverage dynamically without corrupting base definitions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Concept Classification & Alias Hygiene */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    Canonical Concept Registry & Source Classification
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    In the Canonical Console, every business concept is classified by its source origin and sanitized via alias hygiene rules (removing numeric noise and token artifacts):
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-emerald-400 font-mono block text-[11px]">source: base</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Concept exists in the base canonical glossary and currently has no active overlay aliases attached to it.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-cyan-400 font-mono block text-[11px]">source: base_plus_active_overlay</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Master concept exists in the base glossary and is actively extended with new aliases by the active overlay layer.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-purple-400 font-mono block text-[11px]">source: overlay_only</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Concept currently surfaces strictly through the active overlay and has not yet undergone glossary promotion.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stitched Detail & Knowledge Overlay Lifecycle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-100 text-xs font-mono flex items-center gap-2 text-indigo-400">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Stitched Concept Governance View
                    </h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Opening a canonical concept detail stitches together base terms, field contexts (technical patterns, declared data types), active overlay entries, catalog integration usage counts, and historical audit entries into a unified view.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-100 text-xs font-mono flex items-center gap-2 text-amber-400">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Overlay Lifecycle & Validation Gates
                    </h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Overlays follow a strict state progression: <code className="text-amber-300 font-mono">draft</code> &rarr; <code className="text-amber-300 font-mono">validated</code> &rarr; <code className="text-amber-300 font-mono">active</code> &rarr; <code className="text-amber-300 font-mono">archived</code>. Uploads pass validation checking for row conflicts before saving. Supports single-click <code className="text-amber-300 font-mono">Activate</code>, <code className="text-amber-300 font-mono">Deactivate</code>, and <code className="text-amber-300 font-mono">Rollback</code>.
                    </p>
                  </div>
                </div>

                {/* Canonical Gap Triage & LLM Proposal Boundary */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs font-mono uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Canonical Gap Governance & LLM Proposal Boundary
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    When mapping sessions discover unmapped source fields, Semantra extracts them as Canonical Gap candidates for stewardship triage:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-purple-300 font-mono block">Proposal Triage Pipeline</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Gap items progress through <code className="text-purple-300 font-mono">new</code> &rarr; <code className="text-purple-300 font-mono">needs_review</code> &rarr; <code className="text-purple-300 font-mono">ready_for_approval</code>. Backend API gates explicitly block approval until the state reaches <code className="text-purple-300 font-mono">ready_for_approval</code>.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-rose-300 font-mono block">Strict LLM Proposal Boundary</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Workspace LLM proposals (<code className="text-rose-300 font-mono">llm_proposal</code>) are row-level mapping suggestions and <em>never</em> alter canonical definitions. Only Canonical Gap approval or Stewardship promotion writes to canonical runtime state.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stewardship Ledger & Promotion */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-300 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Stewardship Console Ledger &amp; Glossary Promotion
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      2-Step Governed Promotion
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    The Stewardship table serves as the durable governance ledger storing item types (<code className="text-emerald-300 font-mono">canonical_gap</code>, <code className="text-emerald-300 font-mono">overlay_promotion</code>), owner assignments, review notes, and snapshot payloads.
                  </p>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                    <span className="font-bold text-white font-mono block">Promote to Glossary Execution (<code className="text-emerald-400 font-mono">POST /knowledge/stewardship-items/.../promote-to-glossary</code>)</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Executing <code className="text-emerald-300 font-mono">Promote to Glossary</code> is a deliberate second-step governance action that extracts overlay alias entries, writes them permanently into the master canonical glossary, updates item status to <code className="text-emerald-300 font-mono">promoted</code>, and appends timestamped audit logs with reviewer details.
                    </p>
                  </div>
                </div>

                {/* Git-Like Branching & 3-Way Merge Conflict Resolution Wizard */}
                <div className="p-4 bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2.5">
                    <h4 className="font-bold text-indigo-300 text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                      Git-Like Branching &amp; 3-Way Merge Conflict Resolution Wizard
                    </h4>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-bold">
                      Advanced Stewardship Engine
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    Semantra implements a robust Git-like version control paradigm for enterprise canonical vocabularies, enabling data architects to collaborate across branch sandboxes without breaking production mappings:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <span className="font-bold text-emerald-400 font-mono block flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" />
                        1. Branch Isolation &amp; Sandboxes
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Create feature or rollout branches (e.g. <code className="text-emerald-300 font-mono">main</code>, <code className="text-emerald-300 font-mono">draft-salesforce-q3</code>, <code className="text-emerald-300 font-mono">feature-tax-harmonization</code>). Draft modifications remain completely isolated until explicit merge.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <span className="font-bold text-cyan-400 font-mono block flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" />
                        2. 3-Way Merge Conflict Wizard
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        When merging draft overlays into <code className="text-cyan-300 font-mono">main</code>, the wizard detects schema collisions and allows attribute-by-attribute resolution: <strong>Use Draft</strong>, <strong>Keep Main</strong>, or <strong>Custom Override</strong>.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <span className="font-bold text-purple-400 font-mono block flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        3. Stewardship Audit Trail
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Every merge execution generates a cryptographic commit hash (<code className="text-purple-300 font-mono">c7f92a1...</code>) and idempotency transaction key, appended to an immutable JSON-exportable audit ledger.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: BENCHMARKS */}
            {activeSection === 'benchmarks' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      7. Benchmarks & Evaluation Curves
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      Regression Test Suite
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Measuring deterministic accuracy, regression test performance, and analyst correction impact curves.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="font-bold text-emerald-300 text-xs uppercase font-mono tracking-wider">Automated Regression & Backtesting</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      The Benchmarks module runs active mapping engine configurations against ground-truth benchmark datasets (e.g. SAP Customer Master to Canonical Customer, Oracle EBS Financials to Standard Ledger). It calculates precision, recall, and overall F1-score to verify that newly promoted catalog rules or tuned scoring profiles improve mapping accuracy without causing regression errors in existing domains.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-emerald-400 block font-mono">Correction Gain Curve</span>
                      <p className="text-slate-400 text-[11px]">
                        Quantifies how each analyst correction and overlay promotion reduces manual review hours in subsequent mapping projects.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-cyan-400 block font-mono">Sensitivity Analysis</span>
                      <p className="text-slate-400 text-[11px]">
                        Tests different weight distributions across Exact, Token, Catalog, and Semantic signals to find optimal scoring profile parameters.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-purple-400 block font-mono">Pilot Regression Subset</span>
                      <p className="text-slate-400 text-[11px]">
                        Executes targeted pilot validation subsets (<code className="text-purple-300 font-mono">PILOT_REGRESSION_SUBSET.md</code>) for rapid smoke testing during deployment cycles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: STANDALONE WEB VS CLI */}
            {activeSection === 'standalone_web' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-emerald-400" />
                      8. Full-Stack TypeScript &amp; Node.js Architecture
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      Native Stack
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">High-performance full-stack web application powered by React 18, Vite, Express (Node.js), and Google Gemini AI.</p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-emerald-300 text-xs uppercase tracking-wider font-mono">Unified Runtime Architecture</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs block font-mono">🌐 Frontend Client (React 18 + Vite)</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-mono">Client Tier</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Responsive single-page application built with React 18, Tailwind CSS, Lucide icons, and Motion animations. Executes deterministic multi-signal scoring, 3-way conflict resolution, and schema transformations in real-time.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs block font-mono">⚡ Backend Server (Express / Node.js)</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/20 text-cyan-300 rounded font-mono">Server Tier</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Express server (<code className="text-cyan-300 font-mono">server.ts</code>) orchestrates secure server-side Gemini 2.5 API requests, provides health telemetry endpoints, and manages full-stack bundle delivery.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
                  <h4 className="font-bold text-slate-200 text-xs uppercase font-sans font-semibold">Production &amp; Development Execution</h4>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Development Server:</span>
                      <code className="text-emerald-400 font-bold">npm run dev (Port 3000)</code>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Production Compilation:</span>
                      <code className="text-cyan-400 font-bold">npm run build</code>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Production Server Start:</span>
                      <code className="text-purple-400 font-bold">node dist/server.cjs</code>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-emerald-200 text-[11px]">
                    Semantra Enterprise Workbench runs as a unified, zero-dependency Node.js and React container with complete deterministic scoring algorithms, LLM gates, stewardship ledger, and contract engineering engines.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 9: SUPPORTED WORKFLOWS & NAVIGATION */}
            {activeSection === 'workflows' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <GitPullRequest className="w-5 h-5 text-emerald-400" />
                      9. Semantra Pilot-Ready Workflows (WF-01 – WF-13)
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                      Supported Operations
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Authoritative guide describing how Semantra is operated across actual UI surfaces and governance paths today.</p>
                </div>

                {/* Application Architecture & Surface Layout */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-emerald-300 text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Top-Level Application Areas Today
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-emerald-400 block font-mono">Workspace</span>
                      <p className="text-slate-400 text-[10px]">Active mapping, setup, review, decisions, preview, codegen, and BA reporting.</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-cyan-400 block font-mono">Catalog</span>
                      <p className="text-slate-400 text-[10px]">Approved integration search, field-scoped reuse, and similarity scoring.</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-purple-400 block font-mono">Benchmarks</span>
                      <p className="text-slate-400 text-[10px]">Regression testing, evaluation runs, and analyst correction impact curves.</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-amber-400 block font-mono">System</span>
                      <p className="text-slate-400 text-[10px]">Operational runtime state, decision logs, and environment diagnostics.</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="font-bold text-indigo-400 block font-mono">Governance</span>
                      <p className="text-slate-400 text-[10px]">Canonical Console, term glossary, gap queue, and overlay stewardship.</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    <strong className="text-slate-200">Key Surface Note:</strong> The <em>Canonical Console</em> is a key stewardship area housed directly inside <strong>Governance</strong>, while <strong>System</strong> serves as the operational administrative view (formerly Admin/Debug).
                  </p>
                </div>

                {/* WF-01 to WF-12 Workflow Cards */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs uppercase font-mono tracking-wider text-emerald-400">
                    Comprehensive Workflow Specifications (WF-01 to WF-12)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">

                    {/* WF-01 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-emerald-400 font-mono">WF-01 • Standard Source-to-Target Setup</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Workspace &gt; Setup</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Upload source and target datasets (CSVs, JSON, row data). Add companion metadata, configure LLM validation flags, run multi-signal heuristic profiling, and launch mapping generation.
                      </p>
                    </div>

                    {/* WF-02 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-emerald-400 font-mono">WF-02 • Schema-Spec & SQL Snapshot Variant</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Schema-Only</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Map column-per-row schema specifications or multi-table SQL DDL snapshots without needing raw row data samples, enriched via companion metadata definitions.
                      </p>
                    </div>

                    {/* WF-03 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-cyan-400 font-mono">WF-03 • Canonical-First Mapping</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Canonical Mode</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Normalize raw source structures directly into enterprise canonical business concepts when no concrete target dataset exists, skipping row preview while retaining codegen and artifact refinement.
                      </p>
                    </div>

                    {/* WF-04 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-cyan-400 font-mono">WF-04 • Review Guidance & Trust Analysis</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Workspace &gt; Review</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Inspect candidate score breakdowns, apply manual canonical overrides, invoke per-row or batch LLM refinement, and generate Mapping Analysis Overviews or Review Queue Plans.
                      </p>
                    </div>

                    {/* WF-05 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-purple-400 font-mono">WF-05 • Active Decisions & Auditable Changes</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Workspace &gt; Decisions</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Manage active decision states, execute conservative batch application (<code className="text-purple-300 font-mono">Apply Safe</code>), and preserve decision-origin metadata through JSON export/import cycles.
                      </p>
                    </div>

                    {/* WF-06 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-purple-400 font-mono">WF-06 • Output, Codegen & Artifact Refinement</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Workspace &gt; Output</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Generate advisory transformation previews, export PySpark/Pandas code, run LLM artifact refinement with side-by-side diff comparison, and execute transformation test assertions.
                      </p>
                    </div>

                    {/* WF-07 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-indigo-400 font-mono">WF-07 • Mapping-Set Save, Review & Approve</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Governed Artifacts</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Save versioned mapping sets with metadata (owner, assignee, review notes), transition through draft/review/approved states, inspect version diffs, and apply approved versions.
                      </p>
                    </div>

                    {/* WF-08 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-indigo-400 font-mono">WF-08 • Governance & Stewardship Console</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Governance Surface</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Manage master canonical concepts, inspect alias usage contexts, evaluate stewardship proposals in the gap queue, and execute durable promotion to the canonical glossary.
                      </p>
                    </div>

                    {/* WF-09 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-amber-400 font-mono">WF-09 • Catalog Search & Reuse Fit</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Catalog Surface</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Search approved integrations, perform field-scoped overlap discovery, calculate Workspace Reuse Shortlists and Fit scores, and load approved mappings back into Workspace.
                      </p>
                    </div>

                    {/* WF-10 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-amber-400 font-mono">WF-10 • Benchmarks & Correction Impact</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Benchmarks Surface</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Capture accepted mappings into test suites, run precision/recall benchmark evaluations, compare scoring profile parameters, and measure correction-impact gain curves.
                      </p>
                    </div>

                    {/* WF-11 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-rose-400 font-mono">WF-11 • Corrections & Reusable Learning</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">Learning Engine</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Persist analyst feedback from closed review outcomes into durable memory, promote recurring mapping patterns to catalog rules, and track scoring impact across runs.
                      </p>
                    </div>

                    {/* WF-12 */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-rose-400 font-mono">WF-12 • System & Runtime Operations</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded font-mono">System Operations</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Inspect active runtime configurations, decision logs, knowledge runtime states, and operational health signals for administrative diagnostics.
                      </p>
                    </div>

                    {/* WF-13 */}
                    <div className="p-3.5 bg-slate-950 border border-indigo-800/60 rounded-xl space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2">
                        <span className="font-bold text-indigo-400 font-mono">WF-13 • Integration Contract Reverse Engineering (7-Step Pipeline)</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded font-mono">Workspace &gt; Mode 2</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong>Purpose:</strong> Paste or upload raw integration payloads (JSON/XML) or API schemas. Follows a deterministic 7-step reverse engineering pipeline:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 font-mono text-[10px] text-slate-300">
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-emerald-400 font-bold block">1. Ingest &amp; Health Audit</span>
                          Parse payloads, compute health scores &amp; payload quality metrics.
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-cyan-400 font-bold block">2. Deconstruction</span>
                          Flatten nested paths, detect leaf types &amp; candidate matches.
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-indigo-400 font-bold block">3. Smart Graph &amp; FKs</span>
                          Discover cross-entity Foreign Keys, cardinality &amp; CASCADE actions.
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-emerald-400 font-bold block">4. Assertions Sync</span>
                          1-Click sync of invariants &amp; constraints into Semantra Test Suite.
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-purple-400 font-bold block">5. Canonical Synthesis</span>
                          Synthesize unified JSON Schema models &amp; domain entities.
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-amber-400 font-bold block">6. Refine &amp; Export</span>
                          Generate Python, TypeScript, SQL DDL &amp; JSON Schema.
                        </div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800 md:col-span-2">
                          <span className="text-pink-400 font-bold block">7. Visual Architecture &amp; BA Report</span>
                          Interactive diagram visualization &amp; Business Analyst Executive Report with risk analysis.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Recommended Execution Sequence */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-slate-200 text-xs uppercase font-sans font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Recommended Operational Execution Order
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <span className="font-bold text-emerald-400 font-mono text-xs block">Standard Integration Path</span>
                      <p className="text-slate-300 text-[11px] font-mono leading-relaxed">
                        WF-01/02 &rarr; WF-04 &rarr; WF-05 &rarr; WF-06 &rarr; WF-07 &rarr; (WF-09 / WF-10 / WF-11)
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <span className="font-bold text-cyan-400 font-mono text-xs block">Canonical Normalization Path</span>
                      <p className="text-slate-300 text-[11px] font-mono leading-relaxed">
                        WF-03 &rarr; WF-04 &rarr; WF-05 &rarr; WF-06 &rarr; (WF-08 / WF-10 / WF-11)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Boundaries */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-amber-300 font-mono uppercase text-[11px] tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Current Product Capabilities & Explicit Boundaries
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Semantra is built as a pilot-ready <strong>semantic mapping, review, governance, and reuse workbench</strong> powered by bounded AI guidance. It is <em>not</em> an autonomous production ETL engine, scheduled job orchestrator, connector platform, or graph metadata server.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <span>Semantra v1.3 Enterprise &amp; Pilot Workbench • Mapping Signals &amp; Scoring Reference Spec</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-sans font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Help Guide
          </button>
        </div>

      </div>
    </div>
  );
};

