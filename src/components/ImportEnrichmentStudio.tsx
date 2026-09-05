import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  FileText, 
  Check, 
  Undo2, 
  Search, 
  Sliders, 
  ArrowRight, 
  ShieldCheck, 
  BookOpen, 
  Layers, 
  Filter, 
  FileCode, 
  Copy, 
  Lock, 
  Info,
  ChevronRight,
  Database,
  Eye,
  X
} from 'lucide-react';
import { CanonicalConcept, KnowledgeConcept, StewardshipAuditRecord } from '../types';
import { CANONICAL_SCHEMA, KNOWLEDGE_SCHEMA, validateDataRow, ValidationIssue } from '../utils/schemaValidation';
import { requestAIEnrichment, FieldSuggestion } from '../utils/aiEnrichmentService';

interface StagedRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  issues: ValidationIssue[];
  isUpdate: boolean;
  aiSuggestedFields?: Record<string, FieldSuggestion>;
  hasAiEnrichment?: boolean;
}

interface ImportEnrichmentStudioProps {
  existingCanonicalConcepts: CanonicalConcept[];
  existingKnowledgeConcepts: KnowledgeConcept[];
  activeBranch: string;
  onCommitCanonical: (concepts: CanonicalConcept[], mergeAliases: boolean) => void;
  onCommitKnowledge: (concepts: KnowledgeConcept[], mergeExisting: boolean) => void;
  onAddAuditRecord: (record: StewardshipAuditRecord) => void;
  onShowToast: (msg: string) => void;
}

// Predefined enterprise demo datasets for 1-click testing
const SAMPLE_CANONICAL_DATASET = [
  {
    concept_id: 'financial.cost_center',
    display_name: 'Cost Center Code',
    entity: 'financial',
    attribute: 'cost_center',
    data_type: 'STRING',
    description: '',
    aliases: '',
    business_domains: '',
    source_systems: 'SAP S/4HANA; Oracle EBS',
    is_pii: false,
    is_gdpr: false
  },
  {
    concept_id: 'customer.tax_id',
    display_name: 'Tax Registration Number',
    entity: 'customer',
    attribute: 'tax_id',
    data_type: 'STRING',
    description: '',
    aliases: 'TAX_NUM',
    business_domains: '',
    source_systems: 'Salesforce CRM; SAP ECC',
    is_pii: false,
    is_gdpr: false
  },
  {
    concept_id: 'employee.gross_salary',
    display_name: 'Monthly Base Salary',
    entity: 'employee',
    attribute: 'gross_salary',
    data_type: 'DECIMAL',
    description: '',
    aliases: '',
    business_domains: '',
    source_systems: 'Workday HR',
    is_pii: false,
    is_gdpr: false
  },
  {
    concept_id: 'procurement.vendor_account',
    display_name: 'Supplier Account Number',
    entity: 'procurement',
    attribute: 'vendor_account',
    data_type: 'STRING',
    description: 'Master account code for approved supply chain vendors.',
    aliases: '',
    business_domains: 'Procurement',
    source_systems: 'SAP S/4HANA',
    is_pii: false,
    is_gdpr: false
  },
  {
    concept_id: 'sales.order_reference',
    display_name: 'Sales Order ID',
    entity: 'sales',
    attribute: 'order_reference',
    data_type: 'STRING',
    description: '',
    aliases: '',
    business_domains: '',
    source_systems: 'Salesforce; SAP SD',
    is_pii: false,
    is_gdpr: false
  }
];

const SAMPLE_KNOWLEDGE_DATASET = [
  {
    concept_id: 'sap_kostl_master',
    canonical_name: 'SAP Cost Center Master',
    domain: '',
    linked_canonical_concepts: '',
    source_systems: 'SAP S/4HANA (CO-OM)',
    linked_pii: 'no',
    linked_gdpr_special: 'no',
    linked_pii_tags: ''
  },
  {
    concept_id: 'crm_customer_vat',
    canonical_name: 'Client VAT / Tax Registration',
    domain: '',
    linked_canonical_concepts: '',
    source_systems: 'Salesforce CRM',
    linked_pii: 'no',
    linked_gdpr_special: 'no',
    linked_pii_tags: ''
  },
  {
    concept_id: 'workday_compensation_pkg',
    canonical_name: 'Workday Employee Payroll Package',
    domain: '',
    linked_canonical_concepts: '',
    source_systems: 'Workday HRMS',
    linked_pii: 'no',
    linked_gdpr_special: 'no',
    linked_pii_tags: ''
  }
];

export const ImportEnrichmentStudio: React.FC<ImportEnrichmentStudioProps> = ({
  existingCanonicalConcepts,
  existingKnowledgeConcepts,
  activeBranch,
  onCommitCanonical,
  onCommitKnowledge,
  onAddAuditRecord,
  onShowToast
}) => {
  // Target Catalog Type
  const [targetCatalog, setTargetCatalog] = useState<'canonical' | 'knowledge'>('canonical');

  // Active Wizard Pipeline Step: 1 = Staging, 2 = Analysis & Gaps, 3 = Enrichment & Grid, 4 = Commit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Staging / Data Input State
  const [inputTab, setInputTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [stagedRows, setStagedRows] = useState<StagedRow[]>([]);
  const [backupStagedRows, setBackupStagedRows] = useState<StagedRow[] | null>(null);

  // Enrichment Execution State
  const [isEnriching, setIsEnriching] = useState(false);
  const [activeEnrichAction, setActiveEnrichAction] = useState<string | null>(null);
  const [enrichmentSummary, setEnrichmentSummary] = useState<string | null>(null);

  // Grid Controls
  const [gridFilter, setGridFilter] = useState<'all' | 'enriched' | 'gaps' | 'invalid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInspectRow, setSelectedInspectRow] = useState<StagedRow | null>(null);

  // Commit Settings
  const [mergeAliases, setMergeAliases] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSchema = targetCatalog === 'canonical' ? CANONICAL_SCHEMA : KNOWLEDGE_SCHEMA;

  // Clear data when switching target catalog
  const handleSwitchTargetCatalog = (newTarget: 'canonical' | 'knowledge') => {
    if (stagedRows.length > 0) {
      if (!window.confirm(`Switching to ${newTarget === 'canonical' ? 'Canonical Dictionary' : 'Knowledge Base'} will clear the current staging grid. Continue?`)) {
        return;
      }
    }
    setTargetCatalog(newTarget);
    setStagedRows([]);
    setBackupStagedRows(null);
    setFileName(null);
    setRawText('');
    setEnrichmentSummary(null);
    setCurrentStep(1);
  };

  // Parsing CSV or JSON text into Staged Rows
  const processRawData = (text: string, sourceName?: string) => {
    setIsParsing(true);
    setEnrichmentSummary(null);
    setBackupStagedRows(null);

    try {
      let records: any[] = [];
      const trimmed = text.trim();

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Parse JSON
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse CSV
        const lines = trimmed.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error('CSV must have at least a header row and one data row.');
        }

        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCsvLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] !== undefined ? values[idx] : '';
          });
          records.push(rowObj);
        }
      }

      if (records.length === 0) {
        throw new Error('No valid records found in source data.');
      }

      // Validate records against schema
      const existingIdSet = new Set(
        targetCatalog === 'canonical'
          ? existingCanonicalConcepts.map(c => c.concept_id.toLowerCase())
          : existingKnowledgeConcepts.map(k => k.concept_id.toLowerCase())
      );

      const staged: StagedRow[] = records.map((rec, index) => {
        const rowNum = index + 1;
        const { issues, cleanRecord, isValid } = validateDataRow(rec, activeSchema, rowNum);

        const conceptId = String(
          cleanRecord.concept_id || rec.concept_id || rec.id || `item_${rowNum}`
        ).trim().toLowerCase();

        const isUpdate = existingIdSet.has(conceptId);

        return {
          rowNumber: rowNum,
          data: { ...rec, ...cleanRecord, concept_id: conceptId },
          isValid,
          issues,
          isUpdate
        };
      });

      setStagedRows(staged);
      if (sourceName) setFileName(sourceName);
      setCurrentStep(2);
      onShowToast(`Loaded ${staged.length} records into staging grid.`);
    } catch (err: any) {
      alert(`Parsing failed: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Load sample dataset
  const handleLoadSampleDataset = () => {
    const dataset = targetCatalog === 'canonical' ? SAMPLE_CANONICAL_DATASET : SAMPLE_KNOWLEDGE_DATASET;
    processRawData(JSON.stringify(dataset, null, 2), `demo_${targetCatalog}_sample.json`);
  };

  // Handle File selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawData(content, file.name);
    };
    reader.readAsText(file);
  };

  // Gap Metrics Calculation
  const gapMetrics = useMemo(() => {
    if (stagedRows.length === 0) {
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        missingDesc: 0,
        missingAliases: 0,
        missingDomains: 0,
        missingPii: 0,
        missingCanonicalLinks: 0,
        totalGaps: 0
      };
    }

    let missingDesc = 0;
    let missingAliases = 0;
    let missingDomains = 0;
    let missingPii = 0;
    let missingCanonicalLinks = 0;

    stagedRows.forEach(r => {
      const d = r.data;
      if (targetCatalog === 'canonical') {
        if (!d.description || String(d.description).trim() === '') missingDesc++;
        if (!d.aliases || String(d.aliases).trim() === '') missingAliases++;
        if (!d.business_domains || d.business_domains === 'General' || String(d.business_domains).trim() === '') missingDomains++;
        if (!d.is_pii && !d.isPII) missingPii++;
      } else {
        if (!d.domain || d.domain === 'General Knowledge' || String(d.domain).trim() === '') missingDomains++;
        if (!d.linked_canonical_concepts || String(d.linked_canonical_concepts).trim() === '') missingCanonicalLinks++;
        if (d.linked_pii !== 'yes') missingPii++;
      }
    });

    const totalGaps = targetCatalog === 'canonical'
      ? missingDesc + missingAliases + missingDomains
      : missingDomains + missingCanonicalLinks;

    return {
      total: stagedRows.length,
      valid: stagedRows.filter(r => r.isValid).length,
      invalid: stagedRows.filter(r => !r.isValid).length,
      missingDesc,
      missingAliases,
      missingDomains,
      missingPii,
      missingCanonicalLinks,
      totalGaps
    };
  }, [stagedRows, targetCatalog]);

  // Modular AI Enrichment Execution
  const executeEnrichment = async (actionType: 'all' | 'definitions' | 'aliases' | 'privacy' | 'domains' | 'canonical_links') => {
    if (stagedRows.length === 0) return;

    setIsEnriching(true);
    setActiveEnrichAction(actionType);

    try {
      // Save backup for 1-click revert
      if (!backupStagedRows) {
        setBackupStagedRows(JSON.parse(JSON.stringify(stagedRows)));
      }

      const knownDomains = Array.from(new Set(
        targetCatalog === 'canonical'
          ? existingCanonicalConcepts.map(c => c.business_domains || 'General')
          : existingKnowledgeConcepts.map(k => k.domain || 'General Knowledge')
      ));

      const sampleCanonicalIds = existingCanonicalConcepts.slice(0, 30).map(c => c.concept_id);

      const itemsToEnrich = stagedRows.map(r => r.data);

      const response = await requestAIEnrichment(targetCatalog, itemsToEnrich, {
        knownDomains,
        sampleCanonicalIds
      });

      if (response && response.enrichedItems) {
        let changedCount = 0;

        const updatedRows = stagedRows.map(row => {
          const rowConceptId = String(row.data.concept_id || '').toLowerCase();
          const match = response.enrichedItems.find(e => e.concept_id.toLowerCase() === rowConceptId);

          if (!match || !match.suggestedFields) return row;

          const suggested = match.suggestedFields;
          const updatedData = { ...row.data };
          const newSuggestions = { ...(row.aiSuggestedFields || {}) };
          let hasChange = false;

          // Apply based on actionType
          if (targetCatalog === 'canonical') {
            // 1. Descriptions
            if ((actionType === 'all' || actionType === 'definitions') && suggested.description?.value) {
              if (!updatedData.description || String(updatedData.description).trim() === '') {
                updatedData.description = suggested.description.value;
                newSuggestions.description = suggested.description;
                hasChange = true;
              }
            }

            // 2. Aliases
            if ((actionType === 'all' || actionType === 'aliases') && suggested.aliases?.value) {
              if (!updatedData.aliases || String(updatedData.aliases).trim() === '') {
                updatedData.aliases = suggested.aliases.value;
                newSuggestions.aliases = suggested.aliases;
                hasChange = true;
              }
            }

            // 3. Domains
            if ((actionType === 'all' || actionType === 'domains') && suggested.business_domains?.value) {
              if (!updatedData.business_domains || updatedData.business_domains === 'General' || String(updatedData.business_domains).trim() === '') {
                updatedData.business_domains = suggested.business_domains.value;
                newSuggestions.business_domains = suggested.business_domains;
                hasChange = true;
              }
            }

            // 4. Privacy
            if ((actionType === 'all' || actionType === 'privacy') && suggested.is_pii?.value !== undefined) {
              if (!updatedData.is_pii && !updatedData.isPII) {
                updatedData.is_pii = Boolean(suggested.is_pii.value);
                updatedData.isPII = Boolean(suggested.is_pii.value);
                newSuggestions.is_pii = suggested.is_pii;
                hasChange = true;
              }
            }
          } else {
            // Knowledge Catalog
            // 1. Domains
            if ((actionType === 'all' || actionType === 'domains') && suggested.domain?.value) {
              if (!updatedData.domain || updatedData.domain === 'General Knowledge' || String(updatedData.domain).trim() === '') {
                updatedData.domain = suggested.domain.value;
                newSuggestions.domain = suggested.domain;
                hasChange = true;
              }
            }

            // 2. Canonical Links
            if ((actionType === 'all' || actionType === 'canonical_links') && suggested.linked_canonical_concepts?.value) {
              if (!updatedData.linked_canonical_concepts || String(updatedData.linked_canonical_concepts).trim() === '') {
                updatedData.linked_canonical_concepts = suggested.linked_canonical_concepts.value;
                newSuggestions.linked_canonical_concepts = suggested.linked_canonical_concepts;
                hasChange = true;
              }
            }

            // 3. Privacy
            if ((actionType === 'all' || actionType === 'privacy') && suggested.linked_pii?.value === 'yes') {
              updatedData.linked_pii = 'yes';
              if (suggested.linked_pii_tags?.value) updatedData.linked_pii_tags = suggested.linked_pii_tags.value;
              newSuggestions.linked_pii = suggested.linked_pii;
              hasChange = true;
            }
          }

          if (hasChange) {
            changedCount++;
            return {
              ...row,
              data: updatedData,
              aiSuggestedFields: newSuggestions,
              hasAiEnrichment: true
            };
          }

          return row;
        });

        setStagedRows(updatedRows);
        setEnrichmentSummary(`Enriched ${changedCount} concepts with AI-generated metadata (${actionType}).`);
        onShowToast(`AI enrichment applied to ${changedCount} rows.`);
        setCurrentStep(3);
      }
    } catch (err: any) {
      alert(`Enrichment failed: ${err.message || 'Please try again'}`);
    } finally {
      setIsEnriching(false);
      setActiveEnrichAction(null);
    }
  };

  // Revert all AI suggestions
  const handleRevertAllEnrichment = () => {
    if (backupStagedRows) {
      setStagedRows(backupStagedRows);
      setBackupStagedRows(null);
      setEnrichmentSummary(null);
      onShowToast('Reverted AI enrichment back to initial staged values.');
    }
  };

  // Revert single row AI suggestions
  const handleRevertSingleRow = (rowNumber: number) => {
    if (!backupStagedRows) return;
    const original = backupStagedRows.find(r => r.rowNumber === rowNumber);
    if (!original) return;

    setStagedRows(prev => prev.map(r => r.rowNumber === rowNumber ? JSON.parse(JSON.stringify(original)) : r));
    onShowToast(`Reverted Row #${rowNumber} to original.`);
  };

  // Filtered rows for grid display
  const displayedRows = useMemo(() => {
    return stagedRows.filter(r => {
      // Query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const str = JSON.stringify(r.data).toLowerCase();
        if (!str.includes(q)) return false;
      }

      // Status filter
      if (gridFilter === 'enriched') return r.hasAiEnrichment;
      if (gridFilter === 'invalid') return !r.isValid;
      if (gridFilter === 'gaps') {
        const d = r.data;
        if (targetCatalog === 'canonical') {
          return !d.description || !d.aliases || !d.business_domains;
        } else {
          return !d.domain || !d.linked_canonical_concepts;
        }
      }
      return true;
    });
  }, [stagedRows, searchQuery, gridFilter, targetCatalog]);

  // Commit to active catalog
  const handleCommitToCatalog = () => {
    const candidateRows = skipErrors ? stagedRows.filter(r => r.isValid) : stagedRows;

    if (candidateRows.length === 0) {
      alert('No valid records to commit.');
      return;
    }

    setIsCommitting(true);

    try {
      if (targetCatalog === 'canonical') {
        const conceptsToCommit: CanonicalConcept[] = candidateRows.map(r => {
          const d = r.data;
          const entity = d.entity || (d.concept_id.includes('.') ? d.concept_id.split('.')[0] : 'general');
          const attr = d.attribute || (d.concept_id.includes('.') ? d.concept_id.split('.').slice(1).join('_') : d.concept_id);
          const aliasStr = d.aliases || d.base_aliases || '';

          return {
            id: `c_${d.concept_id.replace(/\./g, '_')}`,
            concept_id: d.concept_id,
            display_name: d.display_name || d.name || attr,
            entity,
            attribute: attr,
            data_type: d.data_type || 'STRING',
            source: 'staged_import',
            usage_count: 0,
            field_context_count: 1,
            active_overlay_entry_count: 0,
            source_systems: d.source_systems || 'Enterprise ERP',
            business_domains: d.business_domains || 'General',
            base_aliases: aliasStr,
            isPII: Boolean(d.is_pii || d.isPII),
            isGDPR: Boolean(d.is_gdpr || d.isGDPR),
            description: d.description || `Canonical definition for ${attr}.`
          };
        });

        onCommitCanonical(conceptsToCommit, mergeAliases);

        // Record in Audit Log
        const auditRec: StewardshipAuditRecord = {
          id: `audit_studio_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          stewardName: 'Lead Steward (You)',
          actionType: 'batch_import' as any,
          branchName: activeBranch,
          targetEntity: 'Canonical Data Dictionary',
          details: `Staged & Enriched Import: Committed ${conceptsToCommit.length} canonical concepts via Ingestion Studio. (AI Enrichment: ${stagedRows.filter(r => r.hasAiEnrichment).length} items).`,
          idempotencyKey: `IDEMP-STUDIO-CANONICAL-${Date.now()}`,
          commitHash: Math.random().toString(36).substring(2, 9),
          status: 'committed'
        };
        onAddAuditRecord(auditRec);
      } else {
        // Knowledge Base
        const knowledgeToCommit: KnowledgeConcept[] = candidateRows.map(r => {
          const d = r.data;
          const linkedList = d.linked_canonical_concepts ? String(d.linked_canonical_concepts).split(';').map(s => s.trim()).filter(Boolean) : [];

          return {
            id: `k_${d.concept_id}`,
            concept_id: d.concept_id,
            canonical_name: d.canonical_name || d.concept_id,
            domain: d.domain || 'General Knowledge',
            source: 'imported_stewardship',
            editable: 'yes',
            linked_pii: d.linked_pii === 'yes' ? 'yes' : 'no',
            linked_gdpr_special: d.linked_gdpr_special === 'yes' ? 'yes' : 'no',
            linked_pii_tags: d.linked_pii_tags || '',
            linked_data_subjects: d.linked_data_subjects || '',
            alias_count: 1,
            field_context_count: 1,
            linked_canonical_concept_count: linkedList.length,
            source_systems: d.source_systems || 'Enterprise Core',
            linked_canonical_concepts: d.linked_canonical_concepts || ''
          };
        });

        onCommitKnowledge(knowledgeToCommit, mergeAliases);

        // Record in Audit Log
        const auditRec: StewardshipAuditRecord = {
          id: `audit_studio_k_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          stewardName: 'Lead Steward (You)',
          actionType: 'batch_import' as any,
          branchName: activeBranch,
          targetEntity: 'Enterprise Knowledge Base',
          details: `Staged & Enriched Import: Committed ${knowledgeToCommit.length} knowledge concepts via Ingestion Studio.`,
          idempotencyKey: `IDEMP-STUDIO-KNOWLEDGE-${Date.now()}`,
          commitHash: Math.random().toString(36).substring(2, 9),
          status: 'committed'
        };
        onAddAuditRecord(auditRec);
      }

      onShowToast(`Successfully committed ${candidateRows.length} concepts to ${targetCatalog === 'canonical' ? 'Canonical Dictionary' : 'Knowledge Base'}.`);
      setStagedRows([]);
      setBackupStagedRows(null);
      setCurrentStep(1);
    } catch (err: any) {
      alert(`Commit failed: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-2 font-sans text-slate-100">
      
      {/* Studio Header & Catalog Target Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-md">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                  <span>Smart Ingestion &amp; AI Enrichment Studio</span>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-mono font-bold">
                    Pilot Workbench
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Visual staged ingestion with gap inspection, granular step-by-step AI enrichment, and auditable governance commits.
                </p>
              </div>
            </div>
          </div>

          {/* Catalog Switcher Radio Pills */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-auto">
            <span className="text-[11px] font-mono text-slate-400 font-bold px-2">Target Registry:</span>
            <button
              type="button"
              onClick={() => handleSwitchTargetCatalog('canonical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                targetCatalog === 'canonical'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Canonical Glossary</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTargetCatalog('knowledge')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                targetCatalog === 'knowledge'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Knowledge Concepts</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Guided Pipeline Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 text-xs font-mono">
          {/* Step 1 */}
          <div 
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 1 
                ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30' 
                : stagedRows.length > 0 
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' 
                  : 'bg-slate-950/30 border-slate-900 opacity-60'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              stagedRows.length > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
            }`}>
              {stagedRows.length > 0 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <div>
              <span className="font-bold text-white block">1. Ingest &amp; Stage</span>
              <span className="text-[10px] text-slate-400">
                {fileName ? `${fileName} (${stagedRows.length} rows)` : 'Upload or paste source'}
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div 
            onClick={() => stagedRows.length > 0 && setCurrentStep(2)}
            className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
              !stagedRows.length ? 'opacity-40 cursor-not-allowed border-slate-900 bg-slate-950/30' : 'cursor-pointer'
            } ${
              currentStep === 2 
                ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30' 
                : stagedRows.length > 0 
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' 
                  : ''
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep > 2 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
            }`}>
              2
            </div>
            <div>
              <span className="font-bold text-white block">2. Structure &amp; Gaps</span>
              <span className="text-[10px] text-slate-400">
                {stagedRows.length > 0 ? `${gapMetrics.totalGaps} metadata gaps` : 'Inspect completeness'}
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div 
            onClick={() => stagedRows.length > 0 && setCurrentStep(3)}
            className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
              !stagedRows.length ? 'opacity-40 cursor-not-allowed border-slate-900 bg-slate-950/30' : 'cursor-pointer'
            } ${
              currentStep === 3 
                ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30' 
                : stagedRows.length > 0 
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' 
                  : ''
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              stagedRows.some(r => r.hasAiEnrichment) ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-300'
            }`}>
              {stagedRows.some(r => r.hasAiEnrichment) ? <Sparkles className="w-3.5 h-3.5" /> : '3'}
            </div>
            <div>
              <span className="font-bold text-white block">3. AI Enrichment &amp; Grid</span>
              <span className="text-[10px] text-slate-400">
                {stagedRows.filter(r => r.hasAiEnrichment).length > 0 
                  ? `${stagedRows.filter(r => r.hasAiEnrichment).length} rows enriched` 
                  : 'Run modular generators'}
              </span>
            </div>
          </div>

          {/* Step 4 */}
          <div 
            onClick={() => stagedRows.length > 0 && setCurrentStep(4)}
            className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
              !stagedRows.length ? 'opacity-40 cursor-not-allowed border-slate-900 bg-slate-950/30' : 'cursor-pointer'
            } ${
              currentStep === 4 
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30' 
                : stagedRows.length > 0 
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' 
                  : ''
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
              4
            </div>
            <div>
              <span className="font-bold text-white block">4. Pre-flight &amp; Commit</span>
              <span className="text-[10px] text-slate-400">
                {stagedRows.length > 0 ? `${gapMetrics.valid} ready for audit commit` : 'Audit trail registry write'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: INGESTION & SOURCE STAGING */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Step 1: Staging Input Data for {targetCatalog === 'canonical' ? 'Canonical Glossary' : 'Knowledge Base'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Upload CSV or JSON files, paste raw text, or load an instant demo enterprise dataset to start.
              </p>
            </div>

            {/* Ingestion Sub-Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInputTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputTab === 'paste' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('samples')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputTab === 'samples' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Demo Datasets</span>
              </button>
            </div>
          </div>

          {/* TAB 1: File Upload */}
          {inputTab === 'upload' && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
              >
                <div className="p-3.5 bg-indigo-600/10 group-hover:bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20 mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="font-mono text-sm font-bold text-white mb-1">
                  Click to select or drag &amp; drop file here
                </span>
                <span className="font-mono text-xs text-slate-400 max-w-sm">
                  Accepts CSV and JSON conforming to the {targetCatalog === 'canonical' ? 'Canonical Glossary' : 'Knowledge Concept'} specification.
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.json,text/csv,application/json" 
                  className="hidden" 
                />
              </div>

              {/* Template Download Shortcuts */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Need a starter template? Download reference schemas:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = activeSchema.sampleCsv;
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `semantra_${targetCatalog}_template.csv`;
                      a.click();
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download CSV Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const jsonContent = JSON.stringify(activeSchema.sampleJson, null, 2);
                      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `semantra_${targetCatalog}_template.json`;
                      a.click();
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <FileCode className="w-3 h-3" />
                    <span>Download JSON Template</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Paste Raw Text */}
          {inputTab === 'paste' && (
            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-400 font-bold block">
                Paste CSV (with header row) or JSON array:
              </label>
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={targetCatalog === 'canonical' 
                  ? 'concept_id,display_name,entity,attribute,data_type,description,aliases,business_domains\nfinancial.cost_center,Cost Center,financial,cost_center,STRING,,,' 
                  : 'concept_id,canonical_name,domain,linked_canonical_concepts\nsap_kostl,SAP Cost Center,,financial.cost_center'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!rawText.trim() || isParsing}
                  onClick={() => processRawData(rawText, 'pasted_text_input')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>Parse &amp; Stage Records</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Demo Datasets */}
          {inputTab === 'samples' && (
            <div className="p-5 bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-500/20 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-mono font-bold text-white text-sm">
                    Instant Enterprise Demo Dataset ({targetCatalog === 'canonical' ? '5 Master Concepts' : '3 Knowledge Concepts'})
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Pre-configured with deliberate real-world metadata gaps (missing business descriptions, SAP/ERP synonyms, and unclassified PII) so you can experience the step-by-step AI enrichment immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLoadSampleDataset}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-indigo-950 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Load Sample Dataset into Staging Grid</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: GAP & STRUCTURE ANALYSIS OVERVIEW */}
      {/* ========================================================================= */}
      {stagedRows.length > 0 && (currentStep === 2 || currentStep === 3) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                Staging Analysis &amp; Gap Diagnostics
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {stagedRows.length} total staged records ({gapMetrics.valid} valid against schema, {gapMetrics.invalid} invalid)
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 bg-slate-950 text-slate-300 border border-slate-800 rounded-lg">
                File: <strong>{fileName || 'Staged Data'}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setStagedRows([]);
                  setBackupStagedRows(null);
                  setCurrentStep(1);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg border border-slate-700 transition-colors"
              >
                Clear Staging
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Total Rows</span>
              <span className="text-base font-bold text-white">{gapMetrics.total}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Valid Schema</span>
              <span className="text-base font-bold text-emerald-400">{gapMetrics.valid}</span>
            </div>

            <div className={`p-3 rounded-xl border ${gapMetrics.missingDesc > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[10px] text-slate-500 block uppercase">Empty Descriptions</span>
              <span className={`text-base font-bold ${gapMetrics.missingDesc > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {gapMetrics.missingDesc}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${gapMetrics.missingAliases > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[10px] text-slate-500 block uppercase">Missing Aliases</span>
              <span className={`text-base font-bold ${gapMetrics.missingAliases > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {gapMetrics.missingAliases}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${gapMetrics.missingDomains > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[10px] text-slate-500 block uppercase">Generic Domains</span>
              <span className={`text-base font-bold ${gapMetrics.missingDomains > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {gapMetrics.missingDomains}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Enriched Rows</span>
              <span className="text-base font-bold text-purple-400">
                {stagedRows.filter(r => r.hasAiEnrichment).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: MODULAR AI ENRICHMENT ACTIONS BAR */}
      {/* ========================================================================= */}
      {stagedRows.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-xl mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-bold text-white text-sm">
                    Interactive AI Enrichment Controls
                  </h3>
                  <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded text-[10px] font-mono">
                    Inspectable • Human-in-the-Loop
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  Start specific generators individually or auto-enrich all detected gaps in one click. All outputs are staged in the review grid below.
                </p>
              </div>
            </div>

            {/* Revert Button if enrichment has been applied */}
            {backupStagedRows && (
              <button
                type="button"
                onClick={handleRevertAllEnrichment}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-mono text-xs flex items-center gap-1.5 transition-colors border border-slate-700 self-start lg:self-auto cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Revert All AI Changes</span>
              </button>
            )}
          </div>

          {/* Modular Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* 1. All Gaps */}
            <button
              type="button"
              disabled={isEnriching}
              onClick={() => executeEnrichment('all')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-mono font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              {isEnriching && activeEnrichAction === 'all' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Auto-Enrich All Gaps</span>
            </button>

            {/* 2. Definitions */}
            {targetCatalog === 'canonical' && (
              <button
                type="button"
                disabled={isEnriching}
                onClick={() => executeEnrichment('definitions')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-indigo-500 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isEnriching && activeEnrichAction === 'definitions' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                ) : (
                  <span>✍️</span>
                )}
                <span>Generate Definitions</span>
              </button>
            )}

            {/* 3. ERP Aliases */}
            {targetCatalog === 'canonical' && (
              <button
                type="button"
                disabled={isEnriching}
                onClick={() => executeEnrichment('aliases')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-indigo-500 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isEnriching && activeEnrichAction === 'aliases' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                ) : (
                  <span>🏷️</span>
                )}
                <span>Synthesize ERP Aliases</span>
              </button>
            )}

            {/* 4. Domains */}
            <button
              type="button"
              disabled={isEnriching}
              onClick={() => executeEnrichment('domains')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-indigo-500 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isEnriching && activeEnrichAction === 'domains' ? (
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
              ) : (
                <span>🌐</span>
              )}
              <span>Align Domains</span>
            </button>

            {/* 5. Canonical Links for Knowledge */}
            {targetCatalog === 'knowledge' && (
              <button
                type="button"
                disabled={isEnriching}
                onClick={() => executeEnrichment('canonical_links')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-purple-500 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isEnriching && activeEnrichAction === 'canonical_links' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                ) : (
                  <span>🔗</span>
                )}
                <span>Link Canonical Concepts</span>
              </button>
            )}

            {/* 6. PII / Privacy */}
            <button
              type="button"
              disabled={isEnriching}
              onClick={() => executeEnrichment('privacy')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-amber-500 font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isEnriching && activeEnrichAction === 'privacy' ? (
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              ) : (
                <span>🛡️</span>
              )}
              <span>Detect &amp; Tag PII</span>
            </button>
          </div>

          {/* Active summary banner */}
          {enrichmentSummary && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{enrichmentSummary}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3 & 4: FULL INTERACTIVE REVIEW GRID */}
      {/* ========================================================================= */}
      {stagedRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Staged Records Review Grid
              </h3>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono font-bold">
                {displayedRows.length} displayed
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-44"
                />
              </div>

              {/* Status Filter Chips */}
              <button
                type="button"
                onClick={() => setGridFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  gridFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                All ({stagedRows.length})
              </button>
              <button
                type="button"
                onClick={() => setGridFilter('enriched')}
                className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                  gridFilter === 'enriched' ? 'bg-purple-600 text-white border-purple-500 font-bold' : 'bg-slate-950 text-purple-300 border-slate-800'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Enriched ({stagedRows.filter(r => r.hasAiEnrichment).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGridFilter('gaps')}
                className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  gridFilter === 'gaps' ? 'bg-amber-600 text-white border-amber-500 font-bold' : 'bg-slate-950 text-amber-300 border-slate-800'
                }`}
              >
                Has Gaps
              </button>
              {gapMetrics.invalid > 0 && (
                <button
                  type="button"
                  onClick={() => setGridFilter('invalid')}
                  className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    gridFilter === 'invalid' ? 'bg-rose-600 text-white border-rose-500 font-bold' : 'bg-slate-950 text-rose-300 border-slate-800'
                  }`}
                >
                  Invalid ({gapMetrics.invalid})
                </button>
              )}
            </div>
          </div>

          {/* Data Grid Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left font-mono text-xs border-collapse min-w-[900px]">
              <thead className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 text-slate-400 text-[11px]">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Concept Identifier</th>
                  <th className="p-3">{targetCatalog === 'canonical' ? 'Display Name & Entity' : 'Canonical Name'}</th>
                  <th className="p-3">{targetCatalog === 'canonical' ? 'Business Definition' : 'Enterprise Domain'}</th>
                  <th className="p-3">{targetCatalog === 'canonical' ? 'Technical Aliases (ERP)' : 'Linked Canonical Concepts'}</th>
                  <th className="p-3">{targetCatalog === 'canonical' ? 'Domain & Type' : 'Source Systems & PII'}</th>
                  <th className="p-3 w-28 text-center">Status</th>
                  <th className="p-3 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      No records match the active search or status filter.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row) => {
                    const d = row.data;
                    return (
                      <tr 
                        key={row.rowNumber} 
                        className={`transition-colors hover:bg-slate-900/60 ${
                          !row.isValid 
                            ? 'bg-rose-950/20 text-rose-300' 
                            : row.hasAiEnrichment 
                              ? 'bg-purple-950/15' 
                              : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-500 font-bold">{row.rowNumber}</td>
                        
                        {/* Concept ID */}
                        <td className="p-3">
                          <span className="font-bold text-white block">{d.concept_id}</span>
                          {row.isUpdate && (
                            <span className="text-[10px] text-amber-400 block font-semibold">Existing in catalog</span>
                          )}
                        </td>

                        {/* Name / Entity */}
                        <td className="p-3">
                          <span className="text-slate-200 block font-medium">
                            {d.display_name || d.canonical_name || d.name}
                          </span>
                          {targetCatalog === 'canonical' && (
                            <span className="text-[10px] text-slate-500 block">
                              entity: <strong className="text-slate-400">{d.entity}</strong> • attr: <strong className="text-slate-400">{d.attribute}</strong>
                            </span>
                          )}
                        </td>

                        {/* Definition / Domain */}
                        <td className="p-3 max-w-xs">
                          {targetCatalog === 'canonical' ? (
                            d.description ? (
                              <div>
                                <span className="line-clamp-2 text-slate-300">{d.description}</span>
                                {row.aiSuggestedFields?.description && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Definition</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Empty description</span>
                            )
                          ) : (
                            <div>
                              <span className="text-slate-300">{d.domain || 'General Knowledge'}</span>
                              {row.aiSuggestedFields?.domain && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] block w-fit mt-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>AI Domain</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Aliases / Canonical Links */}
                        <td className="p-3 max-w-xs">
                          {targetCatalog === 'canonical' ? (
                            d.aliases ? (
                              <div>
                                <span className="line-clamp-2 text-slate-300 font-mono text-[11px]">{d.aliases}</span>
                                {row.aiSuggestedFields?.aliases && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Synonyms</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">No aliases</span>
                            )
                          ) : (
                            d.linked_canonical_concepts ? (
                              <div>
                                <span className="line-clamp-2 text-indigo-300 font-mono text-[11px]">{d.linked_canonical_concepts}</span>
                                {row.aiSuggestedFields?.linked_canonical_concepts && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] mt-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>AI Canonical Link</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">No links</span>
                            )
                          )}
                        </td>

                        {/* Domain / Systems & PII */}
                        <td className="p-3">
                          {targetCatalog === 'canonical' ? (
                            <div>
                              <span className="text-indigo-400 font-medium block">{d.business_domains || 'General'}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500">{d.data_type || 'STRING'}</span>
                                {(d.is_pii || d.isPII) && (
                                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] flex items-center gap-0.5">
                                    {row.aiSuggestedFields?.is_pii && <Sparkles className="w-2 h-2" />}
                                    <span>PII</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 text-[11px] truncate max-w-[140px] block">{d.source_systems}</span>
                              {d.linked_pii === 'yes' && (
                                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] inline-flex items-center gap-0.5 mt-0.5">
                                  {row.aiSuggestedFields?.linked_pii && <Sparkles className="w-2 h-2" />}
                                  <span>PII Tagged</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          {!row.isValid ? (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold">
                              INVALID
                            </span>
                          ) : row.hasAiEnrichment ? (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>ENRICHED</span>
                            </span>
                          ) : row.isUpdate ? (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">
                              UPDATE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                              NEW
                            </span>
                          )}
                        </td>

                        {/* Row Action */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedInspectRow(row)}
                              title="Inspect full row JSON"
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {row.hasAiEnrichment && backupStagedRows && (
                              <button
                                type="button"
                                onClick={() => handleRevertSingleRow(row.rowNumber)}
                                title="Revert AI for this row"
                                className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-800 transition-colors"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4 & 5: PRE-FLIGHT VERIFICATION & COMMIT TO GOVERNANCE REGISTRY */}
      {/* ========================================================================= */}
      {stagedRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Governance Pre-Flight &amp; Audit Trail Commit</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Final validation before durable promotion to the {targetCatalog === 'canonical' ? 'Canonical Glossary' : 'Enterprise Knowledge Base'}.
              </p>
            </div>

            {/* Merge Settings */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeAliases}
                  onChange={(e) => setMergeAliases(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700"
                />
                <span>Merge new aliases with existing concepts</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700"
                />
                <span>Skip invalid rows ({gapMetrics.invalid})</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 font-mono text-xs">
            <div className="text-slate-400 space-y-0.5">
              <div>
                Target Branch: <strong className="text-indigo-300 font-bold">{activeBranch}</strong>
              </div>
              <div>
                Ready to commit: <strong className="text-emerald-400 font-bold">{skipErrors ? gapMetrics.valid : stagedRows.length} concepts</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isCommitting || gapMetrics.valid === 0}
                onClick={handleCommitToCatalog}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer transition-all"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Committing to Governance Catalog...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit {gapMetrics.valid} Concepts to {targetCatalog === 'canonical' ? 'Glossary' : 'Knowledge'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row JSON Detail Inspector Modal */}
      {selectedInspectRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  Row #{selectedInspectRow.rowNumber} Inspector
                </span>
                <span className="text-slate-400">({selectedInspectRow.data.concept_id})</span>
              </div>
              <button
                onClick={() => setSelectedInspectRow(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Staged Record JSON</span>
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto text-[11px] max-h-72">
                  {JSON.stringify(selectedInspectRow.data, null, 2)}
                </pre>
              </div>

              {selectedInspectRow.aiSuggestedFields && (
                <div>
                  <span className="text-purple-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Suggested Fields &amp; Rationales</span>
                  </span>
                  <div className="mt-1 space-y-1.5">
                    {Object.entries(selectedInspectRow.aiSuggestedFields).map(([f, sugg]) => (
                      <div key={f} className="p-2 bg-purple-950/30 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <strong className="text-white">{f}</strong>
                          <span className="text-purple-300 text-[10px] font-bold">
                            {Math.round(sugg.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-slate-400 text-[10px] mt-0.5">Reason: {sugg.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedInspectRow(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
