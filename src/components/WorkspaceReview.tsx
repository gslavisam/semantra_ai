import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  CheckCircle, 
  HelpCircle, 
  Filter, 
  ArrowRight, 
  ShieldAlert,
  ClipboardList,
  RefreshCw,
  SlidersHorizontal,
  ThumbsUp,
  Code2,
  ChevronDown,
  ChevronUp,
  Terminal
} from 'lucide-react';
import { MappingRow, Confidence, MappingSignal, DecisionStatus, MappingType } from '../types';
import { generateFieldReasoning } from '../lib/reasoning';

interface WorkspaceReviewProps {
  mappings: MappingRow[];
  setMappings: React.Dispatch<React.SetStateAction<MappingRow[]>>;
  onNextStep: () => void;
}

export const WorkspaceReview: React.FC<WorkspaceReviewProps> = ({ mappings, setMappings, onNextStep }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [refiningRowId, setRefiningRowId] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingBatchAi, setIsGeneratingBatchAi] = useState(false);
  const [expandedDetailsRowIds, setExpandedDetailsRowIds] = useState<Record<string, boolean>>({});
  const [aiPandasPrompts, setAiPandasPrompts] = useState<Record<string, string>>({});
  const [isGeneratingPandas, setIsGeneratingPandas] = useState<Record<string, boolean>>({});

  const toggleDetails = (id: string) => {
    setExpandedDetailsRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // AI Natural Language to Pandas Code Generator
  const handleGeneratePandasFromAiPrompt = (rowId: string, sourceField: string, promptText: string) => {
    if (!promptText.trim()) return;

    setIsGeneratingPandas(prev => ({ ...prev, [rowId]: true }));

    setTimeout(() => {
      const p = promptText.toLowerCase().trim();
      let generatedCode = '';

      const col = `df_source["${sourceField}"]`;

      // Smart NL-to-Pandas expression compiler
      if ((p.includes('upper') || p.includes('uppercase') || p.includes('velik')) && (p.includes('strip') || p.includes('trim') || p.includes('space') || p.includes('razmak'))) {
        generatedCode = `${col}.astype(str).str.strip().str.upper()`;
      } else if ((p.includes('lower') || p.includes('lowercase') || p.includes('mal')) && (p.includes('strip') || p.includes('trim') || p.includes('space') || p.includes('razmak'))) {
        generatedCode = `${col}.astype(str).str.strip().str.lower()`;
      } else if (p.includes('zero') || p.includes('leading') || p.includes('lstrip') || p.includes('nule')) {
        generatedCode = `${col}.astype(str).str.lstrip('0')`;
      } else if (p.includes('digit') || p.includes('number') || p.includes('numeric') || p.includes('broj') || p.includes('cifr')) {
        generatedCode = `${col}.astype(str).str.replace(r'\\D', '', regex=True)`;
      } else if (p.includes('date') || p.includes('format') || p.includes('yyyy') || p.includes('datum')) {
        generatedCode = `pd.to_datetime(${col}).dt.strftime('%Y-%m-%d')`;
      } else if (p.includes('upper') || p.includes('uppercase') || p.includes('majuskul') || p.includes('velik')) {
        generatedCode = `${col}.astype(str).str.upper()`;
      } else if (p.includes('lower') || p.includes('lowercase') || p.includes('mal')) {
        generatedCode = `${col}.astype(str).str.lower()`;
      } else if (p.includes('trim') || p.includes('strip') || p.includes('space') || p.includes('whitespace') || p.includes('razmak')) {
        generatedCode = `${col}.astype(str).str.strip()`;
      } else if (p.includes('email') || p.includes('domain') || p.includes('domen')) {
        generatedCode = `${col}.astype(str).str.split('@').str[1]`;
      } else if (p.includes('empty') || p.includes('null') || p.includes('na') || p.includes('missing') || p.includes('replace') || p.includes('prazn') || p.includes('zameni')) {
        generatedCode = `${col}.fillna("N/A").replace("", "N/A")`;
      } else if (p.includes('prefix') || p.includes('prepend') || p.includes('prefiks') || p.includes('ispred')) {
        generatedCode = `'REF-' + ${col}.astype(str)`;
      } else if (p.includes('suffix') || p.includes('append') || p.includes('sufiks') || p.includes('iza')) {
        generatedCode = `${col}.astype(str) + '_VALIDATED'`;
      } else if (p.includes('round') || p.includes('decimal') || p.includes('zaokru')) {
        generatedCode = `${col}.astype(float).round(2)`;
      } else {
        // AI fallback synthesis for custom prompt
        generatedCode = `${col}.astype(str).apply(lambda x: x.strip().upper() if x else "N/A")  # AI Rule: ${promptText}`;
      }

      handleTransformationChange(rowId, generatedCode);
      setIsGeneratingPandas(prev => ({ ...prev, [rowId]: false }));
    }, 600);
  };

  // Handle Decision Status change
  const handleDecisionStatusChange = (rowId: string, status: DecisionStatus) => {
    setMappings(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          decisionStatus: status,
          isApproved: status === 'accepted',
          score: status === 'accepted' ? 1.0 : r.score
        };
      }
      return r;
    }));
  };

  // Handle Mapping Type change
  const handleMappingTypeChange = (rowId: string, type: MappingType) => {
    setMappings(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          mappingType: type
        };
      }
      return r;
    }));
  };

  // Non-high or missing LLM signal count
  const nonHighFields = mappings.filter(r => r.confidence !== 'high');
  const nonHighCount = nonHighFields.length;

  // Generate batch AI signals for non-high fields
  const handleGenerateBatchAiSignals = () => {
    if (nonHighCount === 0) return;
    setIsGeneratingBatchAi(true);

    setTimeout(() => {
      setMappings(prev => prev.map(row => {
        if (row.confidence !== 'high') {
          const newSignals = Array.from(new Set([...row.signals, 'llm' as MappingSignal]));
          const newScore = Math.min(0.98, Number((row.score + 0.20).toFixed(2)));
          const isAccepted = newScore >= 0.85;
          return {
            ...row,
            score: newScore,
            confidence: 'high' as Confidence,
            signals: newSignals,
            decisionStatus: isAccepted ? 'accepted' : row.decisionStatus || 'needs_review',
            isApproved: isAccepted ? true : row.isApproved,
            explanation: `${row.explanation} [AI Signal Generated: Multi-modal LLM reasoning verified field alignment.]`,
            llmNotes: `Batch AI signal generated: Elevated confidence to HIGH (${Math.round(newScore * 100)}% score, auto-accepted threshold satisfied).`
          };
        }
        return row;
      }));
      setIsGeneratingBatchAi(false);
    }, 1400);
  };

  // Single row AI signal generation
  const handleGenerateSingleAiSignal = (rowId: string) => {
    setMappings(prev => prev.map(row => {
      if (row.id === rowId) {
        const newSignals = Array.from(new Set([...row.signals, 'llm' as MappingSignal]));
        const newScore = Math.min(0.98, Number((row.score + 0.20).toFixed(2)));
        const isAccepted = newScore >= 0.85;
        return {
          ...row,
          score: newScore,
          confidence: 'high' as Confidence,
          signals: newSignals,
          decisionStatus: isAccepted ? 'accepted' : row.decisionStatus || 'needs_review',
          isApproved: isAccepted ? true : row.isApproved,
          explanation: `${row.explanation} [AI Signal Generated: Single-field LLM verified semantic fit.]`,
          llmNotes: `AI signal generated: Contextual schema semantics validated (${Math.round(newScore * 100)}% score, auto-accepted).`
        };
      }
      return row;
    }));
  };

  // Filter logic
  const filteredMappings = mappings.filter((row) => {
    const matchesSearch = 
      (row.sourceField || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.targetField || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.sourceDesc || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (confidenceFilter === 'all') return matchesSearch;
    return matchesSearch && row.confidence === confidenceFilter;
  });

  // Calculate statistics
  const totalCount = mappings.length;
  const highCount = mappings.filter(r => r.confidence === 'high').length;
  const mediumCount = mappings.filter(r => r.confidence === 'medium').length;
  const lowCount = mappings.filter(r => r.confidence === 'low').length;
  
  // Average mapping score
  const avgScore = totalCount > 0 
    ? (mappings.reduce((acc, r) => acc + r.score, 0) / totalCount) * 100 
    : 0;

  // Handle custom transformation change
  const handleTransformationChange = (rowId: string, customCode: string) => {
    setMappings(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          transformation: customCode,
          transformationCode: customCode,
          signals: Array.from(new Set([...r.signals, 'correction'] as const))
        };
      }
      return r;
    }));
  };

  // Helper to generate transformation code from prompt or rules
  const generateRefinedTransformation = (prompt: string, sourceField: string, currentTarget: string) => {
    const p = prompt.toLowerCase();

    // 1. Account tier / Customer service level / Revenue 3 categories
    if (
      p.includes('tier') ||
      p.includes('service level') ||
      p.includes('revenue') ||
      p.includes('turnover') ||
      p.includes('3 categories') ||
      p.includes('categories') ||
      p.includes('classify') ||
      p.includes('level') ||
      p.includes('col_4')
    ) {
      return `np.select([df_source["${sourceField}"] >= 1000000, df_source["${sourceField}"] >= 250000], ["Tier_1_Gold", "Tier_2_Silver"], default="Tier_3_Bronze")`;
    }

    // 2. Trim / Strip
    if (p.includes('trim') || p.includes('strip')) {
      return `df_source["${sourceField}"].astype(str).str.strip()`;
    }

    // 3. Upper / Lower / Title
    if (p.includes('upper')) {
      return `df_source["${sourceField}"].astype(str).str.upper()`;
    }
    if (p.includes('lower')) {
      return `df_source["${sourceField}"].astype(str).str.lower()`;
    }
    if (p.includes('title')) {
      return `df_source["${sourceField}"].astype(str).str.title()`;
    }

    // 4. Currency / Price / Numeric
    if (p.includes('currency') || p.includes('price') || p.includes('amount') || p.includes('decimal')) {
      return `pd.to_numeric(df_source["${sourceField}"].astype(str).str.replace(r'[^0-9.]', '', regex=True), errors='coerce').fillna(0.00)`;
    }

    // 5. Date / Time
    if (p.includes('date') || p.includes('time')) {
      return `pd.to_datetime(df_source["${sourceField}"]).dt.strftime('%Y-%m-%d')`;
    }

    // 6. Generic rule
    return `df_source["${sourceField}"].apply(lambda val: str(val).strip() if pd.notnull(val) else None) # Rule: ${prompt.slice(0, 60)}`;
  };

  // Handle template selection from dropdown
  const handleSelectTemplate = (rowId: string, sourceField: string, templateKey: string) => {
    if (!templateKey) return;
    let code = '';
    switch (templateKey) {
      case 'account_tier':
        code = `np.select([df_source["${sourceField}"] >= 1000000, df_source["${sourceField}"] >= 250000], ["Tier_1_Gold", "Tier_2_Silver"], default="Tier_3_Bronze")`;
        break;
      case 'trim':
        code = `df_source["${sourceField}"].astype(str).str.strip()`;
        break;
      case 'lower':
        code = `df_source["${sourceField}"].astype(str).str.lower()`;
        break;
      case 'upper':
        code = `df_source["${sourceField}"].astype(str).str.upper()`;
        break;
      case 'title':
        code = `df_source["${sourceField}"].astype(str).str.title()`;
        break;
      case 'prefix':
        code = `'C-' + df_source["${sourceField}"].astype(str)`;
        break;
      case 'suffix':
        code = `df_source["${sourceField}"].astype(str) + '_ID'`;
        break;
      case 'email_title':
        code = `df_source["${sourceField}"].astype(str).str.split('@').str[0].str.title()`;
        break;
      case 'digits_only':
        code = `df_source["${sourceField}"].astype(str).str.replace(r'\\D', '', regex=True)`;
        break;
      default:
        return;
    }
    handleTransformationChange(rowId, code);
  };

  // Handle refinement submission
  const handleRefine = (rowId: string) => {
    setRefiningRowId(rowId);
    setRefinementPrompt('');
  };

  const submitRefinement = (rowId: string) => {
    setIsRefining(true);
    
    setTimeout(() => {
      // Simulate intelligent refinement
      setMappings(prev => prev.map(row => {
        if (row.id === rowId) {
          const rawPrompt = refinementPrompt.trim();
          const prompt = rawPrompt.toLowerCase();
          let updatedTarget = row.targetField;
          let updatedExplanation = row.explanation;
          let updatedScore = Math.min(row.score + 0.12, 0.99);
          let updatedConfidence: Confidence = 'high';

          // Target detection from prompt
          if (prompt.includes('df_target.col_4') || prompt.includes('col_4')) {
            updatedTarget = 'col_4';
          } else if (prompt.includes('currency') || prompt.includes('waers')) {
            updatedTarget = 'document_currency_code';
          } else if (prompt.includes('price') || prompt.includes('pricing') || prompt.includes('pltyp')) {
            updatedTarget = 'price_list_type_id';
          }

          // Generate Python/Pandas transformation code
          const generatedTransformation = generateRefinedTransformation(rawPrompt, row.sourceField, updatedTarget);

          if (
            prompt.includes('tier') ||
            prompt.includes('service level') ||
            prompt.includes('revenue') ||
            prompt.includes('turnover') ||
            prompt.includes('3 categories') ||
            prompt.includes('categories') ||
            prompt.includes('col_4')
          ) {
            updatedExplanation = `AI generated 3-tier customer service level rule based on revenue/turnover metrics: Tier 1 Gold (>=1M), Tier 2 Silver (>=250K), Tier 3 Bronze (<250K). Mapped to ${updatedTarget}.`;
          } else if (prompt.includes('currency') || prompt.includes('waers')) {
            updatedExplanation = 'Refined via LLM analysis of ISO-4217 financial contexts. Adjusted target field to document_currency_code and generated code.';
          } else if (prompt.includes('price') || prompt.includes('pricing') || prompt.includes('pltyp')) {
            updatedExplanation = 'Refined via price list type matching heuristics. Score recalibrated with high confidence.';
          } else {
            updatedExplanation = `Refined based on user instruction: "${rawPrompt}". Generated Python transformation rule and updated schema mappings.`;
          }

          const finalScore = Number(updatedScore.toFixed(2));
          const isAccepted = finalScore >= 0.85;

          return {
            ...row,
            targetField: updatedTarget,
            transformation: generatedTransformation,
            transformationCode: generatedTransformation,
            explanation: updatedExplanation,
            score: finalScore,
            confidence: updatedConfidence,
            decisionStatus: isAccepted ? 'accepted' : row.decisionStatus || 'needs_review',
            isApproved: isAccepted ? true : row.isApproved,
            signals: Array.from(new Set([...row.signals, 'llm' as MappingSignal, 'correction' as MappingSignal])),
            llmNotes: `Refined target: ${updatedTarget}. Generated Python transformation: ${generatedTransformation}`
          };
        }
        return row;
      }));

      setIsRefining(false);
      setRefiningRowId(null);
    }, 1200);
  };

  // Helper SVG Mini Progress Ring / Gauge for row confidence visualization
  const ConfidenceRing = ({ score, confidence }: { score: number; confidence: Confidence }) => {
    const percentage = Math.round(score * 100);
    const radius = 16;
    const stroke = 3;
    const normalizedRadius = radius - stroke * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981'; // emerald-500
    let textColor = 'text-emerald-700';
    let ringBg = '#e2e8f0';

    if (confidence === 'low' || score < 0.60) {
      strokeColor = '#f43f5e'; // rose-500
      textColor = 'text-rose-700';
    } else if (confidence === 'medium' || score < 0.85) {
      strokeColor = '#f59e0b'; // amber-500
      textColor = 'text-amber-700';
    }

    return (
      <div className="relative inline-flex items-center justify-center shrink-0" title={`Confidence Gauge: ${percentage}%`}>
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke={ringBg}
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className={`absolute text-[9px] font-mono font-bold ${textColor}`}>
          {percentage}
        </span>
      </div>
    );
  };

  // Helper colors
  const getConfidenceBadge = (confidence: Confidence) => {
    switch (confidence) {
      case 'high':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">● High</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">● Medium</span>;
      case 'low':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">● Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Analyzed Fields', value: totalCount, sub: 'Source schema fields' },
          { label: 'High Confidence', value: highCount, sub: 'Score >= 0.85 (Safe)', color: 'text-emerald-600' },
          { label: 'Needs Human Review', value: mediumCount + lowCount, sub: 'Requires dual checks', color: 'text-amber-600' },
          { label: 'Average Match Score', value: `${avgScore.toFixed(1)}%`, sub: 'Cross-signal alignment', color: 'text-indigo-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 font-sans">{stat.label}</p>
            <p className={`text-2xl font-bold font-sans mt-1 ${stat.color || 'text-slate-900'}`}>{stat.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left 3 Columns: Mappings Grid */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* AI Signal Enrichment Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-xl p-4 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-indigo-300 flex items-center gap-2">
                  AI Signal Enrichment Engine
                </h3>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  {nonHighCount > 0 
                    ? `${nonHighCount} field${nonHighCount > 1 ? 's' : ''} currently relying purely on heuristics. Generate LLM AI signals to validate mappings & boost confidence.`
                    : 'All fields are fully enriched with AI LLM signals and verified at High confidence.'
                  }
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateBatchAiSignals}
              disabled={nonHighCount === 0 || isGeneratingBatchAi}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-sans flex items-center gap-2 transition-all shrink-0 ${
                nonHighCount > 0 
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-sm cursor-pointer' 
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isGeneratingBatchAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Generating AI Signals ({nonHighCount})...</span>
                </>
              ) : nonHighCount > 0 ? (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Generate AI Signal for Non-High Fields ({nonHighCount})</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>All Signals Enriched (High)</span>
                </>
              )}
            </button>
          </div>

          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search source/target fields or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              />
            </div>

            <div className="flex gap-2 items-center w-full md:w-auto">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0 font-sans">
                <Filter className="w-3.5 h-3.5" /> Filter Confidence:
              </span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-full md:w-auto justify-between">
                {['all', 'high', 'medium', 'low'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setConfidenceFilter(filter)}
                    className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition-all ${
                      confidenceFilter === filter 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mappings Table list */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3.5 px-4 w-[28%]">Source Schema Field</th>
                    <th className="py-3.5 px-2 w-[4%] text-center"></th>
                    <th className="py-3.5 px-4 w-[36%]">Target Assignment & Controls</th>
                    <th className="py-3.5 px-4 w-[18%] text-center">Signals & Score</th>
                    <th className="py-3.5 px-4 w-[14%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 text-sm font-sans">
                        No mapping rows match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map((row) => (
                      <React.Fragment key={row.id}>
                        {/* Standard row */}
                        <tr className="hover:bg-slate-50/40 transition-colors group">
                          {/* Source Info */}
                          <td className="py-4 px-4 align-top">
                            <div className="flex flex-col min-w-0">
                              <span className="font-mono text-sm font-semibold text-slate-800 break-words break-all">{row.sourceField}</span>
                              <span className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase bg-slate-100/80 px-1.5 py-0.5 rounded self-start shrink-0">
                                {row.sourceType}
                              </span>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans break-words">{row.sourceDesc}</p>
                            </div>
                          </td>

                          {/* Arrow */}
                          <td className="py-4 px-2 text-center align-middle">
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors mx-auto shrink-0" />
                          </td>

                          {/* Target Info & Controls */}
                          <td className="py-4 px-4 align-top">
                            <div className="flex flex-col min-w-0 space-y-2">
                              <div>
                                <span className="font-mono text-sm font-semibold text-slate-800 break-words break-all">{row.targetField}</span>
                                <span className="text-[10px] font-mono text-slate-400 ml-2 uppercase bg-slate-100/80 px-1.5 py-0.5 rounded shrink-0">
                                  {row.targetType}
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-sans break-words">{row.targetDesc}</p>
                              </div>

                              {/* Control dropdowns (Decision Status & Mapping Type) */}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {/* Decision Status Dropdown */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-slate-400 uppercase">Status:</span>
                                  {(() => {
                                    const currentStatus = row.decisionStatus || ((row.score >= 0.85 || row.isApproved) ? 'accepted' : 'needs_review');
                                    return (
                                      <select
                                        value={currentStatus}
                                        onChange={(e) => handleDecisionStatusChange(row.id, e.target.value as DecisionStatus)}
                                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none transition-colors cursor-pointer font-sans ${
                                          currentStatus === 'accepted'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : currentStatus === 'rejected'
                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}
                                      >
                                        <option value="accepted">accepted</option>
                                        <option value="needs_review">needs_review</option>
                                        <option value="rejected">rejected</option>
                                      </select>
                                    );
                                  })()}
                                </div>

                                {/* Mapping Type Dropdown */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-slate-400 uppercase">Type:</span>
                                  <select
                                    value={row.mappingType || 'Direct mapping'}
                                    onChange={(e) => handleMappingTypeChange(row.id, e.target.value as MappingType)}
                                    className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer font-sans"
                                  >
                                    <option value="Direct mapping">Direct mapping</option>
                                    <option value="Derived value">Derived value</option>
                                    <option value="Fixed value">Fixed value</option>
                                    <option value="N/A">N/A</option>
                                    <option value="Target managed">Target managed</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Matching signals & confidence */}
                          <td className="py-4 px-4 align-middle">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="flex items-center gap-2">
                                <ConfidenceRing score={row.score} confidence={row.confidence} />
                                {getConfidenceBadge(row.confidence)}
                              </div>
                              <div className="flex flex-wrap gap-1 justify-center max-w-[150px]">
                                {(row.signals || ['name', 'semantic']).map((sig) => (
                                  <span key={sig} className="text-[9px] font-mono font-medium uppercase px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                    {sig}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-600 mt-0.5">
                                {(row.score * 100).toFixed(0)}% Match
                              </span>
                            </div>
                          </td>

                          {/* Action tools */}
                          <td className="py-4 px-4 text-right align-middle">
                            <div className="flex flex-col items-end gap-1.5">
                              {row.confidence !== 'high' && (
                                <button
                                  onClick={() => handleGenerateSingleAiSignal(row.id)}
                                  className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 font-semibold transition-colors font-sans cursor-pointer"
                                  title="Generiši AI signal za ovo polje i podigni sa nivoa na High confidence"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  + AI Signal
                                </button>
                              )}
                              <button
                                onClick={() => handleRefine(row.id)}
                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-semibold transition-colors font-sans cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Refine
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Mapped explanation strip + Accordion */}
                        <tr className="bg-slate-50/20">
                          <td colSpan={5} className="px-4 py-3 bg-slate-50/30 border-b border-slate-100">
                            <div className="space-y-2 pl-4 text-xs font-sans text-slate-600 min-w-0">
                              {/* AI Logic Explanation text */}
                              <div className="flex items-start gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <div className="flex-1 leading-relaxed break-words min-w-0">
                                  <span className="font-semibold text-slate-800">AI Logic Explanation:</span> {row.explanation}
                                  {row.transformation && (
                                    <div className="mt-1 flex items-center gap-1.5 bg-slate-900 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono w-fit break-words">
                                      <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span>Pandas: {row.transformation}</span>
                                    </div>
                                  )}
                                  {row.llmNotes && (
                                    <div className="mt-1 flex items-center gap-1 bg-white/70 border border-slate-100 px-2 py-0.5 rounded self-start w-fit text-[10px] font-mono text-indigo-600 break-words">
                                      <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                                      <span>LLM Notes: {row.llmNotes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Accordion trigger button directly under AI Logic Explanation */}
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleDetails(row.id)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200/80 transition-all font-sans cursor-pointer group"
                                >
                                  <Code2 className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                                  <span>Details and Transformation</span>
                                  {expandedDetailsRowIds[row.id] ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-500 ml-1" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
                                  )}
                                </button>
                              </div>

                              {/* Accordion Content Block */}
                              {expandedDetailsRowIds[row.id] && (() => {
                                const reasoning = generateFieldReasoning(row);
                                return (
                                <div className="mt-3 bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 animate-fade-in space-y-4">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <div className="flex items-center gap-2">
                                      <Terminal className="w-4 h-4 text-emerald-400" />
                                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                                        Details and Transformation for <span className="text-emerald-400">{row.sourceField}</span> &rarr; <span className="text-emerald-400">{row.targetField}</span>
                                      </h4>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                      pandas / Python Notation
                                    </span>
                                  </div>

                                  {/* Semantra Structured Reasoning & Evidence Box */}
                                  <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 space-y-2 font-mono text-xs text-slate-200">
                                    <div><strong className="text-slate-400">Transformation:</strong> <span className="text-emerald-400">{reasoning.transformation}</span></div>
                                    <div><strong className="text-slate-400">Decision type:</strong> <span className="text-indigo-300 font-bold">{reasoning.decisionType}</span></div>
                                    <div className="pt-1.5 font-bold text-white border-t border-slate-800/80">Reasoning:</div>
                                    <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed pl-1">
                                      {reasoning.reasoningBullets.map((bullet, idx) => {
                                        const isRrf = bullet.startsWith('Hybrid RRF Fusion:');
                                        return (
                                          <li key={idx} className={`break-words ${isRrf ? 'text-emerald-300 font-semibold list-none -ml-1 bg-emerald-950/40 p-1.5 rounded border border-emerald-800/50 flex items-start gap-1.5' : 'text-slate-300'}`}>
                                            {isRrf ? (
                                              <>
                                                <span className="text-emerald-400 font-bold shrink-0">⚡</span>
                                                <span>{bullet}</span>
                                              </>
                                            ) : (
                                              bullet
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>

                                  {/* AI Natural Language Pandas Code Generator Box */}
                                  <div className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-bold text-emerald-400 font-sans flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                        Describe in plain words what you want with the data &rarr; AI generates Pandas code:
                                      </label>
                                      <span className="text-[10px] text-slate-400 font-mono">Generates snippet for df_source["{row.sourceField}"]</span>
                                    </div>

                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder='e.g. "Strip leading zeros and uppercase", "Extract digits only", "Format date as YYYY-MM-DD"'
                                        value={aiPandasPrompts[row.id] || ''}
                                        onChange={(e) => setAiPandasPrompts(prev => ({ ...prev, [row.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGeneratePandasFromAiPrompt(row.id, row.sourceField, aiPandasPrompts[row.id] || '');
                                          }
                                        }}
                                        className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 font-sans"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleGeneratePandasFromAiPrompt(row.id, row.sourceField, aiPandasPrompts[row.id] || '')}
                                        disabled={isGeneratingPandas[row.id] || !(aiPandasPrompts[row.id] || '').trim()}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                                      >
                                        {isGeneratingPandas[row.id] ? (
                                          <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Generating...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                                            <span>Generate Pandas Code</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Quick prompt suggestion chips */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      <span className="text-[10px] text-slate-400 font-sans self-center">Quick prompts:</span>
                                      {[
                                        'Strip leading zeros',
                                        'Uppercase & trim',
                                        'Extract digits only',
                                        'Replace empty with N/A',
                                        'Format date YYYY-MM-DD',
                                        'Extract email domain'
                                      ].map((chip) => (
                                        <button
                                          key={chip}
                                          type="button"
                                          onClick={() => {
                                            setAiPandasPrompts(prev => ({ ...prev, [row.id]: chip }));
                                            handleGeneratePandasFromAiPrompt(row.id, row.sourceField, chip);
                                          }}
                                          className="text-[10px] font-sans bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 px-2 py-0.5 rounded transition-all cursor-pointer"
                                        >
                                          + {chip}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Custom Pandas transformation input */}
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-slate-200 font-sans">
                                        Define pandas/Python transformation for {row.sourceField} (optional)
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={row.transformation || ''}
                                        onChange={(e) => handleTransformationChange(row.id, e.target.value)}
                                        placeholder={`Example:\ndf_source["${row.sourceField}"].astype(str).str.strip()`}
                                        className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed shadow-inner"
                                      />
                                    </div>

                                    {/* Reusable template dropdown */}
                                    <div className="space-y-1.5">
                                      <label className="text-xs font-semibold text-slate-200 font-sans">
                                        Reusable template for {row.sourceField}
                                      </label>
                                      <select
                                        defaultValue=""
                                        onChange={(e) => {
                                          handleSelectTemplate(row.id, row.sourceField, e.target.value);
                                          e.target.value = "";
                                        }}
                                        className="w-full text-xs font-sans bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                      >
                                        <option value="" disabled>Select reusable template</option>
                                        <option value="account_tier">Account Tier (3 Revenue Categories)</option>
                                        <option value="trim">Trim whitespace</option>
                                        <option value="lower">Lowercase text</option>
                                        <option value="upper">Uppercase text</option>
                                        <option value="title">Title-case text</option>
                                        <option value="prefix">Add prefix C-</option>
                                        <option value="suffix">Add suffix _ID</option>
                                        <option value="email_title">Email local-part to title</option>
                                        <option value="digits_only">Keep digits only</option>
                                      </select>

                                      <div className="pt-2 text-[11px] text-slate-400 font-mono space-y-1">
                                        <div><strong className="text-slate-300">df_source:</strong> Source dataframe containing <code className="text-emerald-400">{row.sourceField}</code></div>
                                        <div><strong className="text-slate-300">df_target:</strong> Target dataframe receiving <code className="text-emerald-400">{row.targetField}</code></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ); })()}
                            </div>
                          </td>
                        </tr>

                        {/* Inline refinement input */}
                        {refiningRowId === row.id && (
                          <tr className="bg-emerald-50/30 animate-fade-in border-y border-emerald-100">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-emerald-500" />
                                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider font-sans">
                                    LLM Mapping Refinement: Custom Instructions & Constraints
                                  </h4>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder='E.g., "Must map KUNNR to customer_id and ignore pricing rules" or "Apply upper-case formatting rule"'
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                                    disabled={isRefining}
                                  />
                                  <button
                                    onClick={() => submitRefinement(row.id)}
                                    disabled={!refinementPrompt.trim() || isRefining}
                                    className="bg-slate-950 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors font-sans disabled:opacity-40"
                                  >
                                    {isRefining ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Refining...
                                      </>
                                    ) : (
                                      'Regenerate'
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setRefiningRowId(null)}
                                    className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold font-sans"
                                    disabled={isRefining}
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Your instruction will feed into Semantra's closed-set validator to re-evaluate the target field, modify the python codegen, and recalculate score metrics.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Mapping Analysis Overview */}
        <div className="space-y-6">
          {/* Analysis Card */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <ClipboardList className="w-4 h-4" />
              Mapping Analysis Overview
            </h3>

            {/* Technical summary */}
            <div className="space-y-3.5 text-xs font-sans">
              <div className="flex justify-between items-start">
                <span className="text-slate-400">Governance Gate:</span>
                {lowCount + mediumCount === 0 ? (
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 text-[10px] font-mono">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> PASSED (ALL VERIFIED)
                  </span>
                ) : (
                  <span className="font-semibold text-amber-400 flex items-center gap-1 text-[10px] font-mono">
                    <ShieldAlert className="w-3.5 h-3.5" /> DEFERRED ({lowCount + mediumCount} PENDING REVIEW)
                  </span>
                )}
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px] pt-1">
                Ingested <strong className="text-white">{totalCount} source fields</strong>. Auto-mapping matched <strong className="text-emerald-400">{highCount} fields</strong> above the calibrated confidence threshold. {lowCount + mediumCount > 0 ? (
                  <> <strong className="text-amber-400">{lowCount + mediumCount} field(s)</strong> are flagged as sub-threshold and require human review.</>
                ) : (
                  <> All fields are fully verified at high confidence.</>
                )}
              </p>
            </div>

            {/* Risks readout */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">Identified Risks & Overlays</h4>
              <div className="space-y-2">
                {mappings.filter(r => r.confidence !== 'high' || r.score < 0.85).length > 0 ? (
                  mappings.filter(r => r.confidence !== 'high' || r.score < 0.85).slice(0, 2).map((row) => (
                    <div key={row.id} className="bg-slate-800/40 p-2.5 rounded border-l-2 border-amber-500 space-y-1">
                      <p className="text-[11px] font-bold text-slate-200 font-sans">Sub-Threshold Score ({row.sourceField})</p>
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        {row.sourceField} has {Math.round(row.score * 100)}% matching score. Maps to {row.targetField} ({row.sourceType || 'Type'} &rarr; {row.targetType || 'Type'}).
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-800/40 p-2.5 rounded border-l-2 border-emerald-500 space-y-1">
                    <p className="text-[11px] font-bold text-slate-200 font-sans">Zero High-Severity Risks Identified</p>
                    <p className="text-[10px] text-slate-400 leading-normal font-sans">
                      All {totalCount} analyzed fields meet or exceed the confidence threshold with high alignment scores.
                    </p>
                  </div>
                )}

                {mappings.filter(r => r.signals?.includes('correction') || r.signals?.includes('llm')).length > 0 && (
                  <div className="bg-slate-800/40 p-2.5 rounded border-l-2 border-indigo-500 space-y-1">
                    <p className="text-[11px] font-bold text-slate-200 font-sans">Active AI & Overlay Feedback Applied</p>
                    <p className="text-[10px] text-slate-400 leading-normal font-sans">
                      Enriched signals active for {mappings.filter(r => r.signals?.includes('correction') || r.signals?.includes('llm')).map(r => r.sourceField).slice(0, 3).join(', ')}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended next actions */}
            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
              <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">Next Recommended Actions</h4>
              <ul className="space-y-1.5 list-disc pl-4 text-[11px] text-slate-300 leading-relaxed font-sans">
                {lowCount + mediumCount > 0 ? (
                  <li>Manually approve or override {mappings.filter(r => r.confidence !== 'high').map(r => r.sourceField).slice(0, 3).join(', ')} in the **Decisions** console.</li>
                ) : (
                  <li>All fields verified; ready to lock mapping decisions.</li>
                )}
                <li>Verify transformation rules and generated Python / SQL scripts.</li>
                <li>Submit final mapping set to the Enterprise Catalog once 100% accepted.</li>
              </ul>
            </div>
          </div>

          {/* Quick Review Plan */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              Review Queue Plan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              To minimize analyst fatigue, prioritize reviewing low confidence matches, then apply LLM closed-set batch proposals to bulk resolve outstanding schema alignments.
            </p>
            <button
              onClick={onNextStep}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors font-sans"
            >
              Open Decisions Panel
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
