import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  HelpCircle, 
  Database, 
  AlertTriangle, 
  Layers,
  Settings,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { MappingRow, DecisionProposal, Confidence } from '../types';

interface WorkspaceDecisionsProps {
  mappings: MappingRow[];
  setMappings: React.Dispatch<React.SetStateAction<MappingRow[]>>;
  proposals: DecisionProposal[];
  setProposals: React.Dispatch<React.SetStateAction<DecisionProposal[]>>;
  onNextStep: () => void;
  targetFields: { field: string; type: string; desc: string }[];
}

export const WorkspaceDecisions: React.FC<WorkspaceDecisionsProps> = ({
  mappings,
  setMappings,
  proposals,
  setProposals,
  onNextStep,
  targetFields
}) => {
  // Initialize acceptedRows state directly from mapping rows where isApproved is true
  const [acceptedRows, setAcceptedRows] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    mappings.forEach(r => {
      if (r.isApproved) {
        initial[r.id] = true;
      }
    });
    return initial;
  });

  // Keep acceptedRows synchronized with mappings prop (for persistence when switching tabs or loading saved mappings)
  React.useEffect(() => {
    const syncAccepted: Record<string, boolean> = {};
    mappings.forEach(r => {
      if (r.isApproved) {
        syncAccepted[r.id] = true;
      }
    });
    setAcceptedRows(syncAccepted);

    // Synchronize decision proposals with active mappings if proposals contain stale or mismatched fields
    if (mappings.length > 0) {
      const activeSourceFields = new Set(mappings.map(m => m.sourceField));
      const hasMatchingProposal = proposals.some(p => activeSourceFields.has(p.sourceField));
      if (!hasMatchingProposal) {
        const subThresholdRows = mappings.filter(r => r.score < 0.85 || r.confidence !== 'high');
        const highConfidenceRows = mappings.filter(r => r.score >= 0.85 && r.confidence === 'high');
        const selectedRows = [...subThresholdRows, ...highConfidenceRows].slice(0, 4);

        const newProposals: DecisionProposal[] = selectedRows.map((row, index) => {
          const isSubThreshold = row.score < 0.85 || row.confidence !== 'high';
          const isSafe = !isSubThreshold;
          let reason = '';
          if (isSubThreshold) {
            reason = `Sub-threshold mapping proposal. Applying this maps ${row.sourceField} directly to ${row.targetField} but carries moderate type drift or confidence warnings (${Math.round(row.score * 100)}% score).`;
          } else if (row.signals?.includes('knowledge') || row.signals?.includes('canonical')) {
            reason = `Centralized domain knowledge maps technical field ${row.sourceField} directly to ${row.targetField} with active metadata validation.`;
          } else {
            reason = `Semantic analysis confirms ${row.sourceField} aligns with ${row.targetField} based on historical catalog reuse fit.`;
          }
          return {
            id: `prop_${row.id}_${index}_${Date.now()}`,
            sourceField: row.sourceField,
            suggestedTargetField: row.targetField || 'UNMAPPED',
            confidence: row.confidence,
            reason,
            isSafe,
            status: 'pending' as const
          };
        });
        setProposals(newProposals);
      }
    }
  }, [mappings]);

  // Dynamically build available target fields from targetFields + all active target assignments in mappings
  const allAvailableTargetFields: { field: string; type: string; desc: string }[] = [...targetFields];
  mappings.forEach(row => {
    if (
      row.targetField &&
      row.targetField !== 'UNMAPPED' &&
      !allAvailableTargetFields.some(tf => tf.field === row.targetField)
    ) {
      allAvailableTargetFields.push({
        field: row.targetField,
        type: row.targetType || 'VARCHAR',
        desc: row.targetDesc || 'Target concept'
      });
    }
  });

  // Toggle accepted status of mapping decision
  const handleToggleAccept = (id: string) => {
    const isCurrentlyAccepted = !!acceptedRows[id];
    const nextAccepted = !isCurrentlyAccepted;
    
    setAcceptedRows(prev => ({ ...prev, [id]: nextAccepted }));
    
    // Update the mapping's score, confidence AND isApproved flag
    setMappings(rows => rows.map(r => {
      if (r.id === id) {
        return {
          ...r,
          isApproved: nextAccepted,
          score: nextAccepted ? 1.0 : r.score,
          confidence: nextAccepted ? 'high' : r.confidence
        };
      }
      return r;
    }));
  };

  // Bulk approve all mappings in one click
  const handleApproveAll = () => {
    const newAccepted: Record<string, boolean> = {};
    mappings.forEach(r => {
      newAccepted[r.id] = true;
    });
    setAcceptedRows(newAccepted);
    setMappings(rows => rows.map(r => ({
      ...r,
      isApproved: true,
      score: 1.0,
      confidence: 'high'
    })));
  };

  // Change transformation expression manually
  const handleTransformationChange = (rowId: string, customTransformation: string) => {
    setMappings(rows => rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          transformation: customTransformation,
          signals: Array.from(new Set([...r.signals, 'correction'] as const))
        };
      }
      return r;
    }));
  };

  // Adjust target selection manually
  const handleManualTargetChange = (rowId: string, newTargetField: string) => {
    const selectedFieldObj = allAvailableTargetFields.find(t => t.field === newTargetField);
    
    setMappings(rows => rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          targetField: newTargetField,
          targetDesc: selectedFieldObj?.desc || row.targetDesc,
          targetType: selectedFieldObj?.type || row.targetType,
          confidence: 'high',
          score: 1.0, // Manual adjustments are considered 100% gold mapping
          isApproved: true,
          signals: Array.from(new Set([...row.signals, 'correction'] as const))
        };
      }
      return row;
    }));

    // Auto mark as accepted when manually adjusted
    setAcceptedRows(prev => ({ ...prev, [rowId]: true }));
  };

  // Toggle Virtual target setting
  const handleToggleVirtual = (rowId: string) => {
    setMappings(rows => rows.map(row => {
      if (row.id === rowId) {
        const isVirtual = !row.isVirtual;
        return {
          ...row,
          isVirtual,
          targetField: isVirtual ? 'VIRTUAL_CONCEPT_OVERLAY' : 'customer_id',
          targetDesc: isVirtual ? 'Advisory virtual semantic layout' : 'Canonical customer identifier',
          targetType: isVirtual ? 'VIRTUAL' : 'VARCHAR(20)'
        };
      }
      return row;
    }));
  };

  // Apply LLM Proposal
  const handleApplyProposal = (proposalId: string, sourceField: string, targetField: string, isSafe: boolean) => {
    // 1. Update the proposal status
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'applied' as const } : p));

    // 2. Apply target change to mapping rows
    const selectedFieldObj = allAvailableTargetFields.find(t => t.field === targetField);
    setMappings(rows => rows.map(row => {
      if (row.sourceField === sourceField) {
        return {
          ...row,
          targetField,
          targetDesc: selectedFieldObj?.desc || row.targetDesc,
          targetType: selectedFieldObj?.type || row.targetType,
          confidence: 'high',
          score: isSafe ? 0.98 : 0.85,
          isApproved: true,
          signals: Array.from(new Set([...row.signals, 'llm'] as const)),
          explanation: `Applied intelligent AI Decision Proposal. Target schema aligned directly to ${targetField}.`
        };
      }
      return row;
    }));

    // Mark as accepted
    const rowToAccept = mappings.find(r => r.sourceField === sourceField);
    if (rowToAccept) {
      setAcceptedRows(prev => ({ ...prev, [rowToAccept.id]: true }));
    }
  };

  // Dismiss proposal
  const handleDismissProposal = (proposalId: string) => {
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'dismissed' as const } : p));
  };

  // Verification readiness indicators
  const unacceptedCount = mappings.length - Object.values(acceptedRows).filter(Boolean).length;
  const isReadyForOutput = unacceptedCount === 0;

  return (
    <div className="space-y-6">
      {/* Upper banner: Ready for Output Gating */}
      <div className={`border rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${
        isReadyForOutput 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50/50 border-amber-200/80 text-amber-900'
      }`}>
        <div className="flex items-start gap-3">
          {isReadyForOutput ? (
            <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h2 className="text-base font-sans font-semibold tracking-tight leading-snug">
              {isReadyForOutput 
                ? 'Governance Clearance Achieved!' 
                : 'Workspace Decisions Gating Active'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              {isReadyForOutput 
                ? 'All mapping rows have been successfully accepted and validated. Downstream code generation lanes (Pandas, PySpark, dbt) and transformation test assertions are fully unlocked.'
                : `You have ${unacceptedCount} outstanding mappings awaiting analyst verification. Accept and lock each row below to satisfy Semantra's code generation governance gateways.`}
            </p>
          </div>
        </div>

        {isReadyForOutput ? (
          <button
            onClick={onNextStep}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 transition-colors font-sans"
          >
            Generate Code Output
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 bg-amber-100/80 text-amber-800 text-xs font-mono font-semibold rounded-lg">
              {unacceptedCount} Pending
            </span>
            <button
              onClick={handleApproveAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors font-sans cursor-pointer"
              title="Approve and lock all remaining mapping rows at once"
            >
              <Check className="w-4 h-4" />
              <span>Approve All ({unacceptedCount})</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left 3 Columns: Decisions Console */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                Active Decisions Adjustment Matrix
              </h3>

              {unacceptedCount > 0 && (
                <button
                  onClick={handleApproveAll}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors font-sans"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve All Rows</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">Source Schema Field</th>
                    <th className="py-3 px-4">Target Assignment</th>
                    <th className="py-3 px-4">Transformation Rule</th>
                    <th className="py-3 px-4 text-center">Allocation</th>
                    <th className="py-3 px-4 text-center">Status Trace</th>
                    <th className="py-3 px-4 text-right">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappings.map((row) => {
                    const isAccepted = acceptedRows[row.id] || false;
                    return (
                      <tr 
                        key={row.id} 
                        className={`transition-colors ${
                          isAccepted 
                            ? 'bg-emerald-50/10 hover:bg-emerald-50/20' 
                            : 'hover:bg-slate-50/40'
                        }`}
                      >
                        {/* Source Field */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-semibold text-slate-800">{row.sourceField}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.sourceType}</span>
                          </div>
                        </td>

                        {/* Dropdown selector */}
                        <td className="py-4 px-4">
                          <select
                            value={row.targetField || 'UNMAPPED'}
                            onChange={(e) => handleManualTargetChange(row.id, e.target.value)}
                            disabled={row.isVirtual}
                            className="w-full max-w-xs text-xs font-mono border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          >
                            <option value="UNMAPPED" className="text-rose-500 font-semibold">[ UNMAPPED / IGNORE FIELD ]</option>
                            {allAvailableTargetFields.map((tf) => (
                              <option key={tf.field} value={tf.field}>
                                {tf.field} ({tf.type})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Transformation Rule editable input & presets */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={row.transformation || ''}
                              placeholder="Direct Mapping (1:1)"
                              onChange={(e) => handleTransformationChange(row.id, e.target.value)}
                              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 hover:bg-white text-slate-700 placeholder-slate-400"
                            />
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleTransformationChange(row.id, 'UPPER(TRIM(x))')}
                                className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                                title="Apply UPPER(TRIM) rule"
                              >
                                UPPER
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTransformationChange(row.id, 'LPAD(x, 10, "0")')}
                                className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                                title="Apply Zero Padding rule"
                              >
                                LPAD(10)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTransformationChange(row.id, 'TO_DATE(x, "YYYY-MM-DD")')}
                                className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                                title="Apply Date Formatting rule"
                              >
                                DATE
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTransformationChange(row.id, 'CAST(x AS NUMERIC)')}
                                className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                                title="Apply Numeric Cast rule"
                              >
                                CAST
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Virtual overlay target option */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleVirtual(row.id)}
                            className={`p-1.5 rounded border text-xs font-semibold transition-all ${
                              row.isVirtual
                                ? 'bg-teal-50 border-teal-200 text-teal-700'
                                : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {row.isVirtual ? 'Virtual Concept' : 'Physical Column'}
                          </button>
                        </td>

                        {/* Trace origin */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                            row.signals.includes('llm')
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : row.signals.includes('correction')
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {row.signals.includes('llm')
                              ? 'LLM Proposal'
                              : row.signals.includes('correction')
                              ? 'Manual override'
                              : 'Heuristic alignment'}
                          </span>
                        </td>

                        {/* Approve lock toggling */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleToggleAccept(row.id)}
                            className={`p-2 rounded-full border transition-all ${
                              isAccepted
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                                : 'bg-white hover:bg-slate-50 text-slate-300 border-slate-200 hover:text-slate-400'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: LLM Decision Proposals */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              LLM Decision Proposals
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal font-sans">
              Semantra extracted these automated recommendations from the active review queues. Accept or dismiss them directly to update the workspace.
            </p>

            <div className="space-y-3.5 pt-1">
              {proposals.filter(p => p.status === 'pending').length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg text-slate-400 text-xs">
                  All proposals applied or dismissed.
                </div>
              ) : (
                proposals
                  .filter((p) => p.status === 'pending')
                  .map((proposal) => (
                    <div key={proposal.id} className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-slate-50/40 relative">
                      {/* Subtitle */}
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {proposal.sourceField} → {proposal.suggestedTargetField}
                        </span>
                        {proposal.isSafe && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-50 border border-emerald-100 text-[9px] font-mono text-emerald-700 font-semibold rounded uppercase">
                            <Zap className="w-2.5 h-2.5" /> Safe
                          </span>
                        )}
                      </div>

                      {/* Detail justification */}
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">
                        {proposal.reason}
                      </p>

                      {/* Proposal Action strip */}
                      <div className="flex gap-1.5 pt-1 border-t border-slate-100/80 justify-end">
                        <button
                          onClick={() => handleDismissProposal(proposal.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent transition-colors"
                          title="Dismiss Proposal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {proposal.isSafe && (
                          <button
                            onClick={() => handleApplyProposal(proposal.id, proposal.sourceField, proposal.suggestedTargetField, true)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-semibold rounded transition-colors font-sans"
                          >
                            Apply safe
                          </button>
                        )}
                        <button
                          onClick={() => handleApplyProposal(proposal.id, proposal.sourceField, proposal.suggestedTargetField, false)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold rounded transition-colors font-sans"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
