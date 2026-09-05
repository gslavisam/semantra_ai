import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, AlertCircle, FileSpreadsheet, CheckCircle2, Download, FileText, RefreshCw, FileCode, Check, Undo2 } from 'lucide-react';
import { KnowledgeConcept } from '../types';
import { KNOWLEDGE_SCHEMA, validateDataRow, ValidationIssue } from '../utils/schemaValidation';
import { SchemaSpecificationGuide } from './SchemaSpecificationGuide';
import { ValidationReportPanel } from './ValidationReportPanel';
import { requestAIEnrichment } from '../utils/aiEnrichmentService';

interface ImportKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (concepts: KnowledgeConcept[], mergeExisting: boolean) => void;
  existingKnowledge: KnowledgeConcept[];
}

interface ProcessedKnowledgeItem {
  rowNumber: number;
  concept_id: string;
  canonical_name: string;
  domain: string;
  source: string;
  editable: 'yes' | 'no';
  linked_pii: 'yes' | 'no';
  linked_gdpr_special: 'yes' | 'no';
  linked_pii_tags: string;
  linked_data_subjects: string;
  source_systems: string;
  linked_canonical_concepts: string;
  linked_canonical_concept_count: number;
  isUpdate: boolean;
  isValid: boolean;
  issues: ValidationIssue[];
  aiSuggestedFields?: Record<string, { value: any; reason: string; confidence: number }>;
  hasAiEnrichment?: boolean;
}

export const ImportKnowledgeModal: React.FC<ImportKnowledgeModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingKnowledge
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [mergeExisting, setMergeExisting] = useState<boolean>(true);
  const [skipErrors, setSkipErrors] = useState<boolean>(true);
  const [processedItems, setProcessedItems] = useState<ProcessedKnowledgeItem[]>([]);
  const [backupItems, setBackupItems] = useState<ProcessedKnowledgeItem[] | null>(null);
  const [allIssues, setAllIssues] = useState<ValidationIssue[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [aiEnrichmentApplied, setAiEnrichmentApplied] = useState<boolean>(false);
  const [enrichmentSummary, setEnrichmentSummary] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingIdSet = new Set(existingKnowledge.map(k => k.concept_id.toLowerCase()));

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

      // Detect JSON vs CSV
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
        setErrorBanner('No data rows found in file/text.');
        setIsParsing(false);
        return;
      }

      const items: ProcessedKnowledgeItem[] = [];
      const collectedIssues: ValidationIssue[] = [];

      rawObjects.forEach((rawObj, idx) => {
        const rowNum = idx + 1;
        const validation = validateDataRow(rawObj, rowNum, KNOWLEDGE_SCHEMA, existingIdSet);
        collectedIssues.push(...validation.issues);

        const concept_id = validation.cleanRecord.concept_id || `know_${rowNum}`;
        const canonical_name = validation.cleanRecord.canonical_name || concept_id;
        const domain = validation.cleanRecord.domain || 'General Knowledge';
        const source = validation.cleanRecord.source || 'expert_curated';
        const editableVal = String(validation.cleanRecord.editable || 'yes').toLowerCase();
        const editable: 'yes' | 'no' = editableVal === 'no' ? 'no' : 'yes';

        const piiVal = String(validation.cleanRecord.linked_pii || 'no').toLowerCase();
        const linked_pii: 'yes' | 'no' = (piiVal === 'yes' || piiVal === 'true' || piiVal === '1') ? 'yes' : 'no';

        const gdprVal = String(validation.cleanRecord.linked_gdpr_special || 'no').toLowerCase();
        const linked_gdpr_special: 'yes' | 'no' = (gdprVal === 'yes' || gdprVal === 'true' || gdprVal === '1') ? 'yes' : 'no';

        const linked_pii_tags = validation.cleanRecord.linked_pii_tags || '';
        const linked_data_subjects = validation.cleanRecord.linked_data_subjects || '';
        const source_systems = validation.cleanRecord.source_systems || 'Enterprise System';
        const linked_canonical_concepts = validation.cleanRecord.linked_canonical_concepts || '';
        
        const canonicalLinksCount = linked_canonical_concepts 
          ? linked_canonical_concepts.split(/[,;]/).filter(Boolean).length 
          : 0;

        const isUpdate = existingIdSet.has(concept_id.toLowerCase());

        items.push({
          rowNumber: rowNum,
          concept_id,
          canonical_name,
          domain,
          source,
          editable,
          linked_pii,
          linked_gdpr_special,
          linked_pii_tags,
          linked_data_subjects,
          source_systems,
          linked_canonical_concepts,
          linked_canonical_concept_count: canonicalLinksCount,
          isUpdate,
          isValid: validation.isValid,
          issues: validation.issues
        });
      });

      setProcessedItems(items);
      setAllIssues(collectedIssues);
      if (sourceName) setFileName(sourceName);
    } catch (err: any) {
      setErrorBanner(`Error parsing Knowledge input: ${err?.message || 'Unknown error'}`);
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
  const missingDomainCount = processedItems.filter(c => !c.domain || c.domain === 'General Knowledge' || c.domain.trim() === '').length;
  const missingLinkCount = processedItems.filter(c => !c.linked_canonical_concepts || c.linked_canonical_concepts.trim() === '').length;
  const totalGaps = missingDomainCount + missingLinkCount;

  const handleAutoEnrich = async () => {
    if (processedItems.length === 0) return;
    setIsEnriching(true);
    setErrorBanner(null);

    try {
      if (!backupItems) {
        setBackupItems(JSON.parse(JSON.stringify(processedItems)));
      }

      const knownDomains = Array.from(new Set(existingKnowledge.map(k => k.domain || 'General Knowledge')));
      const sampleCanonicalIds = existingKnowledge.slice(0, 20).map(k => k.concept_id);

      const response = await requestAIEnrichment('knowledge', processedItems, {
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

          if ((!item.domain || item.domain === 'General Knowledge' || item.domain.trim() === '') && suggested.domain?.value) {
            newObj.domain = suggested.domain.value;
            changed = true;
          }
          if ((!item.linked_canonical_concepts || item.linked_canonical_concepts.trim() === '') && suggested.linked_canonical_concepts?.value) {
            newObj.linked_canonical_concepts = suggested.linked_canonical_concepts.value;
            newObj.linked_canonical_concept_count = newObj.linked_canonical_concepts.split(';').filter(s => s.trim()).length;
            changed = true;
          }
          if (item.linked_pii === 'no' && suggested.linked_pii?.value === 'yes') {
            newObj.linked_pii = 'yes';
            if (suggested.linked_pii_tags?.value) newObj.linked_pii_tags = suggested.linked_pii_tags.value;
            if (suggested.linked_data_subjects?.value) newObj.linked_data_subjects = suggested.linked_data_subjects.value;
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
          response.summary || `AI enriched ${updatedCount} knowledge concepts with domain alignments, canonical links, and PII tags.`
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

    const conceptsToCommit: KnowledgeConcept[] = candidateItems.map((c, i) => ({
      id: `know_imp_${Date.now()}_${i}`,
      concept_id: c.concept_id,
      canonical_name: c.canonical_name,
      domain: c.domain,
      source: c.source,
      editable: c.editable,
      linked_pii: c.linked_pii,
      linked_gdpr_special: c.linked_gdpr_special,
      linked_pii_tags: c.linked_pii_tags,
      linked_data_subjects: c.linked_data_subjects,
      alias_count: 0,
      field_context_count: c.linked_canonical_concept_count > 0 ? 1 : 0,
      linked_canonical_concept_count: c.linked_canonical_concept_count,
      source_systems: c.source_systems,
      linked_canonical_concepts: c.linked_canonical_concepts
    }));

    onImport(conceptsToCommit, mergeExisting);
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
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Import Knowledge Concepts
                <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-sans">
                  CSV & JSON with Pre-flight Validation
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Upload knowledge concept definitions, source system linkages, and governance tags in bulk.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorBanner && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Collapsible Format & Schema Guide */}
          <SchemaSpecificationGuide spec={KNOWLEDGE_SCHEMA} defaultExpanded={false} />

          {/* Mode Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === 'upload' 
                    ? 'bg-purple-600 text-white font-bold' 
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
                    ? 'bg-purple-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text (CSV / JSON)</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Upload Dropzone */}
          {activeTab === 'upload' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-900/50 hover:bg-slate-900/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.json,text/csv,application/json" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-slate-200 text-xs">
                  {fileName ? `Selected: ${fileName}` : 'Click to select or drag & drop Knowledge CSV or JSON file'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Auto-detects format, verifies entity domains, and links canonical catalog targets.
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
                placeholder="Paste CSV text with headers or JSON array of knowledge concepts here..."
                rows={5}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!rawText.trim()}
                  onClick={() => processContent(rawText, 'pasted_knowledge')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-mono text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Parse & Validate</span>
                </button>
              </div>
            </div>
          )}

          {/* Validation Report Panel */}
          {processedItems.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* AI Auto-Enrich Wizard Card */}
              {!aiEnrichmentApplied ? (
                totalGaps > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/30 rounded-xl flex items-center justify-between gap-4 shadow-lg shadow-purple-950/30 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            AI Knowledge Auto-Enrich Wizard
                          </span>
                          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-[10px] font-mono font-semibold">
                            {totalGaps} Gaps Detected
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Auto-align enterprise domains, link canonical concepts (e.g. customer.tax_id, employee.salary), and detect GDPR/PII tags in 1-click.
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                          {missingDomainCount > 0 && <span>• {missingDomainCount} generic domains</span>}
                          {missingLinkCount > 0 && <span>• {missingLinkCount} missing canonical links</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isEnriching}
                      onClick={handleAutoEnrich}
                      className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-mono font-bold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-purple-950 transition-all cursor-pointer"
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
                <div className="p-3.5 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-4 shadow-lg shadow-indigo-950/30 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          ✨ AI Knowledge Enrichment Active
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-mono">
                          Inspectable Human-in-the-Loop
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        {enrichmentSummary || "AI suggestions populated in table below. You can inspect badges, review links, or revert anytime."}
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
                warningRowsCount={warningCount}
                errorRowsCount={errorCount}
                issues={allIssues}
                skipErrors={skipErrors}
                onToggleSkipErrors={setSkipErrors}
              />

              {/* Merge Policy Option */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-200 block text-xs">Merge Systems & Canonical Links</span>
                  <span className="text-[11px] text-slate-400">Combine source systems and canonical links with existing concepts rather than replacing them.</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-purple-400">
                  <input
                    type="checkbox"
                    checked={mergeExisting}
                    onChange={(e) => setMergeExisting(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-0 w-4 h-4"
                  />
                  <span>Merge Links</span>
                </label>
              </div>

              {/* Table Preview */}
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
                        <th className="p-2.5">Domain</th>
                        <th className="p-2.5">Linked Canonical Concepts</th>
                        <th className="p-2.5">Systems & PII</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {processedItems.slice(0, 10).map((c, idx) => (
                        <tr key={idx} className={c.isValid ? (c.hasAiEnrichment ? 'bg-purple-950/10 hover:bg-purple-950/20' : 'hover:bg-slate-900/50') : 'bg-rose-950/20 text-rose-300'}>
                          <td className="p-2.5 font-bold text-slate-400">{c.rowNumber}</td>
                          <td className="p-2.5">
                            <span className="font-bold text-white block">{c.concept_id}</span>
                            <span className="text-purple-300 text-[10px]">{c.canonical_name}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-slate-300 block">{c.domain}</span>
                            {c.aiSuggestedFields?.domain && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>AI Domain</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 max-w-xs">
                            {c.linked_canonical_concepts ? (
                              <div>
                                <span className="text-indigo-300 font-mono text-[10px] line-clamp-2">{c.linked_canonical_concepts}</span>
                                {c.aiSuggestedFields?.linked_canonical_concepts && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Canonical Link</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No linked concepts</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="text-slate-400 truncate max-w-[120px] block">{c.source_systems}</span>
                            {c.linked_pii === 'yes' && (
                              <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[9px] inline-flex items-center gap-0.5 mt-0.5">
                                {c.aiSuggestedFields?.linked_pii && <Sparkles className="w-2 h-2" />}
                                <span>PII Tagged</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {!c.isValid ? (
                              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[9px]">INVALID</span>
                            ) : c.hasAiEnrichment ? (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded text-[9px] flex items-center gap-1 font-semibold">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>ENRICHED</span>
                              </span>
                            ) : c.isUpdate ? (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[9px]">UPDATE</span>
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
              ? `${validItems.length} valid of ${processedItems.length} records ready` 
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
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-950 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {errorCount > 0 && skipErrors
                  ? `Import ${validItems.length} Valid (Skip ${errorCount} Errors)`
                  : `Import ${validItems.length} Knowledge Concepts`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
