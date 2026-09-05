import React, { useState } from 'react';
import { X, Plus, Layers, Check, AlertCircle, Search } from 'lucide-react';
import { CanonicalConcept, OverlayRule } from '../types';

interface AddOverlayRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  overlayFiles: { file: string; title: string }[];
  defaultOverlayFile: string;
  canonicalConcepts: CanonicalConcept[];
  onAddRule: (targetFile: string, rule: OverlayRule) => void;
}

export const AddOverlayRuleModal: React.FC<AddOverlayRuleModalProps> = ({
  isOpen,
  onClose,
  overlayFiles,
  defaultOverlayFile,
  canonicalConcepts,
  onAddRule
}) => {
  const [selectedFile, setSelectedFile] = useState(defaultOverlayFile || overlayFiles[0]?.file || 'custom_overlay.csv');
  const [isNewFile, setIsNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  
  const [sourceSystem, setSourceSystem] = useState('OneStream');
  const [sourceField, setSourceField] = useState('');
  const [targetConceptId, setTargetConceptId] = useState('');
  const [overrideType, setOverrideType] = useState<'alias_promotion' | 'domain_override' | 'pii_tag' | 'type_mapping'>('alias_promotion');
  const [steward, setSteward] = useState('Slaviša M. (Lead Steward)');
  const [notes, setNotes] = useState('');
  const [searchConcept, setSearchConcept] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredConcepts = canonicalConcepts.filter(c => 
    !searchConcept || 
    c.concept_id.toLowerCase().includes(searchConcept.toLowerCase()) ||
    c.display_name.toLowerCase().includes(searchConcept.toLowerCase())
  ).slice(0, 30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const effectiveFile = isNewFile ? (newFileName.endsWith('.csv') ? newFileName : `${newFileName}.csv`) : selectedFile;

    if (!effectiveFile.trim()) {
      setFormError('Target overlay file is required.');
      return;
    }

    if (!sourceField.trim()) {
      setFormError('Source Field / Column name is required.');
      return;
    }

    if (!targetConceptId.trim()) {
      setFormError('Target Canonical Concept must be selected.');
      return;
    }

    const newRule: OverlayRule = {
      id: `ov_rule_${Date.now()}`,
      source_system: sourceSystem.trim(),
      source_field: sourceField.trim(),
      target_canonical_concept: targetConceptId.trim(),
      override_type: overrideType,
      steward: steward.trim() || 'Steward',
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      notes: notes.trim() || `Overlay rule linking ${sourceSystem} field ${sourceField} to ${targetConceptId}`
    };

    onAddRule(effectiveFile.trim(), newRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Add Overlay Rule
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-sans">
                  Reversible Runtime Override
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Create a non-destructive mapping rule or system alias without modifying base canonical definitions.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Target Overlay File */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono text-slate-400">
                Target Overlay File <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNewFile(!isNewFile)}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300"
              >
                {isNewFile ? 'Select Existing File' : '+ Create New Overlay File'}
              </button>
            </div>

            {isNewFile ? (
              <input
                type="text"
                required
                placeholder="e.g. onestream_finance_overlay.csv"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/40 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              />
            ) : (
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              >
                {overlayFiles.map(f => (
                  <option key={f.file} value={f.file}>
                    {f.file} ({f.title})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Source System and Source Field */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Source System <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. OneStream, SAP ECC SD, Workday"
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Source Field / Column <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UD1_CostCenter, KUNNR, TxnID"
                value={sourceField}
                onChange={(e) => setSourceField(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Target Canonical Concept Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-mono text-slate-400">
              Target Canonical Concept <span className="text-rose-400">*</span>
            </label>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter canonical concepts (e.g. cost_center, account, customer)..."
                value={searchConcept}
                onChange={(e) => setSearchConcept(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs font-mono focus:outline-none focus:border-emerald-500 mb-1"
              />
            </div>

            <select
              value={targetConceptId}
              onChange={(e) => setTargetConceptId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none max-h-32"
              size={4}
            >
              <option value="" disabled>-- Select Canonical Concept --</option>
              {filteredConcepts.map(c => (
                <option key={c.concept_id} value={c.concept_id}>
                  {c.concept_id} — {c.display_name} ({c.business_domains || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Override Type & Steward */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Override Type</label>
              <select
                value={overrideType}
                onChange={(e) => setOverrideType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              >
                <option value="alias_promotion">alias_promotion (Lexical boost)</option>
                <option value="domain_override">domain_override (Specific context)</option>
                <option value="pii_tag">pii_tag (Compliance override)</option>
                <option value="type_mapping">type_mapping (Data coercion rule)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Steward Name</label>
              <input
                type="text"
                value={steward}
                onChange={(e) => setSteward(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Notes / Rationale</label>
            <input
              type="text"
              placeholder="e.g. OneStream ERP integration dimension mapping rule"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg font-mono text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sourceField.trim() || !targetConceptId.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Overlay Rule</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
