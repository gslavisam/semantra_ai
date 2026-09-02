import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorkspaceSetup, ParsedSchema, IngestFileContentType, CompanionColMapping } from './components/WorkspaceSetup';
import { WorkspaceReview } from './components/WorkspaceReview';
import { WorkspaceDecisions } from './components/WorkspaceDecisions';
import { WorkspaceOutput } from './components/WorkspaceOutput';
import { WorkspaceBAReport } from './components/WorkspaceBAReport';
import { CatalogView } from './components/CatalogView';
import { BenchmarksView } from './components/BenchmarksView';
import { AdminView } from './components/AdminView';
import { SystemConfigView } from './components/SystemConfigView';
import { HelpModal } from './components/HelpModal';
import { ContractReverseEngineeringView } from './components/ContractReverseEngineeringView';
import { SchemaDriftStudio } from './components/SchemaDriftStudio';
import { JsonSchemaCoercionStudio } from './components/JsonSchemaCoercionStudio';
import { EntityResolutionStudio } from './components/EntityResolutionStudio';
import { TransactionalOutboxStudio } from './components/TransactionalOutboxStudio';
import { MultiProtocolTranslationStudio } from './components/MultiProtocolTranslationStudio';

import { 
  MappingRow, 
  DecisionProposal, 
  CatalogEntry, 
  BenchmarkDataset, 
  StewardshipItem, 
  CanonicalConcept,
  CorrectionRule,
  MappingMode,
  AIModelConfig,
  EnterpriseFeaturesConfig
} from './types';

import { 
  SAP_CUSTOMER_SALES_AREA_MAPPINGS,
  SAP_MATERIAL_MASTER_MAPPINGS,
  SAP_SUPPLIER_MASTER_MAPPINGS,
  GENERIC_ACCOUNT_MASTER_MAPPINGS,
  DECISION_PROPOSALS,
  CATALOG_ENTRIES,
  BENCHMARK_DATASETS,
  STEWARDSHIP_ITEMS,
  CANONICAL_CONCEPTS,
  CORRECTION_RULES
} from './data/mockData';

import { 
  FolderGit2, 
  Layers, 
  Eye, 
  Sliders, 
  FileCode2,
  FileText,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Bot,
  RotateCcw,
  Network
} from 'lucide-react';


const CUSTOMER_SALES_AREA_TARGET_FIELDS = [
  { field: 'customer_id', type: 'VARCHAR(20)', desc: 'Canonical customer identifier' },
  { field: 'customer_name', type: 'VARCHAR(120)', desc: 'Normalized customer display name' },
  { field: 'sales_organization_id', type: 'VARCHAR(10)', desc: 'Normalized sales organization identifier' },
  { field: 'distribution_channel_id', type: 'VARCHAR(10)', desc: 'Normalized distribution channel identifier' },
  { field: 'division_id', type: 'VARCHAR(10)', desc: 'Normalized division identifier' },
  { field: 'customer_group_id', type: 'VARCHAR(10)', desc: 'Normalized customer group identifier' },
  { field: 'sales_district_id', type: 'VARCHAR(10)', desc: 'Normalized sales district identifier' },
  { field: 'shipping_condition_code', type: 'VARCHAR(10)', desc: 'Shipping condition code' },
  { field: 'incoterm_code', type: 'VARCHAR(10)', desc: 'Incoterms code' },
  { field: 'incoterm_location', type: 'VARCHAR(80)', desc: 'Incoterms location' },
  { field: 'document_currency_code', type: 'VARCHAR(5)', desc: 'Document currency code' },
  { field: 'payment_terms_id', type: 'VARCHAR(10)', desc: 'Payment terms identifier' },
  { field: 'customer_pricing_procedure_code', type: 'VARCHAR(10)', desc: 'Customer pricing procedure code' },
  { field: 'price_list_type_id', type: 'VARCHAR(10)', desc: 'Price list type identifier' }
];

const MATERIAL_MASTER_TARGET_FIELDS = [
  { field: 'material_id', type: 'VARCHAR(20)', desc: 'Canonical material number' },
  { field: 'material_description', type: 'VARCHAR(255)', desc: 'Normalized description text' },
  { field: 'base_uom_code', type: 'VARCHAR(3)', desc: 'Standard ISO UOM' },
  { field: 'material_group_id', type: 'VARCHAR(10)', desc: 'Normalized catalog group ID' }
];

const SUPPLIER_MASTER_TARGET_FIELDS = [
  { field: 'supplier_id', type: 'VARCHAR(20)', desc: 'Canonical supplier unique key' },
  { field: 'supplier_name', type: 'VARCHAR(100)', desc: 'Supplier business trading name' },
  { field: 'country_iso_code', type: 'VARCHAR(3)', desc: 'ISO standard country code' }
];

const GENERIC_ACCOUNT_MASTER_TARGET_FIELDS = [
  { field: 'col_1', type: 'VARCHAR(20)', desc: 'Target account identifier with prefix semantics.' },
  { field: 'col_2', type: 'VARCHAR(100)', desc: 'Official customer or company name.' },
  { field: 'col_3', type: 'VARCHAR(2)', desc: 'Customer country code used for reporting and market segmentation.' },
  { field: 'col_4', type: 'VARCHAR(20)', desc: 'Account tier or customer service level.' },
  { field: 'col_5', type: 'DATE', desc: 'Contract or go-live date of the target customer record.' }
];

const LOCAL_STORAGE_KEY_MAPPINGS = 'semantra_mappings_v2';
const LOCAL_STORAGE_KEY_CATALOG = 'semantra_catalog_v2';
const LOCAL_STORAGE_KEY_PROPOSALS = 'semantra_proposals_v2';
const LOCAL_STORAGE_KEY_PRESET = 'semantra_preset_v2';
const LOCAL_STORAGE_KEY_STEP = 'semantra_step_v2';
const LOCAL_STORAGE_KEY_TAB = 'semantra_tab_v2';

// Helper to generate dynamic LLM decision proposals from active mappings
export function generateProposalsFromMappings(rows: MappingRow[]): DecisionProposal[] {
  if (!rows || rows.length === 0) return [];

  const subThresholdRows = rows.filter(r => r.score < 0.85 || r.confidence !== 'high');
  const highConfidenceRows = rows.filter(r => r.score >= 0.85 && r.confidence === 'high');

  const selectedRows = [...subThresholdRows, ...highConfidenceRows].slice(0, 4);

  return selectedRows.map((row, index) => {
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
}

export default function App() {
  // Top level Tab state with localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY_TAB) || 'workspace';
    } catch { return 'workspace'; }
  });
  
  // Workspace sub-steps with localStorage
  const [workspaceStep, setWorkspaceStep] = useState<any>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY_STEP) || 'setup';
    } catch { return 'setup'; }
  });
  
  // App-wide cohesive entities with localStorage
  const [mappings, setMappings] = useState<MappingRow[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MAPPINGS);
      if (saved) {
        const parsed: MappingRow[] = JSON.parse(saved);
        return parsed.map(r => ({
          ...r,
          decisionStatus: r.decisionStatus || (r.score >= 0.85 ? 'accepted' : 'needs_review'),
          isApproved: r.isApproved !== undefined ? r.isApproved : (r.score >= 0.85)
        }));
      }
      return [];
    } catch { return []; }
  });

  const [proposals, setProposals] = useState<DecisionProposal[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROPOSALS);
      return saved ? JSON.parse(saved) : DECISION_PROPOSALS;
    } catch { return DECISION_PROPOSALS; }
  });

  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CATALOG);
      const parsed: CatalogEntry[] = saved ? JSON.parse(saved) : CATALOG_ENTRIES;
      return parsed.map(e => ({
        ...e,
        reuseFitScore: e.reuseFitScore <= 1.0 ? Math.round(e.reuseFitScore * 100) : e.reuseFitScore
      }));
    } catch { return CATALOG_ENTRIES; }
  });

  const [benchmarkDatasets, setBenchmarkDatasets] = useState<BenchmarkDataset[]>(() => {
    try {
      const saved = localStorage.getItem('semantra_benchmark_datasets_v2');
      return saved ? JSON.parse(saved) : BENCHMARK_DATASETS;
    } catch { return BENCHMARK_DATASETS; }
  });

  const [hasRunActiveWorkspace, setHasRunActiveWorkspace] = useState<boolean>(() => {
    try { return localStorage.getItem('semantra_benchmark_has_run_v2') === 'true'; }
    catch { return false; }
  });

  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(() => {
    try { return localStorage.getItem('semantra_benchmark_last_run_timestamp_v2'); }
    catch { return null; }
  });

  const [selectedBenchmarkDatasetId, setSelectedBenchmarkDatasetId] = useState<string>(() => {
    try { return localStorage.getItem('semantra_benchmark_selected_dataset_id_v2') || 'active_workspace'; }
    catch { return 'active_workspace'; }
  });

  const [useGoldenMaster, setUseGoldenMaster] = useState<boolean>(() => {
    try { return localStorage.getItem('semantra_benchmark_use_golden_master_v2') === 'true'; }
    catch { return false; }
  });

  const [hasAudited, setHasAudited] = useState<boolean>(() => {
    try { return localStorage.getItem('semantra_benchmark_has_audited_v2') === 'true'; }
    catch { return false; }
  });

  const [customGoldenUploaded, setCustomGoldenUploaded] = useState<boolean>(() => {
    try { return localStorage.getItem('semantra_benchmark_custom_golden_uploaded_v2') === 'true'; }
    catch { return false; }
  });

  const [customGoldenFields, setCustomGoldenFields] = useState<{ field: string; expectedTransformation: string; desc: string }[]>(() => {
    try {
      const saved = localStorage.getItem('semantra_benchmark_custom_golden_fields_v2');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [stewardshipItems, setStewardshipItems] = useState<StewardshipItem[]>(STEWARDSHIP_ITEMS);
  const [canonicalConcepts, setCanonicalConcepts] = useState<CanonicalConcept[]>(CANONICAL_CONCEPTS);
  const [correctionRules] = useState<CorrectionRule[]>(CORRECTION_RULES);

  // AI Model Runtime Configuration
  const [aiConfig, setAiConfig] = useState<AIModelConfig>(() => {
    try {
      const saved = localStorage.getItem('semantra_ai_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.modelName === 'gemini-3.6-flash') parsed.modelName = 'gemini-3.7-flash';
        return parsed;
      }
    } catch {}
    return {
      provider: 'gemini',
      modelName: 'gemini-3.7-flash',
      temperature: 0.2,
      topP: 0.95,
      enableGuardrails: true,
      promptPacking: 'dynamic',
      systemInstruction: 'You are Semantra Bounded AI. Evaluate candidate schema mappings strictly against provided closed candidate pairs.',
      isCustomModel: false
    };
  });

  // Optional Enterprise Features (Anomaly Shield & Semantic Vector Cache)
  const [enterpriseFeatures, setEnterpriseFeatures] = useState<EnterpriseFeaturesConfig>(() => {
    try {
      const saved = localStorage.getItem('semantra_enterprise_features_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      anomalyDetection: {
        enabled: false, // Default is OFF / Optional
        zScoreThreshold: 3.0,
        movingWindowSize: 100,
        actionOnAnomaly: 'quarantine_dlq',
        isolationForestEnabled: false
      },
      semanticCache: {
        enabled: false, // Default is OFF / Optional
        similarityThreshold: 0.90,
        cacheTtlHours: 72,
        engine: 'redis_vector'
      }
    };
  });

  // Sync enterprise features to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('semantra_enterprise_features_v2', JSON.stringify(enterpriseFeatures));
    } catch {}
  }, [enterpriseFeatures]);

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY_PRESET) || 'customer_sales_area';
    } catch { return 'customer_sales_area'; }
  });

  // Custom uploaded files & parsed schemas (session persisted)
  const [parsedSourceSchema, setParsedSourceSchema] = useState<ParsedSchema | null>(() => {
    try {
      const saved = localStorage.getItem('semantra_parsed_source_schema');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [parsedTargetSchema, setParsedTargetSchema] = useState<ParsedSchema | null>(() => {
    try {
      const saved = localStorage.getItem('semantra_parsed_target_schema');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [parsedSourceCompanionSchema, setParsedSourceCompanionSchema] = useState<ParsedSchema | null>(() => {
    try {
      const saved = localStorage.getItem('semantra_parsed_source_companion_schema');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [parsedTargetCompanionSchema, setParsedTargetCompanionSchema] = useState<ParsedSchema | null>(() => {
    try {
      const saved = localStorage.getItem('semantra_parsed_target_companion_schema');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [sourceFileType, setSourceFileType] = useState<IngestFileContentType>(() => {
    try {
      return (localStorage.getItem('semantra_source_file_type') as IngestFileContentType) || 'raw_data';
    } catch { return 'raw_data'; }
  });

  const [targetFileType, setTargetFileType] = useState<IngestFileContentType>(() => {
    try {
      return (localStorage.getItem('semantra_target_file_type') as IngestFileContentType) || 'schema_data';
    } catch { return 'schema_data'; }
  });

  const [sourceAutoDetected, setSourceAutoDetected] = useState<boolean>(false);
  const [targetAutoDetected, setTargetAutoDetected] = useState<boolean>(false);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourceCompanionFile, setSourceCompanionFile] = useState<File | null>(null);
  const [targetCompanionFile, setTargetCompanionFile] = useState<File | null>(null);

  const [sourceAiSummary, setSourceAiSummary] = useState<string | null>(null);
  const [targetAiSummary, setTargetAiSummary] = useState<string | null>(null);
  const [sourceAiDomainContext, setSourceAiDomainContext] = useState<string | null>(null);
  const [targetAiDomainContext, setTargetAiDomainContext] = useState<string | null>(null);
  const [sourceCompanionStatus, setSourceCompanionStatus] = useState<string | null>(null);
  const [targetCompanionStatus, setTargetCompanionStatus] = useState<string | null>(null);

  const [sourceCompanionMapping, setSourceCompanionMapping] = useState<CompanionColMapping>({
    nameCol: 'Column',
    descCol: 'Description',
    typeCol: 'Type',
    sampleCol: 'Sample Values',
  });

  const [targetCompanionMapping, setTargetCompanionMapping] = useState<CompanionColMapping>({
    nameCol: 'Column',
    descCol: 'Description',
    typeCol: 'Type',
    sampleCol: 'Sample Values',
  });

  // Workspace Context states
  const [workspaceSourceSystem, setWorkspaceSourceSystem] = useState<string>(() => {
    try { return localStorage.getItem('semantra_workspace_source_system') || ''; }
    catch { return ''; }
  });
  const [workspaceBusinessDomain, setWorkspaceBusinessDomain] = useState<string>(() => {
    try { return localStorage.getItem('semantra_workspace_business_domain') || ''; }
    catch { return ''; }
  });
  const [workspaceIntegrationName, setWorkspaceIntegrationName] = useState<string>(() => {
    try { return localStorage.getItem('semantra_workspace_integration_name') || ''; }
    catch { return ''; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('semantra_workspace_source_system', workspaceSourceSystem); } catch (e) {}
  }, [workspaceSourceSystem]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_workspace_business_domain', workspaceBusinessDomain); } catch (e) {}
  }, [workspaceBusinessDomain]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_workspace_integration_name', workspaceIntegrationName); } catch (e) {}
  }, [workspaceIntegrationName]);

  const [activeMappingMode, setActiveMappingMode] = useState<MappingMode>('standard');
  const [workspaceMode, setWorkspaceMode] = useState<'standard' | 'reverse_engineering'>('standard');
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync state to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_MAPPINGS, JSON.stringify(mappings));
    } catch (e) { console.error(e); }
  }, [mappings]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CATALOG, JSON.stringify(catalogEntries));
    } catch (e) { console.error(e); }
  }, [catalogEntries]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROPOSALS, JSON.stringify(proposals));
    } catch (e) { console.error(e); }
  }, [proposals]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PRESET, selectedPreset);
    } catch (e) { console.error(e); }
  }, [selectedPreset]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_STEP, workspaceStep);
    } catch (e) { console.error(e); }
  }, [workspaceStep]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_TAB, activeTab);
    } catch (e) { console.error(e); }
  }, [activeTab]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_datasets_v2', JSON.stringify(benchmarkDatasets)); } catch (e) {}
  }, [benchmarkDatasets]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_has_run_v2', String(hasRunActiveWorkspace)); } catch (e) {}
  }, [hasRunActiveWorkspace]);

  React.useEffect(() => {
    try {
      if (lastRunTimestamp) {
        localStorage.setItem('semantra_benchmark_last_run_timestamp_v2', lastRunTimestamp);
      } else {
        localStorage.removeItem('semantra_benchmark_last_run_timestamp_v2');
      }
    } catch (e) {}
  }, [lastRunTimestamp]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_selected_dataset_id_v2', selectedBenchmarkDatasetId); } catch (e) {}
  }, [selectedBenchmarkDatasetId]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_use_golden_master_v2', String(useGoldenMaster)); } catch (e) {}
  }, [useGoldenMaster]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_has_audited_v2', String(hasAudited)); } catch (e) {}
  }, [hasAudited]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_custom_golden_uploaded_v2', String(customGoldenUploaded)); } catch (e) {}
  }, [customGoldenUploaded]);

  React.useEffect(() => {
    try { localStorage.setItem('semantra_benchmark_custom_golden_fields_v2', JSON.stringify(customGoldenFields)); } catch (e) {}
  }, [customGoldenFields]);

  React.useEffect(() => {
    try {
      if (parsedSourceSchema) {
        localStorage.setItem('semantra_parsed_source_schema', JSON.stringify(parsedSourceSchema));
      } else {
        localStorage.removeItem('semantra_parsed_source_schema');
      }
    } catch (e) { console.error(e); }
  }, [parsedSourceSchema]);

  React.useEffect(() => {
    try {
      if (parsedTargetSchema) {
        localStorage.setItem('semantra_parsed_target_schema', JSON.stringify(parsedTargetSchema));
      } else {
        localStorage.removeItem('semantra_parsed_target_schema');
      }
    } catch (e) { console.error(e); }
  }, [parsedTargetSchema]);

  React.useEffect(() => {
    try {
      if (parsedSourceCompanionSchema) {
        localStorage.setItem('semantra_parsed_source_companion_schema', JSON.stringify(parsedSourceCompanionSchema));
      } else {
        localStorage.removeItem('semantra_parsed_source_companion_schema');
      }
    } catch (e) { console.error(e); }
  }, [parsedSourceCompanionSchema]);

  React.useEffect(() => {
    try {
      if (parsedTargetCompanionSchema) {
        localStorage.setItem('semantra_parsed_target_companion_schema', JSON.stringify(parsedTargetCompanionSchema));
      } else {
        localStorage.removeItem('semantra_parsed_target_companion_schema');
      }
    } catch (e) { console.error(e); }
  }, [parsedTargetCompanionSchema]);

  React.useEffect(() => {
    try {
      localStorage.setItem('semantra_source_file_type', sourceFileType);
    } catch (e) { console.error(e); }
  }, [sourceFileType]);

  React.useEffect(() => {
    try {
      localStorage.setItem('semantra_target_file_type', targetFileType);
    } catch (e) { console.error(e); }
  }, [targetFileType]);

  // Publish / Promote current workspace integration into Enterprise Catalog
  const handlePublishToCatalog = () => {
    if (mappings.length === 0) return;

    const newId = `cat_user_${Date.now()}`;
    const firstField = mappings[0]?.sourceField || 'SRC';
    const isCustom = selectedPreset === 'custom_upload' || !['customer_sales_area', 'material_master', 'supplier_master', 'generic_account_master'].includes(selectedPreset);
    
    const titleName = isCustom
      ? `Custom Integration - ${firstField} (${mappings.length} Attributes)`
      : `${selectedPreset.replace(/_/g, ' ').toUpperCase()} Golden Baseline`;

    // Calculate actual fit score based on workspace mapping confidence or default high confidence
    const avgConfidence = mappings.length > 0 
      ? mappings.reduce((acc, m) => acc + (m.confidence || 0.95), 0) / mappings.length 
      : 0.96;
    
    const fitScorePct = Math.min(100, Math.max(1, Math.round(avgConfidence <= 1 ? avgConfidence * 100 : avgConfidence)));

    const newEntry: CatalogEntry = {
      id: newId,
      name: titleName,
      description: `Analyst-approved integration promoted from current Semantra workspace. Covers ${mappings.length} source attributes mapped to target schema.`,
      owner: 'Current Analyst (Slaviša M.)',
      status: 'approved',
      fieldsMapped: mappings.length,
      sourceSystem: workspaceSourceSystem || (isCustom ? 'custom_uploaded_file' : 'SAP_ECC_SD'),
      targetSystem: 'canonical_dw',
      reuseFitScore: fitScorePct,
      reuseExplanation: `${fitScorePct}% match alignment: Promoted directly after analyst verification & governance approval in Workspace Active Decisions.`,
      mappings: mappings.map(m => ({ source: m.sourceField, target: m.targetField }))
    };

    setCatalogEntries(prev => [newEntry, ...prev.filter(e => e.id !== newId)]);
  };

  // Reset workspace state back to fresh clean state
  const handleExecuteResetWorkspace = () => {
    setMappings([]);
    setSelectedPreset('customer_sales_area');
    setWorkspaceStep('setup');

    setParsedSourceSchema(null);
    setParsedTargetSchema(null);
    setParsedSourceCompanionSchema(null);
    setParsedTargetCompanionSchema(null);
    setSourceFile(null);
    setTargetFile(null);
    setSourceCompanionFile(null);
    setTargetCompanionFile(null);
    setSourceAiSummary(null);
    setTargetAiSummary(null);
    setSourceAiDomainContext(null);
    setTargetAiDomainContext(null);
    setSourceCompanionStatus(null);
    setTargetCompanionStatus(null);

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_MAPPINGS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_PRESET);
      localStorage.removeItem(LOCAL_STORAGE_KEY_STEP);
      localStorage.removeItem('semantra_parsed_source_schema');
      localStorage.removeItem('semantra_parsed_target_schema');
      localStorage.removeItem('semantra_parsed_source_companion_schema');
      localStorage.removeItem('semantra_parsed_target_companion_schema');
      localStorage.removeItem('semantra_source_file_type');
      localStorage.removeItem('semantra_target_file_type');
    } catch (e) { console.error(e); }
    setIsResetModalOpen(false);
  };


  // Trigger engine mapping execution
  const handleTriggerMapping = (mode: MappingMode, preset: string, profile: string, customMappings?: MappingRow[]) => {
    setIsMappingLoading(true);
    setSelectedPreset(preset);
    setActiveMappingMode(mode);

    setTimeout(() => {
      let seededRows: MappingRow[] = [];
      if (customMappings && customMappings.length > 0) {
        seededRows = customMappings;
      } else if (preset === 'customer_sales_area') {
        seededRows = [...SAP_CUSTOMER_SALES_AREA_MAPPINGS];
      } else if (preset === 'material_master') {
        seededRows = [...SAP_MATERIAL_MASTER_MAPPINGS];
      } else if (preset === 'supplier_master') {
        seededRows = [...SAP_SUPPLIER_MASTER_MAPPINGS];
      } else if (preset === 'generic_account_master') {
        seededRows = [...GENERIC_ACCOUNT_MASTER_MAPPINGS];
      }

      // Ensure auto-accepted status for score >= 0.85
      seededRows = seededRows.map(row => ({
        ...row,
        decisionStatus: row.decisionStatus || (row.score >= 0.85 ? 'accepted' : 'needs_review'),
        isApproved: row.isApproved !== undefined ? row.isApproved : (row.score >= 0.85)
      }));

      // If canonical mode, rewrite physical target field layout references to Virtual Concepts
      if (mode === 'canonical') {
        seededRows = seededRows.map(row => ({
          ...row,
          isVirtual: true,
          targetField: row.targetField.startsWith('CANONICAL_') ? row.targetField : `CANONICAL_${row.targetField.toUpperCase()}`,
          targetType: 'VIRTUAL_CONCEPT',
          targetDesc: `Promoted semantic central concept representation for ${row.sourceField}`
        }));
      }

      setMappings(seededRows);
      setProposals(generateProposalsFromMappings(seededRows));
      setIsMappingLoading(false);
      setWorkspaceStep('review');
    }, 1200);
  };

  // Import approved mappings from Enterprise Catalog directly
  const handleImportCatalogMappings = (entry: CatalogEntry) => {
    // Determine mapping presets from selected entry
    let presetId = 'customer_sales_area';
    if (entry.id === 'cat_2') presetId = 'material_master';
    if (entry.id === 'cat_3') presetId = 'supplier_master';
    if (entry.id === 'cat_4') presetId = 'generic_account_master';

    setSelectedPreset(presetId);
    setActiveMappingMode('standard');
    
    let importedRows: MappingRow[] = [];
    if (presetId === 'customer_sales_area') {
      importedRows = [...SAP_CUSTOMER_SALES_AREA_MAPPINGS];
    } else if (presetId === 'material_master') {
      importedRows = [...SAP_MATERIAL_MASTER_MAPPINGS];
    } else if (presetId === 'supplier_master') {
      importedRows = [...SAP_SUPPLIER_MASTER_MAPPINGS];
    } else if (presetId === 'generic_account_master') {
      importedRows = [...GENERIC_ACCOUNT_MASTER_MAPPINGS];
    }

    setMappings(importedRows);
    setProposals(generateProposalsFromMappings(importedRows));
    setActiveTab('workspace');
    setWorkspaceStep('review');
  };

  // Import reverse-engineered contract mappings from Mode 2 into Mode 1 Mapping Pipeline
  const handleImportContractMappingsToMode1 = (importedRows: MappingRow[], _sourceSys: string, _targetSys: string) => {
    setMappings(importedRows);
    setProposals(generateProposalsFromMappings(importedRows));
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_MAPPINGS, JSON.stringify(importedRows));
    } catch {}
    setWorkspaceMode('standard');
    setWorkspaceStep('review');
  };

  // Promote a proposed canonical model from Mode 2 directly to Canonical Catalog
  const handlePromoteCanonicalConcept = (concept: CanonicalConcept) => {
    setCanonicalConcepts(prev => {
      const exists = prev.some(c => c.concept_id === concept.concept_id);
      const updated = exists 
        ? prev.map(c => c.concept_id === concept.concept_id ? concept : c)
        : [concept, ...prev];
      try {
        localStorage.setItem('semantra_canonical_concepts_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Target dropdown list selector matching selectedPreset or uploaded target schema
  const getActiveTargetFields = () => {
    if (parsedTargetSchema && parsedTargetSchema.fields.length > 0) {
      return parsedTargetSchema.fields.map(f => ({
        field: f,
        type: parsedTargetSchema.fieldTypes?.[f] || 'VARCHAR(50)',
        desc: parsedTargetSchema.fieldDescriptions?.[f] || `Uploaded target attribute ${f}`
      }));
    }
    if (selectedPreset === 'material_master') return MATERIAL_MASTER_TARGET_FIELDS;
    if (selectedPreset === 'supplier_master') return SUPPLIER_MASTER_TARGET_FIELDS;
    if (selectedPreset === 'generic_account_master') return GENERIC_ACCOUNT_MASTER_TARGET_FIELDS;
    return CUSTOMER_SALES_AREA_TARGET_FIELDS;
  };

  // Render top-level Active Tab panel
  const renderTabContent = () => {
    switch (activeTab) {
      case 'workspace':
        return (
          <div className="space-y-6">
            {/* Top Workspace Integration Engine Mode Selector Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Workspace Integration Mode:</span>
                <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
                  <button
                    onClick={() => setWorkspaceMode('standard')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
                      workspaceMode === 'standard'
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mode 1: Standard Integration (Tabular &amp; Schemas)</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceMode('reverse_engineering')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
                      workspaceMode === 'reverse_engineering'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Mode 2: Contract Reverse Engineering</span>
                  </button>
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-400 self-end md:self-auto">
                {workspaceMode === 'standard' 
                  ? 'Tabular Datasets & Data Dictionaries' 
                  : 'Middleware JSON/XML Integration Contracts'}
              </span>
            </div>

            {/* Render selected workspace mode view */}
            {workspaceMode === 'reverse_engineering' ? (
              <ContractReverseEngineeringView 
                onImportToWorkspace={handleImportContractMappingsToMode1}
                onPromoteCanonicalConcept={handlePromoteCanonicalConcept}
                promotedConceptIds={canonicalConcepts.map(c => c.concept_id)}
              />
            ) : (
              <>
                {/* Steps Workflow Header */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-1">
                      <FolderGit2 className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Workspace Pipeline:</span>
                    </div>

                    {/* Sub-navigation buttons */}
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: 'setup', label: '1. Ingest Setup', icon: Layers, enabled: true },
                        { id: 'review', label: '2. Trust Review', icon: Eye, enabled: mappings.length > 0 },
                        { id: 'decisions', label: '3. Active Decisions', icon: Sliders, enabled: mappings.length > 0 },
                        { id: 'output', label: '4. Code Output', icon: FileCode2, enabled: mappings.length > 0 },
                        { id: 'ba_report', label: '5. BA Report', icon: FileText, enabled: mappings.length > 0 }
                      ].map((step) => {
                        const Icon = step.icon;
                        const isCurrent = workspaceStep === step.id;
                        const canNavigate = step.enabled;
                        return (
                          <button
                            key={step.id}
                            onClick={() => canNavigate && setWorkspaceStep(step.id as any)}
                            disabled={!canNavigate}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                              isCurrent 
                                ? 'bg-slate-900 text-white shadow-sm' 
                                : canNavigate 
                                ? 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900' 
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{step.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Far-right reset workspace button, safely isolated */}
                  {mappings.length > 0 && (
                    <button
                      onClick={() => setIsResetModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-mono font-medium text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-all flex items-center gap-1.5 shrink-0 self-end md:self-auto cursor-pointer"
                      title="Clear current workspace mapping state"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
                      <span>Reset Workspace</span>
                    </button>
                  )}
                </div>

                {/* Active Sub-step view rendering */}
                {workspaceStep === 'setup' && (
                  <WorkspaceSetup 
                    onTriggerMapping={handleTriggerMapping} 
                    isLoading={isMappingLoading} 
                    canonicalConcepts={canonicalConcepts}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    sourceFile={sourceFile}
                    setSourceFile={setSourceFile}
                    targetFile={targetFile}
                    setTargetFile={setTargetFile}
                    sourceFileType={sourceFileType}
                    setSourceFileType={setSourceFileType}
                    targetFileType={targetFileType}
                    setTargetFileType={setTargetFileType}
                    sourceAutoDetected={sourceAutoDetected}
                    setSourceAutoDetected={setSourceAutoDetected}
                    targetAutoDetected={targetAutoDetected}
                    setTargetAutoDetected={setTargetAutoDetected}
                    parsedSourceSchema={parsedSourceSchema}
                    setParsedSourceSchema={setParsedSourceSchema}
                    parsedTargetSchema={parsedTargetSchema}
                    setParsedTargetSchema={setParsedTargetSchema}
                    sourceCompanionFile={sourceCompanionFile}
                    setSourceCompanionFile={setSourceCompanionFile}
                    targetCompanionFile={targetCompanionFile}
                    setTargetCompanionFile={setTargetCompanionFile}
                    parsedSourceCompanionSchema={parsedSourceCompanionSchema}
                    setParsedSourceCompanionSchema={setParsedSourceCompanionSchema}
                    parsedTargetCompanionSchema={parsedTargetCompanionSchema}
                    setParsedTargetCompanionSchema={setParsedTargetCompanionSchema}
                    sourceAiSummary={sourceAiSummary}
                    setSourceAiSummary={setSourceAiSummary}
                    targetAiSummary={targetAiSummary}
                    setTargetAiSummary={setTargetAiSummary}
                    sourceAiDomainContext={sourceAiDomainContext}
                    setSourceAiDomainContext={setSourceAiDomainContext}
                    targetAiDomainContext={targetAiDomainContext}
                    setTargetAiDomainContext={setTargetAiDomainContext}
                    sourceCompanionStatus={sourceCompanionStatus}
                    setSourceCompanionStatus={setSourceCompanionStatus}
                    targetCompanionStatus={targetCompanionStatus}
                    setTargetCompanionStatus={setTargetCompanionStatus}
                    sourceCompanionMapping={sourceCompanionMapping}
                    setSourceCompanionMapping={setSourceCompanionMapping}
                    targetCompanionMapping={targetCompanionMapping}
                    setTargetCompanionMapping={setTargetCompanionMapping}
                    workspaceSourceSystem={workspaceSourceSystem}
                    setWorkspaceSourceSystem={setWorkspaceSourceSystem}
                    workspaceBusinessDomain={workspaceBusinessDomain}
                    setWorkspaceBusinessDomain={setWorkspaceBusinessDomain}
                    workspaceIntegrationName={workspaceIntegrationName}
                    setWorkspaceIntegrationName={setWorkspaceIntegrationName}
                  />
                )}
                {workspaceStep === 'review' && (
                  <WorkspaceReview mappings={mappings} setMappings={setMappings} onNextStep={() => setWorkspaceStep('decisions')} />
                )}
                {workspaceStep === 'decisions' && (
                  <WorkspaceDecisions 
                    mappings={mappings} 
                    setMappings={setMappings} 
                    proposals={proposals} 
                    setProposals={setProposals} 
                    onNextStep={() => setWorkspaceStep('output')}
                    targetFields={getActiveTargetFields()}
                  />
                )}
                {workspaceStep === 'output' && (
                  <WorkspaceOutput 
                    mappings={mappings} 
                    selectedPreset={selectedPreset} 
                    onPublishToCatalog={handlePublishToCatalog}
                    onUpdateMappings={setMappings}
                    enterpriseFeatures={enterpriseFeatures}
                  />
                )}
                {workspaceStep === 'ba_report' && (
                  <WorkspaceBAReport 
                    mappings={mappings} 
                    selectedPreset={selectedPreset} 
                    aiConfig={aiConfig}
                    enterpriseFeatures={enterpriseFeatures}
                  />
                )}
              </>
            )}
          </div>
        );

      case 'catalog':
        return (
          <CatalogView 
            catalogEntries={catalogEntries} 
            onImportMappings={handleImportCatalogMappings} 
            onUpdateCatalog={setCatalogEntries}
          />
        );

      case 'benchmarks':
        return (
          <BenchmarksView 
            benchmarkDatasets={benchmarkDatasets} 
            setBenchmarkDatasets={setBenchmarkDatasets}
            correctionRules={correctionRules}
            mappings={mappings}
            selectedPreset={selectedPreset}
            onUpdateMappings={setMappings}
            hasRunActiveWorkspace={hasRunActiveWorkspace}
            setHasRunActiveWorkspace={setHasRunActiveWorkspace}
            lastRunTimestamp={lastRunTimestamp}
            setLastRunTimestamp={setLastRunTimestamp}
            selectedDatasetId={selectedBenchmarkDatasetId}
            setSelectedDatasetId={setSelectedBenchmarkDatasetId}
            useGoldenMaster={useGoldenMaster}
            setUseGoldenMaster={setUseGoldenMaster}
            hasAudited={hasAudited}
            setHasAudited={setHasAudited}
            customGoldenUploaded={customGoldenUploaded}
            setCustomGoldenUploaded={setCustomGoldenUploaded}
            customGoldenFields={customGoldenFields}
            setCustomGoldenFields={setCustomGoldenFields}
          />
        );

      case 'admin':
        return (
          <AdminView 
            canonicalConcepts={canonicalConcepts} 
            setCanonicalConcepts={setCanonicalConcepts}
            stewardshipItems={stewardshipItems} 
            setStewardshipItems={setStewardshipItems}
          />
        );

      case 'system':
        return (
          <SystemConfigView 
            aiConfig={aiConfig}
            setAiConfig={setAiConfig}
            enterpriseFeatures={enterpriseFeatures}
            setEnterpriseFeatures={setEnterpriseFeatures}
          />
        );

      case 'schema_drift':
        return <SchemaDriftStudio />;

      case 'type_coercion':
        return <JsonSchemaCoercionStudio />;

      case 'entity_resolution':
        return <EntityResolutionStudio />;

      case 'transactional_outbox':
        return <TransactionalOutboxStudio />;

      case 'protocol_translation':
        return <MultiProtocolTranslationStudio />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        workspaceStep={workspaceStep}
        setActiveTab={setActiveTab} 
        activeModelName={aiConfig.modelName} 
        onOpenHelp={() => setIsHelpOpen(true)}
        mappingCount={mappings.length}
        lowConfidenceCount={mappings.filter(m => m.confidence === 'Low' || m.confidence === 'Medium').length}
        selectedPreset={selectedPreset}
      />

      {/* Main Layout Container */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
              {activeTab} console
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Active AI Model Badge */}
            <button
              onClick={() => setActiveTab('system')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-100 bg-indigo-50/60 text-xs font-mono font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              title="Click to configure AI Model & OpenAPI specs"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-600" />
              <span>Model: {aiConfig.modelName}</span>
            </button>

            {/* Quick Audit status tag */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-150 bg-slate-50 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Workspace Local DB Connected</span>
            </div>
            <div 
              className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono font-bold flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-slate-800 transition-colors"
              title="Analyst / Data Steward User Profile"
            >
              A
            </div>
          </div>
        </header>


        {/* Dynamic Inner Panel Workspace */}
        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {renderTabContent()}
        </div>
      </main>

      {/* Global Help Documentation Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Reset Workspace Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 font-sans">Reset Workspace State?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Are you sure you want to reset the current workspace? All active mappings, uploaded source data, and temporary review decisions will be cleared.
              </p>
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResetWorkspace}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer font-sans"
                >
                  Reset Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
