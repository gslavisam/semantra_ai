import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Download, FileText, CheckCircle2, FileCode, Sparkles, Wand2, Undo2 } from 'lucide-react';
import { CanonicalConcept } from '../types';
import { CANONICAL_SCHEMA, validateDataRow, ValidationIssue } from '../utils/schemaValidation';
import { SchemaSpecificationGuide } from './SchemaSpecificationGuide';
import { ValidationReportPanel } from './ValidationReportPanel';
import { requestAIEnrichment } from '../utils/aiEnrichmentService';

interface ImportGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newConcepts: CanonicalConcept[], updateExisting: boolean) => void;
  existingConcepts: CanonicalConcept[];
}

interface ProcessedCanonicalItem {
  rowNumber: number;
  concept_id: string;
  entity: string;
  attribute: string;
  display_name: string;
  description: string;
  data_type: string;
  aliases: string;
  business_domains: string;
  source_systems: string;
  isPII: boolean;
  isGDPR: boolean;
  isUpdate: boolean;
  isValid: boolean;
  issues: ValidationIssue[];
  aiSuggestedFields?: Record<string, { value: any; reason: string; confidence: number }>;
  hasAiEnrichment?: boolean;
}

export const ImportGlossaryModal: React.FC<ImportGlossaryModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingConcepts
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [processedItems, setProcessedItems] = useState<ProcessedCanonicalItem[]>([]);
  const [backupItems, setBackupItems] = useState<ProcessedCanonicalItem[] | null>(null);
  const [allIssues, setAllIssues] = useState<ValidationIssue[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [aiEnrichmentApplied, setAiEnrichmentApplied] = useState(false);
  const [mergeAliases, setMergeAliases] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [enrichmentSummary, setEnrichmentSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingIdsSet = new Set(existingConcepts.map(c => c.concept_id.toLowerCase()));

  // CSV parsing helper
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result.map(s => s.replace(/^"+|"+$/g, '').trim());
  };

  const processContent = (content: string, sourceName?: string) => {
    setIsParsing(true);
    setErrorBanner(null);
    setProcessedItems([]);
    setBackupItems(null);
    setAiEnrichmentApplied(false);
    setEnrichmentSummary(null);
    setAllIssues([]);

    try {
      const trimmed = content.trim();
      let rawObjects: Record<string, any>[] = [];

      // Check if JSON
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          rawObjects = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e: any) {
          setErrorBanner(`JSON Parse Error: ${e?.message || 'Invalid JSON format'}`);
          setIsParsing(false);
          return;
        }
      } else {
        // Parse CSV
        const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setErrorBanner('CSV must contain a header row and at least one data row.');
          setIsParsing(false);
          return;
        }

        const headers = parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const parts = parseCSVLine(lines[i]);
          if (parts.length === 0 || parts.every(p => p === '')) continue;
          const obj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            obj[h] = parts[idx] !== undefined ? parts[idx] : '';
          });
          rawObjects.push(obj);
        }
      }

      if (rawObjects.length === 0) {
        setErrorBanner('No data rows found in input.');
        setIsParsing(false);
        return;
      }

      const items: ProcessedCanonicalItem[] = [];
      const collectedIssues: ValidationIssue[] = [];

      rawObjects.forEach((rawObj, idx) => {
        const rowNum = idx + 1;
        const validation = validateDataRow(rawObj, rowNum, CANONICAL_SCHEMA, existingIdsSet);
        collectedIssues.push(...validation.issues);

        let concept_id = validation.cleanRecord.concept_id || '';
        let entity = validation.cleanRecord.entity || '';
        let attribute = validation.cleanRecord.attribute || '';

        // Synthesize if partial
        if (!concept_id && entity && attribute) {
          concept_id = `${entity.toLowerCase()}.${attribute.toLowerCase()}`;
        } else if (concept_id && (!entity || !attribute)) {
          const parts = concept_id.split('.');
          if (parts.length >= 2) {
            entity = entity || parts[0];
            attribute = attribute || parts.slice(1).join('_');
          }
        }

        const isUpdate = existingIdsSet.has(concept_id.toLowerCase());

        items.push({
          rowNumber: rowNum,
          concept_id: concept_id || `Row_${rowNum}`,
          entity: entity || 'general',
          attribute: attribute || concept_id || 'unknown',
          display_name: validation.cleanRecord.display_name || concept_id || `Concept ${rowNum}`,
          description: validation.cleanRecord.description || '',
          data_type: validation.cleanRecord.data_type || 'string',
          aliases: validation.cleanRecord.aliases || '',
          business_domains: validation.cleanRecord.business_domains || 'General',
          source_systems: validation.cleanRecord.source_systems || 'Enterprise',
          isPII: Boolean(validation.cleanRecord.is_pii),
          isGDPR: Boolean(validation.cleanRecord.is_gdpr),
          isUpdate,
          isValid: validation.isValid,
          issues: validation.issues
        });
      });

      setProcessedItems(items);
      setAllIssues(collectedIssues);
      if (sourceName) setFileName(sourceName);

    } catch (err: any) {
      setErrorBanner(`Processing error: ${err?.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processContent(content, file.name);
    };
    reader.readAsText(file);
  };

  // AI Auto-Enrichment Handlers
  const missingDescCount = processedItems.filter(i => !i.description || i.description.trim() === '').length;
  const missingAliasCount = processedItems.filter(i => !i.aliases || i.aliases.trim() === '').length;
  const missingDomainCount = processedItems.filter(i => !i.business_domains || i.business_domains === 'General' || i.business_domains.trim() === '').length;
  const missingPiiCount = processedItems.filter(i => !i.isPII).length;
  const totalGaps = missingDescCount + missingAliasCount + missingDomainCount;

  const handleAutoEnrich = async () => {
    if (processedItems.length === 0) return;
    setIsEnriching(true);
    setErrorBanner(null);

    try {
      if (!backupItems) {
        setBackupItems(JSON.parse(JSON.stringify(processedItems)));
      }

      const knownDomains = Array.from(new Set(existingConcepts.map(c => c.business_domains || 'General')));
      const sampleCanonicalIds = existingConcepts.slice(0, 20).map(c => c.concept_id);

      const response = await requestAIEnrichment('canonical', processedItems, {
        knownDomains,
        sampleCanonicalIds
      });

      if (response && response.enrichedItems) {
        let updatedCount = 0;
        const updated = processedItems.map(item => {
          const enrichment = response.enrichedItems.find(
            e => e.concept_id.toLowerCase() === item.concept_id.toLowerCase()
          );

          if (!enrichment || !enrichment.suggestedFields) return item;

          const suggested = enrichment.suggestedFields;
          const newObj = { ...item, aiSuggestedFields: { ...(item.aiSuggestedFields || {}), ...suggested } };
          let changed = false;

          if ((!item.description || item.description.trim() === '') && suggested.description?.value) {
            newObj.description = suggested.description.value;
            changed = true;
          }
          if ((!item.aliases || item.aliases.trim() === '') && suggested.aliases?.value) {
            newObj.aliases = suggested.aliases.value;
            changed = true;
          }
          if ((!item.business_domains || item.business_domains === 'General' || item.business_domains.trim() === '') && suggested.business_domains?.value) {
            newObj.business_domains = suggested.business_domains.value;
            changed = true;
          }
          if ((!item.data_type || item.data_type.trim() === '') && suggested.data_type?.value) {
            newObj.data_type = suggested.data_type.value;
            changed = true;
          }
          if (!item.isPII && suggested.is_pii?.value !== undefined) {
            newObj.isPII = Boolean(suggested.is_pii.value);
            changed = true;
          }
          if (!item.isGDPR && suggested.is_gdpr?.value !== undefined) {
            newObj.isGDPR = Boolean(suggested.is_gdpr.value);
            changed = true;
          }

          if (changed) {
            newObj.hasAiEnrichment = true;
            updatedCount++;
          }

          return newObj;
        });

        setProcessedItems(updated);
        setAiEnrichmentApplied(true);
        setEnrichmentSummary(
          response.summary || `AI enriched ${updatedCount} concepts with descriptions, ERP aliases, and privacy tags.`
        );
      }
    } catch (err: any) {
      setErrorBanner(`AI enrichment failed: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleRevertEnrichment = () => {
    if (backupItems) {
      setProcessedItems(backupItems);
      setBackupItems(null);
      setAiEnrichmentApplied(false);
      setEnrichmentSummary(null);
    }
  };

  const handleCommit = () => {
    const candidateItems = skipErrors 
      ? processedItems.filter(r => r.isValid) 
      : processedItems;

    if (candidateItems.length === 0) return;

    const conceptsToCommit: CanonicalConcept[] = candidateItems.map(r => ({
      id: r.concept_id,
      concept_id: r.concept_id,
      name: r.display_name,
      display_name: r.display_name,
      entity: r.entity,
      attribute: r.attribute,
      description: r.description,
      data_type: r.data_type,
      source: 'csv_import',
      usage_count: 0,
      field_context_count: 0,
      active_overlay_entry_count: 0,
      business_domains: r.business_domains,
      source_systems: r.source_systems,
      base_aliases: r.aliases,
      isPII: r.isPII,
      isGDPR: r.isGDPR,
      hasContext: false,
      hasOverlay: false
    }));

    onImport(conceptsToCommit, mergeAliases);
    onClose();
  };

  const validItems = processedItems.filter(r => r.isValid);
  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const canCommit = processedItems.length > 0 && (skipErrors ? validItems.length > 0 : errorCount === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Import Canonical Glossary
                <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-sans">
                  CSV & JSON with Pre-flight Validation
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Upload or paste data dictionaries with deterministic validation and merge policy control.
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

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorBanner && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Collapsible Schema & Format Guide */}
          <SchemaSpecificationGuide spec={CANONICAL_SCHEMA} defaultExpanded={false} />

          {/* Mode Switch Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === 'upload' 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>File Upload (.csv / .json)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === 'paste' 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text (CSV / JSON)</span>
              </button>
            </div>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/50 hover:bg-slate-900/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.json,text/csv,application/json" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-slate-200 text-xs">
                  {fileName ? `Selected: ${fileName}` : 'Click to select or drag & drop CSV or JSON file'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Auto-detects format, verifies data types, and validates concept identifiers.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw Content */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste CSV text with headers or JSON array of concepts here..."
                rows={5}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!rawText.trim()}
                  onClick={() => processContent(rawText, 'pasted_text')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-mono text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Parse & Validate</span>
                </button>
              </div>
            </div>
          )}

          {/* Pre-flight Validation Report Panel */}
          {processedItems.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* AI Auto-Enrich Wizard Card */}
              {!aiEnrichmentApplied ? (
                totalGaps > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-4 shadow-lg shadow-indigo-950/30 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-lg shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            AI Metadata Auto-Enrich Wizard
                          </span>
                          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-[10px] font-mono font-semibold">
                            {totalGaps} Gaps Detected
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Auto-populate missing business definitions, SAP/ERP aliases (e.g. KOSTL, KUNNR, MATNR), domains, and PII tags in 1-click before committing.
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                          {missingDescCount > 0 && <span>• {missingDescCount} empty descriptions</span>}
                          {missingAliasCount > 0 && <span>• {missingAliasCount} missing aliases</span>}
                          {missingDomainCount > 0 && <span>• {missingDomainCount} generic domains</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isEnriching}
                      onClick={handleAutoEnrich}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-mono font-bold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-950 transition-all cursor-pointer"
                    >
                      {isEnriching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Enriching...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Auto-Enrich with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              ) : (
                <div className="p-3.5 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/40 rounded-xl flex items-center justify-between gap-4 shadow-lg shadow-purple-950/30 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          ✨ AI Metadata Enrichment Active
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-mono">
                          Inspectable Human-in-the-Loop
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        {enrichmentSummary || "AI suggestions populated in table below. You can inspect badges, review fields, or revert anytime."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRevertEnrichment}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-mono text-[11px] flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Revert AI</span>
                    </button>
                    <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Accepted</span>
                    </div>
                  </div>
                </div>
              )}

              <ValidationReportPanel
                totalRows={processedItems.length}
                validRowsCount={validItems.length}
                warningRowsCount={allIssues.filter(i => i.severity === 'warning').length}
                errorRowsCount={errorCount}
                issues={allIssues}
                skipErrors={skipErrors}
                onToggleSkipErrors={setSkipErrors}
              />

              {/* Merge Policy Option */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-200 block text-xs">
                    Smart Alias & System Merging
                  </span>
                  <span className="text-[11px] text-slate-400">
                    If concept already exists in catalog, append new aliases and source systems rather than overwriting.
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-indigo-400">
                  <input
                    type="checkbox"
                    checked={mergeAliases}
                    onChange={(e) => setMergeAliases(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4"
                  />
                  <span>Merge Aliases</span>
                </label>
              </div>

              {/* Sample Parsed Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-400 text-[11px] block">
                    Parsed Records Preview ({validItems.length} valid of {processedItems.length} total):
                  </span>
                  {aiEnrichmentApplied && (
                    <span className="text-[10px] font-mono text-purple-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>AI suggested fields are labeled with purple badges</span>
                    </span>
                  )}
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-56 overflow-y-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="p-2.5">Row</th>
                        <th className="p-2.5">Concept ID & Name</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Aliases</th>
                        <th className="p-2.5">Type & Domain</th>
                        <th className="p-2.5">PII</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {processedItems.slice(0, 10).map((r, idx) => (
                        <tr key={idx} className={r.isValid ? (r.hasAiEnrichment ? 'bg-purple-950/10 hover:bg-purple-950/20' : 'hover:bg-slate-900/50') : 'bg-rose-950/20 text-rose-300'}>
                          <td className="p-2.5 font-bold text-slate-400">{r.rowNumber}</td>
                          <td className="p-2.5">
                            <span className="font-bold text-white block">{r.concept_id}</span>
                            <span className="text-indigo-300 text-[10px]">{r.display_name}</span>
                          </td>
                          <td className="p-2.5 max-w-xs">
                            {r.description ? (
                              <div>
                                <span className="text-slate-300 line-clamp-2">{r.description}</span>
                                {r.aiSuggestedFields?.description && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Definition</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Empty description</span>
                            )}
                          </td>
                          <td className="p-2.5 max-w-xs">
                            {r.aliases ? (
                              <div>
                                <span className="text-slate-300 font-mono text-[10px] line-clamp-2">{r.aliases}</span>
                                {r.aiSuggestedFields?.aliases && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Synonyms</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No aliases</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="text-slate-400 block">{r.data_type}</span>
                            <span className="text-indigo-400 text-[10px]">{r.business_domains}</span>
                            {r.aiSuggestedFields?.business_domains && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] block w-fit mt-0.5">
                                <Sparkles className="w-2 h-2" />
                                <span>AI Domain</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {r.isPII ? (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[9px] flex items-center gap-0.5 w-fit">
                                {r.aiSuggestedFields?.is_pii && <Sparkles className="w-2 h-2" />}
                                <span>PII</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {!r.isValid ? (
                              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[9px]">INVALID</span>
                            ) : r.hasAiEnrichment ? (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded text-[9px] flex items-center gap-1 font-semibold">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>ENRICHED</span>
                              </span>
                            ) : r.isUpdate ? (
                              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[9px]">UPDATE</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px]">NEW</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            {processedItems.length > 0 
              ? `${validItems.length} valid of ${processedItems.length} rows ready` 
              : 'Awaiting file or text input'}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canCommit}
              onClick={handleCommit}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {errorCount > 0 && skipErrors
                  ? `Import ${validItems.length} Valid Concepts (Skip ${errorCount} Errors)`
                  : `Commit ${validItems.length} Concepts to Catalog`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
