import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Plus, CheckCircle2, ShieldCheck, Tag, Building2, Link2 } from 'lucide-react';
import { KnowledgeConcept, CanonicalConcept } from '../types';

interface AddKnowledgeConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (concept: KnowledgeConcept) => void;
  existingKnowledge: KnowledgeConcept[];
  canonicalConcepts: CanonicalConcept[];
}

const DOMAIN_OPTIONS = [
  'Proizvod/Materijal',
  'Ljudski Resursi',
  'Customer Master',
  'Supplier Master',
  'Finance & General Ledger',
  'Supply Chain & Logistics',
  'Compliance & Legal',
  'Operations'
];

const SOURCE_OPTIONS = [
  'derived_runtime',
  'base',
  'expert_curated',
  'client_extension',
  'overlay_only'
];

export const AddKnowledgeConceptModal: React.FC<AddKnowledgeConceptModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingKnowledge,
  canonicalConcepts
}) => {
  const [conceptId, setConceptId] = useState('');
  const [canonicalName, setCanonicalName] = useState('');
  const [domain, setDomain] = useState('Proizvod/Materijal');
  const [customDomain, setCustomDomain] = useState('');
  const [source, setSource] = useState('derived_runtime');
  const [editable, setEditable] = useState<'yes' | 'no'>('yes');
  const [linkedPii, setLinkedPii] = useState<'yes' | 'no'>('no');
  const [linkedGdprSpecial, setLinkedGdprSpecial] = useState<'yes' | 'no'>('no');
  const [linkedPiiTags, setLinkedPiiTags] = useState('');
  const [linkedDataSubjects, setLinkedDataSubjects] = useState('');
  const [sourceSystems, setSourceSystems] = useState('SAP ECC, Workday');
  const [selectedCanonicalConcepts, setSelectedCanonicalConcepts] = useState<string[]>([]);
  const [searchCanonical, setSearchCanonical] = useState('');
  
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  // Collision check
  const isDuplicate = existingKnowledge.some(
    k => k.concept_id.trim().toLowerCase() === conceptId.trim().toLowerCase()
  );

  const handleCanonicalToggle = (cid: string) => {
    setSelectedCanonicalConcepts(prev => 
      prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const cleanId = conceptId.trim();
    const cleanName = canonicalName.trim();

    if (!cleanId) {
      setErrorBanner('Concept ID is required.');
      return;
    }
    if (!cleanName) {
      setErrorBanner('Canonical / Display Name is required.');
      return;
    }
    if (isDuplicate) {
      setErrorBanner(`A knowledge concept with ID "${cleanId}" already exists.`);
      return;
    }

    const finalDomain = domain === 'Custom...' ? (customDomain.trim() || 'General') : domain;

    const newConcept: KnowledgeConcept = {
      id: `know_${Date.now()}`,
      concept_id: cleanId,
      canonical_name: cleanName,
      domain: finalDomain,
      source,
      editable,
      linked_pii: linkedPii,
      linked_gdpr_special: linkedGdprSpecial,
      linked_pii_tags: linkedPiiTags.trim(),
      linked_data_subjects: linkedDataSubjects.trim(),
      alias_count: 0,
      field_context_count: selectedCanonicalConcepts.length > 0 ? 1 : 0,
      linked_canonical_concept_count: selectedCanonicalConcepts.length,
      source_systems: sourceSystems.trim(),
      linked_canonical_concepts: selectedCanonicalConcepts.join(', ')
    };

    onAdd(newConcept);
    onClose();
  };

  const filteredCanonicalOptions = canonicalConcepts
    .filter(c => {
      const q = searchCanonical.toLowerCase();
      return !q || c.concept_id.toLowerCase().includes(q) || (c.display_name && c.display_name.toLowerCase().includes(q));
    })
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                New Knowledge Concept
                <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-sans">
                  Registry Authoring
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Author enterprise knowledge concepts, connect source systems, and link canonical targets.
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorBanner && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                Concept ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={conceptId}
                onChange={(e) => setConceptId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="e.g. hr.tax_withholding_code"
                className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-slate-200 text-xs font-mono focus:outline-none ${
                  isDuplicate 
                    ? 'border-rose-500 focus:border-rose-400' 
                    : 'border-slate-800 focus:border-purple-500'
                }`}
                required
              />
              {isDuplicate && (
                <p className="text-[10px] text-rose-400 font-mono mt-1">
                  Concept ID already exists in Knowledge Registry!
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                Canonical / Display Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={canonicalName}
                onChange={(e) => setCanonicalName(e.target.value)}
                placeholder="e.g. Tax Withholding Code"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Domain & Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Business Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
              >
                {DOMAIN_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="Custom...">Custom domain...</option>
              </select>
              {domain === 'Custom...' && (
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="Enter domain name"
                  className="w-full mt-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Registry Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
              >
                {SOURCE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Editable in UI</label>
              <select
                value={editable}
                onChange={(e) => setEditable(e.target.value as 'yes' | 'no')}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value="yes">yes (steward editable)</option>
                <option value="no">no (locked base)</option>
              </select>
            </div>
          </div>

          {/* Source Systems */}
          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Source Systems (comma separated)</span>
            </label>
            <input
              type="text"
              value={sourceSystems}
              onChange={(e) => setSourceSystems(e.target.value)}
              placeholder="e.g. SAP ECC, Workday HR, Salesforce CRM, QuickBooks"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
            />
          </div>

          {/* Privacy & Governance (PII / GDPR) */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Privacy & Compliance Governance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                <input
                  type="checkbox"
                  checked={linkedPii === 'yes'}
                  onChange={(e) => setLinkedPii(e.target.checked ? 'yes' : 'no')}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                />
                <span>Linked PII (Personally Identifiable)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                <input
                  type="checkbox"
                  checked={linkedGdprSpecial === 'yes'}
                  onChange={(e) => setLinkedGdprSpecial(e.target.checked ? 'yes' : 'no')}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4"
                />
                <span>Linked GDPR Special Category</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Linked PII Tags</label>
                <input
                  type="text"
                  value={linkedPiiTags}
                  onChange={(e) => setLinkedPiiTags(e.target.value)}
                  placeholder="e.g. ssn, tax_id, compensation"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Linked Data Subjects</label>
                <input
                  type="text"
                  value={linkedDataSubjects}
                  onChange={(e) => setLinkedDataSubjects(e.target.value)}
                  placeholder="e.g. Employee, Candidate, Vendor"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Linked Canonical Concepts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Linked Canonical Concepts ({selectedCanonicalConcepts.length} linked)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Select matching canonical entries</span>
            </div>

            <input
              type="text"
              placeholder="Search canonical catalog concepts..."
              value={searchCanonical}
              onChange={(e) => setSearchCanonical(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500"
            />

            {/* Selected badges */}
            {selectedCanonicalConcepts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/60 border border-slate-800 rounded-lg max-h-24 overflow-y-auto">
                {selectedCanonicalConcepts.map(cid => (
                  <span 
                    key={cid}
                    className="px-2 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 rounded font-mono text-[10px] flex items-center gap-1"
                  >
                    <span>{cid}</span>
                    <button
                      type="button"
                      onClick={() => handleCanonicalToggle(cid)}
                      className="text-purple-400 hover:text-white"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggestions list */}
            <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-1 border border-slate-800 rounded-lg bg-slate-950">
              {filteredCanonicalOptions.map(c => {
                const isSelected = selectedCanonicalConcepts.includes(c.concept_id);
                return (
                  <button
                    key={c.concept_id}
                    type="button"
                    onClick={() => handleCanonicalToggle(c.concept_id)}
                    className={`p-1.5 text-left rounded font-mono text-[11px] truncate flex items-center justify-between transition-colors ${
                      isSelected 
                        ? 'bg-purple-900/40 border border-purple-500/50 text-purple-300' 
                        : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{c.concept_id}</span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 shrink-0 text-purple-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-800 -mx-6 -mb-6 flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDuplicate || !conceptId.trim() || !canonicalName.trim()}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-950 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Add Knowledge Concept</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
