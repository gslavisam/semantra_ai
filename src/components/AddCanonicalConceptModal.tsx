import React, { useState } from 'react';
import { X, Plus, ShieldAlert, Sparkles, Check, AlertCircle } from 'lucide-react';
import { CanonicalConcept } from '../types';

interface AddCanonicalConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (concept: CanonicalConcept) => void;
  existingConcepts: CanonicalConcept[];
}

const COMMON_ENTITIES = [
  'financial', 'account', 'cost_center', 'profit_center', 'general_ledger',
  'customer', 'vendor', 'supplier', 'employee', 'worker', 'payroll',
  'material', 'product', 'inventory', 'purchase_order', 'sales_order',
  'invoice', 'payment', 'asset', 'job', 'organization'
];

const DATA_TYPES = ['string', 'decimal', 'integer', 'date', 'timestamp', 'boolean', 'object'];

const BUSINESS_DOMAINS = [
  'Financials / Controlling',
  'Master Data / Cross-Domain',
  'Human Capital Management',
  'Procurement / MM',
  'Sales & Distribution',
  'Supply Chain & Inventory',
  'Operations & Service'
];

export const AddCanonicalConceptModal: React.FC<AddCanonicalConceptModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingConcepts
}) => {
  const [entity, setEntity] = useState('');
  const [attribute, setAttribute] = useState('');
  const [conceptIdOverride, setConceptIdOverride] = useState('');
  const [isManualConceptId, setIsManualConceptId] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState('string');
  const [businessDomain, setBusinessDomain] = useState('Financials / Controlling');
  const [sourceSystems, setSourceSystems] = useState('OneStream, SAP S/4HANA');
  const [aliases, setAliases] = useState('');
  const [isPII, setIsPII] = useState(false);
  const [isGDPR, setIsGDPR] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Derive concept_id from entity.attribute if not manually modified
  const computedConceptId = isManualConceptId 
    ? conceptIdOverride 
    : (entity && attribute ? `${entity.trim().toLowerCase()}.${attribute.trim().toLowerCase()}` : '');

  const idCollision = existingConcepts.some(
    c => c.concept_id.toLowerCase() === computedConceptId.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!entity.trim() || !attribute.trim()) {
      setFormError('Both Entity and Attribute are required to establish a canonical coordinate.');
      return;
    }

    if (!computedConceptId.trim()) {
      setFormError('Valid Concept ID is required.');
      return;
    }

    if (idCollision) {
      setFormError(`Concept ID "${computedConceptId}" already exists in the Canonical Catalog.`);
      return;
    }

    const newConcept: CanonicalConcept = {
      id: computedConceptId,
      concept_id: computedConceptId,
      name: displayName.trim() || `${entity.trim()} ${attribute.trim()}`,
      display_name: displayName.trim() || `${entity.trim()} ${attribute.trim()}`,
      entity: entity.trim().toLowerCase(),
      attribute: attribute.trim().toLowerCase(),
      description: description.trim() || `Canonical representation for ${entity.trim()} ${attribute.trim()}`,
      data_type: dataType,
      source: 'steward_authoring',
      usage_count: 0,
      field_context_count: 0,
      active_overlay_entry_count: 0,
      business_domains: businessDomain,
      source_systems: sourceSystems.trim(),
      base_aliases: aliases.trim(),
      isPII: isPII,
      isGDPR: isGDPR,
      hasContext: false,
      hasOverlay: false
    };

    onAdd(newConcept);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                New Canonical Concept
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-sans">
                  Steward Authoring
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Define a vendor-agnostic canonical coordinate (<code className="text-emerald-300 font-mono">entity.attribute</code>) in the enterprise catalog.
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Coordinate Identification (Entity & Attribute) */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4">
            <h4 className="font-mono font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Canonical Coordinate Definition
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Entity <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. financial, customer, cost_center"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                  list="entity-suggestions"
                />
                <datalist id="entity-suggestions">
                  {COMMON_ENTITIES.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <span className="text-[10px] text-slate-500 mt-1 block">Domain entity or business object</span>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Attribute <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. id, balance, code, currency"
                  value={attribute}
                  onChange={(e) => setAttribute(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Specific attribute on the entity</span>
              </div>
            </div>

            {/* Generated Concept ID Preview */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">Target Concept ID:</span>
                <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs border ${
                  idCollision
                    ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                    : computedConceptId 
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}>
                  {computedConceptId || 'entity.attribute'}
                </span>
                {idCollision && (
                  <span className="text-[11px] text-rose-400 font-mono">⚠️ Concept ID Collision</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isManualConceptId) {
                    setConceptIdOverride(computedConceptId);
                  }
                  setIsManualConceptId(!isManualConceptId);
                }}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline"
              >
                {isManualConceptId ? 'Use Auto-Generated ID' : 'Customize ID Manually'}
              </button>
            </div>

            {isManualConceptId && (
              <div className="pt-1">
                <input
                  type="text"
                  value={conceptIdOverride}
                  onChange={(e) => setConceptIdOverride(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-indigo-500/40 rounded text-slate-200 text-xs font-mono focus:outline-none"
                  placeholder="Custom concept_id override"
                />
              </div>
            )}
          </div>

          {/* Descriptive Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Cost Center Identifier"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Data Type</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
              >
                {DATA_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Description / Business Semantics</label>
            <textarea
              rows={2}
              placeholder="Explain the functional purpose, governance rules, or calculation logic for this concept..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs focus:outline-none resize-none"
            />
          </div>

          {/* Domain & Systems */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Business Domain</label>
              <select
                value={businessDomain}
                onChange={(e) => setBusinessDomain(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs focus:outline-none"
              >
                {BUSINESS_DOMAINS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Source Systems</label>
              <input
                type="text"
                placeholder="e.g. OneStream, SAP S/4HANA, Salesforce"
                value={sourceSystems}
                onChange={(e) => setSourceSystems(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Aliases & ERP Technical Names */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Base Aliases &amp; Technical Identifiers (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. KOSTL, CostCenter, CC_ID, UD1_CostCenter, cost_center_code"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              These aliases feed Semantra&apos;s lexical and semantic scoring engine to match incoming source columns automatically.
            </span>
          </div>

          {/* Compliance & Privacy Flags */}
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-mono font-bold text-slate-200 block text-xs">Compliance &amp; Data Classification</span>
                <span className="text-[11px] text-slate-400">Flags field for masking, audit logging, and GDPR export boundaries.</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isPII}
                  onChange={(e) => setIsPII(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                />
                <span>PII</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isGDPR}
                  onChange={(e) => setIsGDPR(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                />
                <span>GDPR Special</span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
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
              disabled={idCollision || !entity.trim() || !attribute.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Commit to Canonical Catalog</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
