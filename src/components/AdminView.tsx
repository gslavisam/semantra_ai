import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  HelpCircle, 
  Check, 
  X, 
  BookOpen, 
  Layers, 
  Info,
  Sliders,
  CheckCircle2,
  Trash2,
  UserCheck,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Filter,
  Sparkles,
  Database,
  FileText,
  Server,
  Copy,
  Maximize2,
  GitBranch,
  GitMerge,
  GitCommit,
  GitPullRequest,
  TrendingUp,
  Plus,
  Play,
  AlertTriangle,
  History,
  Clock,
  Lock,
  FileDown,
  ArrowRight,
  CheckCheck
} from 'lucide-react';
import { 
  CanonicalConcept, 
  StewardshipItem, 
  KnowledgeConcept,
  BranchDefinition,
  MergeConflictItem,
  StewardshipAuditRecord
} from '../types';
import { KNOWLEDGE_CONCEPTS as DEFAULT_KNOWLEDGE_CONCEPTS } from '../data/mockData';

interface OverlayRule {
  id: string;
  source_system: string;
  source_field: string;
  target_canonical_concept: string;
  override_type: 'alias_promotion' | 'domain_override' | 'pii_tag' | 'type_mapping';
  steward: string;
  status: 'active' | 'inactive';
  created_at: string;
  notes: string;
}

interface AdminViewProps {
  canonicalConcepts: CanonicalConcept[];
  setCanonicalConcepts: React.Dispatch<React.SetStateAction<CanonicalConcept[]>>;
  stewardshipItems: StewardshipItem[];
  setStewardshipItems: React.Dispatch<React.SetStateAction<StewardshipItem[]>>;
}

export const AdminView: React.FC<AdminViewProps> = ({ 
  canonicalConcepts, 
  setCanonicalConcepts,
  stewardshipItems,
  setStewardshipItems
}) => {
  const [activeSection, setActiveSection] = useState<'Canonical' | 'Knowledge' | 'Overlays & Runtime' | 'Stewardship' | 'Audit Trail'>('Canonical');
  const [conceptSearch, setConceptSearch] = useState('');
  const [conceptFocus, setConceptFocus] = useState('All concepts');
  const [selectedSourceSystem, setSelectedSourceSystem] = useState('All source systems');
  const [selectedBusinessDomain, setSelectedBusinessDomain] = useState('All business domains');
  const [isGlossaryExpanded, setIsGlossaryExpanded] = useState(true);

  // Branching & Draft Overlays State for Canonical Dictionary
  const [activeBranch, setActiveBranch] = useState<string>('main');
  const [branchesList, setBranchesList] = useState<BranchDefinition[]>([
    {
      id: 'main',
      name: 'main',
      description: 'Production Canonical Business Model (v1.2)',
      author: 'Data Stewardship Board',
      status: 'production',
      baseBranch: 'main',
      pendingChangesCount: 0,
      benchmarkDeltaPct: 0.0,
      lastUpdated: '2026-08-20 14:20',
      commitHash: 'c7a91f2',
      stagedRules: [],
      conceptOverrides: {}
    },
    {
      id: 'draft/v1.3-procurement',
      name: 'draft/v1.3-procurement',
      description: 'Draft Overlay: SAP PIR & Supplier Master Alias Standardization',
      author: 'Slaviša M. (Lead Steward)',
      status: 'draft_overlay',
      baseBranch: 'main',
      pendingChangesCount: 4,
      benchmarkDeltaPct: +3.8,
      lastUpdated: '2026-08-22 11:45',
      commitHash: 'b4e82d1',
      stagedRules: [
        {
          id: 'rule_pir_1',
          source_system: 'SAP S/4HANA',
          source_field: 'EINA-INFNR',
          target_canonical_concept: 'purchasing_info_record_id',
          override_type: 'alias_promotion',
          steward: 'Slaviša M.',
          status: 'active',
          created_at: '2026-08-22',
          notes: 'Promote EINA Purchasing Info Record to Canonical Key'
        }
      ],
      conceptOverrides: {
        'supplier_id': {
          data_type: 'VARCHAR(32)',
          base_aliases: 'LIFNR, VendorId, SupplierCode, LFA1_LIFNR, EKKO_LIFNR, GlobalVendorCode'
        }
      }
    },
    {
      id: 'draft/sap-customer-overlay',
      name: 'draft/sap-customer-overlay',
      description: 'Draft Overlay: KUNNR & Sales Org Canonical Taxonomy Boost',
      author: 'Ana K. (Data Architect)',
      status: 'draft_overlay',
      baseBranch: 'main',
      pendingChangesCount: 2,
      benchmarkDeltaPct: +1.5,
      lastUpdated: '2026-08-21 16:10',
      commitHash: 'e9182ac',
      stagedRules: [],
      conceptOverrides: {
        'customer_id': {
          base_aliases: 'KUNNR, CustomerCode, CustID, KNA1_KUNNR, SoldToParty, DebtorAccount'
        }
      }
    }
  ]);

  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [newBranchBase, setNewBranchBase] = useState('main');
  const [isTestingBenchmark, setIsTestingBenchmark] = useState(false);
  const [branchNoticeMessage, setBranchNoticeMessage] = useState<string | null>(null);

  // 3-Way Merge Conflict Resolution Wizard State
  const [isMergeConflictModalOpen, setIsMergeConflictModalOpen] = useState(false);
  const [activeConflicts, setActiveConflicts] = useState<MergeConflictItem[]>([]);
  const [mergeCommitMessage, setMergeCommitMessage] = useState('');
  const [mergeIdempotencyKey, setMergeIdempotencyKey] = useState('');
  const [isMergingExecution, setIsMergingExecution] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<StewardshipAuditRecord[]>([
    {
      id: 'audit_init_1',
      timestamp: '2026-08-20 14:20:11',
      stewardName: 'Data Stewardship Board',
      actionType: 'overlay_promoted',
      branchName: 'main',
      targetEntity: 'Customer Master',
      details: 'Promoted base SAP S/4HANA KUNNR alias mapping to canonical v1.2 index',
      idempotencyKey: 'IDEMP-INIT-PROD-001',
      commitHash: 'c7a91f2',
      status: 'committed'
    },
    {
      id: 'audit_init_2',
      timestamp: '2026-08-21 09:15:34',
      stewardName: 'Ana K. (Data Architect)',
      actionType: 'branch_created',
      branchName: 'draft/sap-customer-overlay',
      targetEntity: 'Customer / Sales Org',
      details: 'Created isolated draft overlay branch for sales org taxonomies and KUNNR expansion',
      idempotencyKey: 'IDEMP-BR-CREATE-9921',
      commitHash: 'e9182ac',
      status: 'committed'
    },
    {
      id: 'audit_init_3',
      timestamp: '2026-08-22 08:30:00',
      stewardName: 'Slaviša M. (Lead Steward)',
      actionType: 'branch_created',
      branchName: 'draft/v1.3-procurement',
      targetEntity: 'Supplier / Material / PIR',
      details: 'Initiated draft procurement branch with SAP PIR and vendor master overlays',
      idempotencyKey: 'IDEMP-BR-CREATE-8812',
      commitHash: 'b4e82d1',
      status: 'committed'
    }
  ]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('all');

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const formattedName = newBranchName.startsWith('draft/') ? newBranchName.trim() : `draft/${newBranchName.trim()}`;
    const hash = Math.random().toString(36).substring(2, 9);
    const newB: BranchDefinition = {
      id: formattedName,
      name: formattedName,
      description: newBranchDesc.trim() || 'Custom Draft Overlay Branch',
      author: 'Data Steward (You)',
      status: 'draft_overlay',
      baseBranch: newBranchBase,
      pendingChangesCount: 1,
      benchmarkDeltaPct: +0.8,
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '),
      commitHash: hash,
      stagedRules: [],
      conceptOverrides: {}
    };
    setBranchesList(prev => [...prev, newB]);
    setActiveBranch(formattedName);
    setIsCreateBranchModalOpen(false);
    setNewBranchName('');
    setNewBranchDesc('');
    
    // Record audit
    const auditRec: StewardshipAuditRecord = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      stewardName: 'Data Steward (You)',
      actionType: 'branch_created',
      branchName: formattedName,
      targetEntity: 'Canonical Model',
      details: `Created new draft overlay branch from base "${newBranchBase}"`,
      idempotencyKey: `IDEMP-BR-NEW-${hash.toUpperCase()}`,
      commitHash: hash,
      status: 'committed'
    };
    setAuditLogs(prev => [auditRec, ...prev]);

    setBranchNoticeMessage(`Created new Draft Overlay Branch "${formattedName}". Ready for benchmark testing and rule staging.`);
    setTimeout(() => setBranchNoticeMessage(null), 5000);
  };

  const handleTestBenchmark = () => {
    setIsTestingBenchmark(true);
    setTimeout(() => {
      setIsTestingBenchmark(false);
      setBranchNoticeMessage(`Benchmark suite run completed for branch "${activeBranch}". Evaluated 142 gold test cases: +3.8% fit score improvement verified!`);
      setTimeout(() => setBranchNoticeMessage(null), 6000);
    }, 1200);
  };

  // Open 3-Way Merge Conflict Resolution Wizard
  const handleOpenMergeWizard = () => {
    if (activeBranch === 'main') return;
    const branch = branchesList.find(b => b.id === activeBranch);
    if (!branch) return;

    // Generate realistic, tangible merge conflicts based on branch
    let generatedConflicts: MergeConflictItem[] = [];

    if (activeBranch.includes('procurement')) {
      generatedConflicts = [
        {
          id: 'conflict_proc_1',
          conceptId: 'supplier_id',
          conceptDisplayName: 'Supplier Master (supplier_id)',
          propertyKey: 'data_type',
          propertyLabel: 'Data Type Definition',
          mainValue: 'VARCHAR(10)',
          incomingValue: 'VARCHAR(32)',
          conflictDescription: 'Main production restricts vendor numbers to 10 chars. Draft branch expands to 32 chars for international BP format.',
          resolution: 'accept_incoming',
          resolved: true
        },
        {
          id: 'conflict_proc_2',
          conceptId: 'supplier_id',
          conceptDisplayName: 'Supplier Master (supplier_id)',
          propertyKey: 'base_aliases',
          propertyLabel: 'Base Synonym Aliases',
          mainValue: 'LIFNR, VendorId, SupplierCode',
          incomingValue: 'LIFNR, VendorId, SupplierCode, LFA1_LIFNR, EKKO_LIFNR, GlobalVendorCode',
          conflictDescription: 'Incoming branch appends explicit SAP table prefixes (LFA1, EKKO) and GlobalVendorCode to dictionary.',
          resolution: 'accept_incoming',
          resolved: true
        },
        {
          id: 'conflict_proc_3',
          conceptId: 'tax_id',
          conceptDisplayName: 'Tax Identification Number (tax_id)',
          propertyKey: 'source_systems',
          propertyLabel: 'Associated Source Systems',
          mainValue: 'SAP, Oracle EBS',
          incomingValue: 'SAP, Oracle EBS, Workday, Coupa Procurement',
          conflictDescription: 'Draft branch links Coupa & Workday procurement source systems to canonical tax concept.',
          resolution: 'accept_incoming',
          resolved: true
        }
      ];
    } else {
      generatedConflicts = [
        {
          id: 'conflict_cust_1',
          conceptId: 'customer_id',
          conceptDisplayName: 'Customer Master (customer_id)',
          propertyKey: 'base_aliases',
          propertyLabel: 'Base Synonym Aliases',
          mainValue: 'KUNNR, CustomerCode, CustID',
          incomingValue: 'KUNNR, CustomerCode, CustID, KNA1_KUNNR, SoldToParty, DebtorAccount',
          conflictDescription: 'Incoming branch introduces CRM & SAP SoldToParty aliases.',
          resolution: 'accept_incoming',
          resolved: true
        },
        {
          id: 'conflict_cust_2',
          conceptId: 'sales_organization',
          conceptDisplayName: 'Sales Organization (sales_org)',
          propertyKey: 'data_type',
          propertyLabel: 'Data Type Definition',
          mainValue: 'VARCHAR(4)',
          incomingValue: 'VARCHAR(10)',
          conflictDescription: 'Main restricts sales org to standard 4-char SAP code. Draft expands to 10 chars for multi-subsidiary mapping.',
          resolution: 'accept_incoming',
          resolved: true
        }
      ];
    }

    setActiveConflicts(generatedConflicts);
    setMergeCommitMessage(`Merge draft branch "${activeBranch}" into main production with resolved overlay invariants`);
    setMergeIdempotencyKey(`IDEMP-MERGE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setIsMergeConflictModalOpen(true);
  };

  // Change individual conflict resolution
  const handleSetConflictResolution = (conflictId: string, resolution: 'keep_main' | 'accept_incoming' | 'custom', customVal?: any) => {
    setActiveConflicts(prev => prev.map(c => {
      if (c.id === conflictId) {
        return {
          ...c,
          resolution,
          customValue: customVal !== undefined ? customVal : c.customValue,
          resolved: true
        };
      }
      return c;
    }));
  };

  // Execute Idempotent Merge Commit
  const handleExecuteMergeCommit = () => {
    setIsMergingExecution(true);
    const branchToMerge = activeBranch;
    const commitHash = `commit-${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setTimeout(() => {
      // 1. Apply resolutions to canonicalConcepts
      setCanonicalConcepts(prev => prev.map(concept => {
        const matchingConflicts = activeConflicts.filter(c => c.conceptId === concept.concept_id || c.conceptId === concept.id);
        if (matchingConflicts.length === 0) return concept;

        let updated = { ...concept };
        matchingConflicts.forEach(conf => {
          const finalVal = conf.resolution === 'accept_incoming' 
            ? conf.incomingValue 
            : conf.resolution === 'custom' 
              ? conf.customValue 
              : conf.mainValue;
          
          (updated as any)[conf.propertyKey] = finalVal;
        });
        return updated;
      }));

      // 2. Remove draft branch from list & switch to main
      setBranchesList(prev => prev.filter(b => b.id !== branchToMerge));
      setActiveBranch('main');

      // 3. Record in Audit Log
      const newAuditRecord: StewardshipAuditRecord = {
        id: `audit_${Date.now()}`,
        timestamp,
        stewardName: 'Data Steward (Slaviša M.)',
        actionType: 'branch_merged',
        branchName: branchToMerge,
        targetEntity: 'Production Canonical Glossary (v1.3)',
        details: `${mergeCommitMessage} (${activeConflicts.length} conflicts resolved). Idempotency Key: ${mergeIdempotencyKey}`,
        idempotencyKey: mergeIdempotencyKey,
        commitHash,
        status: 'committed'
      };
      setAuditLogs(prev => [newAuditRecord, ...prev]);

      setIsMergingExecution(false);
      setIsMergeConflictModalOpen(false);
      setBranchNoticeMessage(`Successfully executed 3-way merge of "${branchToMerge}" into main production! Commit: ${commitHash} [${mergeIdempotencyKey}]`);
      setTimeout(() => setBranchNoticeMessage(null), 7000);
    }, 900);
  };
  
  // Knowledge state
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeConcept[]>(DEFAULT_KNOWLEDGE_CONCEPTS);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeFocus, setKnowledgeFocus] = useState('All concepts');
  const [knowledgeSourceSystem, setKnowledgeSourceSystem] = useState('All source systems');
  const [registrySource, setRegistrySource] = useState('All sources');
  const [isKnowledgeRegistryExpanded, setIsKnowledgeRegistryExpanded] = useState(false);
  const [isKnowledgeConceptRegistryExpanded, setIsKnowledgeConceptRegistryExpanded] = useState(true);
  const [isRefreshingKnowledge, setIsRefreshingKnowledge] = useState(false);
  const [isRefreshingAudit, setIsRefreshingAudit] = useState(false);

  const [selectedOverlay, setSelectedOverlay] = useState('sap_best_plus_weak_promotion_overlay.csv');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline' | 'loading'>('loading');

  // Resizable column widths
  const [canonicalWidths, setCanonicalWidths] = useState<Record<string, number>>({
    concept_id: 170,
    display_name: 170,
    entity: 120,
    attribute: 120,
    data_type: 100,
    source: 90,
    usage_count: 100,
    field_context_count: 140,
    active_overlay_entry_count: 160,
    source_systems: 180,
    business_domains: 180,
    base_aliases: 240
  });

  const [knowledgeWidths, setKnowledgeWidths] = useState<Record<string, number>>({
    concept_id: 180,
    canonical_name: 180,
    domain: 140,
    source: 110,
    editable: 90,
    linked_pii: 90,
    linked_gdpr_special: 140,
    linked_pii_tags: 130,
    linked_data_subjects: 140,
    alias_count: 100,
    field_context_count: 140,
    linked_canonical_concept_count: 160,
    source_systems: 180,
    linked_canonical_concepts: 220
  });

  // Selected cell inspector for Streamlit-style cell view popover
  const [selectedCell, setSelectedCell] = useState<{
    cellId: string;
    tableName: string;
    conceptId: string;
    columnLabel: string;
    value: any;
  } | null>(null);
  const [copiedCell, setCopiedCell] = useState(false);

  // Column drag-to-resize handler
  const handleColumnResize = (
    tableType: 'canonical' | 'knowledge',
    colKey: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialWidth = tableType === 'canonical' 
      ? (canonicalWidths[colKey] || 140) 
      : (knowledgeWidths[colKey] || 140);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(70, initialWidth + deltaX);

      if (tableType === 'canonical') {
        setCanonicalWidths(prev => ({ ...prev, [colKey]: newWidth }));
      } else {
        setKnowledgeWidths(prev => ({ ...prev, [colKey]: newWidth }));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Active overlays state
  const [activeOverlayFiles, setActiveOverlayFiles] = useState<Record<string, boolean>>({
    'sap_best_plus_weak_promotion_overlay.csv': true,
    'hrdh_knowledge_overlay.csv': true,
    'qb_knowledge_overlay.csv': false
  });

  const [inspectOverlayFile, setInspectOverlayFile] = useState<string>('sap_best_plus_weak_promotion_overlay.csv');
  const [overlaySearch, setOverlaySearch] = useState<string>('');

  // Sample rules for each overlay file
  const [overlayRulesData, setOverlayRulesData] = useState<Record<string, OverlayRule[]>>({
    'sap_best_plus_weak_promotion_overlay.csv': [
      { id: 'ov_sap_1', source_system: 'SAP ECC SD', source_field: 'KUNNR', target_canonical_concept: 'customer_id', override_type: 'alias_promotion', steward: 'Enterprise Data Lead', status: 'active', created_at: '2026-06-12', notes: 'Promoted from SAP Customer Master sales area mappings' },
      { id: 'ov_sap_2', source_system: 'SAP ECC SD', source_field: 'VKORG', target_canonical_concept: 'sales_organization_id', override_type: 'domain_override', steward: 'SAP Governance Team', status: 'active', created_at: '2026-06-14', notes: 'Maps directly to Org hierarchy baseline' },
      { id: 'ov_sap_3', source_system: 'SAP ECC SD', source_field: 'VTWEG', target_canonical_concept: 'distribution_channel', override_type: 'alias_promotion', steward: 'Commercial Operations', status: 'active', created_at: '2026-06-15', notes: 'Weak promotion candidate validated by steward' },
      { id: 'ov_sap_4', source_system: 'SAP ECC SD', source_field: 'SPART', target_canonical_concept: 'division_code', override_type: 'alias_promotion', steward: 'Enterprise Data Lead', status: 'active', created_at: '2026-06-18', notes: 'Maps division split across multi-company setup' },
      { id: 'ov_sap_5', source_system: 'SAP ECC MM', source_field: 'MATNR', target_canonical_concept: 'material_number', override_type: 'pii_tag', steward: 'Supply Chain Steward', status: 'active', created_at: '2026-06-20', notes: 'Non-PII product master identifier' },
      { id: 'ov_sap_6', source_system: 'SAP ECC SD', source_field: 'NETWR', target_canonical_concept: 'net_sales_val', override_type: 'type_mapping', steward: 'Finance Analytics', status: 'active', created_at: '2026-06-22', notes: 'Decimal currency precision override' },
      { id: 'ov_sap_7', source_system: 'SAP ECC FI', source_field: 'BUKRS', target_canonical_concept: 'company_code', override_type: 'domain_override', steward: 'Finance Steward', status: 'active', created_at: '2026-06-25', notes: 'Legal entity identifier' },
      { id: 'ov_sap_8', source_system: 'SAP ECC SD', source_field: 'BSTNK', target_canonical_concept: 'customer_po_number', override_type: 'alias_promotion', steward: 'Order Management Lead', status: 'active', created_at: '2026-07-01', notes: 'Purchase order reference string' }
    ],
    'hrdh_knowledge_overlay.csv': [
      { id: 'ov_hr_1', source_system: 'Workday HR', source_field: 'WORKER_ID', target_canonical_concept: 'employee_id', override_type: 'pii_tag', steward: 'HR Compliance Lead', status: 'active', created_at: '2026-05-10', notes: 'Strict GDPR PII Tag linked to HR Data Subjects' },
      { id: 'ov_hr_2', source_system: 'Workday HR', source_field: 'FIRST_NAME', target_canonical_concept: 'first_name', override_type: 'pii_tag', steward: 'HR Compliance Lead', status: 'active', created_at: '2026-05-11', notes: 'Explicit PII name mapping' },
      { id: 'ov_hr_3', source_system: 'Workday HR', source_field: 'LAST_NAME', target_canonical_concept: 'last_name', override_type: 'pii_tag', steward: 'HR Compliance Lead', status: 'active', created_at: '2026-05-11', notes: 'Explicit PII surname mapping' },
      { id: 'ov_hr_4', source_system: 'Workday HR', source_field: 'COST_CENTER_CODE', target_canonical_concept: 'cost_center_id', override_type: 'domain_override', steward: 'Finance/HR Liaison', status: 'active', created_at: '2026-05-15', notes: 'Shared organizational cost center code' },
      { id: 'ov_hr_5', source_system: 'Workday HR', source_field: 'DEPT_ID', target_canonical_concept: 'department_id', override_type: 'alias_promotion', steward: 'People Analytics', status: 'active', created_at: '2026-05-20', notes: 'Department taxonomy alignment' }
    ],
    'qb_knowledge_overlay.csv': [
      { id: 'ov_qb_1', source_system: 'QuickBooks Online', source_field: 'TxnID', target_canonical_concept: 'transaction_id', override_type: 'type_mapping', steward: 'SME Accounting Team', status: 'active', created_at: '2026-04-01', notes: 'String UUID key from QB REST API' },
      { id: 'ov_qb_2', source_system: 'QuickBooks Online', source_field: 'CustomerRef_ListID', target_canonical_concept: 'customer_id', override_type: 'alias_promotion', steward: 'SME Accounting Team', status: 'active', created_at: '2026-04-02', notes: 'QuickBooks internal customer list ID' },
      { id: 'ov_qb_3', source_system: 'QuickBooks Online', source_field: 'Amount', target_canonical_concept: 'transaction_amount', override_type: 'type_mapping', steward: 'Finance Lead', status: 'active', created_at: '2026-04-05', notes: 'Double decimal currency field' },
      { id: 'ov_qb_4', source_system: 'QuickBooks Online', source_field: 'AccountRef_FullName', target_canonical_concept: 'account_name', override_type: 'domain_override', steward: 'Finance Lead', status: 'active', created_at: '2026-04-08', notes: 'Chart of Accounts text representation' }
    ]
  });
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const canonicalRes = await fetch('/api/knowledge/canonical-concepts');
        if (canonicalRes.ok) {
          const canonicalData = await canonicalRes.json();
          if (Array.isArray(canonicalData) && canonicalData.length > 0) {
            setCanonicalConcepts(canonicalData.map((c: any, idx: number) => ({
              id: c.concept_id || `con_${idx}`,
              concept_id: c.concept_id,
              display_name: c.display_name || c.concept_id,
              entity: c.entity || c.concept_id.split('.')[0] || '',
              attribute: c.attribute || c.concept_id.split('.')[1] || '',
              data_type: c.data_type || 'varchar',
              source: c.source || 'base',
              usage_count: c.usage_count || 0,
              field_context_count: c.field_context_count || 0,
              active_overlay_entry_count: c.active_overlay_entry_count || 0,
              source_systems: Array.isArray(c.source_systems) ? c.source_systems.join(', ') : c.source_systems || '',
              business_domains: Array.isArray(c.business_domains) ? c.business_domains.join(', ') : c.business_domains || '',
              base_aliases: Array.isArray(c.base_aliases) ? c.base_aliases.join(', ') : c.base_aliases || ''
            })));
            setBackendStatus('connected');
          }
        }

        const knowledgeRes = await fetch('/api/knowledge/concepts');
        if (knowledgeRes.ok) {
          const knowledgeData = await knowledgeRes.json();
          if (Array.isArray(knowledgeData) && knowledgeData.length > 0) {
            setKnowledgeList(knowledgeData.map((k: any, idx: number) => ({
              id: k.id || `k_${idx}`,
              concept_id: k.concept_id || k.name,
              canonical_name: k.canonical_name || k.display_name || k.concept_id,
              domain: k.domain || 'General',
              source: k.source || 'derived_runtime',
              editable: k.editable ? 'yes' : 'no',
              linked_pii: k.linked_pii ? 'yes' : 'no',
              linked_gdpr_special: k.linked_gdpr_special ? 'yes' : 'no',
              linked_pii_tags: k.linked_pii_tags || '',
              linked_data_subjects: k.linked_data_subjects || '',
              alias_count: k.alias_count || 0,
              field_context_count: k.field_context_count || 0,
              linked_canonical_concept_count: k.linked_canonical_concept_count || 0,
              source_systems: Array.isArray(k.source_systems) ? k.source_systems.join(', ') : k.source_systems || '',
              linked_canonical_concepts: Array.isArray(k.linked_canonical_concepts) ? k.linked_canonical_concepts.join(', ') : k.linked_canonical_concepts || ''
            })));
            setBackendStatus('connected');
          }
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    };

    fetchBackendData();
  }, []);

  // Unique source systems for Canonical dropdown filter
  const canonicalSourceSystemOptions = React.useMemo(() => {
    const set = new Set<string>();
    canonicalConcepts.forEach(c => {
      if (c.source_systems) {
        c.source_systems.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    ['SAP', 'SAP ECC', 'SAP S/4HANA', 'Workday', 'Workday HR', 'Salesforce', 'Salesforce CRM', 'Oracle EBS', 'NetSuite', 'QuickBooks', 'QAD'].forEach(s => set.add(s));
    return Array.from(set).sort();
  }, [canonicalConcepts]);

  // Unique source systems for Knowledge dropdown filter
  const knowledgeSourceSystemOptions = React.useMemo(() => {
    const set = new Set<string>();
    knowledgeList.forEach(k => {
      if (k.source_systems) {
        k.source_systems.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    ['SAP', 'SAP ECC', 'SAP S/4HANA', 'Workday', 'Workday HR', 'Salesforce', 'Salesforce CRM', 'QAD', 'Oracle EBS', 'NetSuite', 'QuickBooks'].forEach(s => set.add(s));
    return Array.from(set).sort();
  }, [knowledgeList]);

  // Filter knowledge concepts
  const filteredKnowledge = knowledgeList.filter((k) => {
    const query = knowledgeSearch.toLowerCase();
    const matchesSearch = !query ||
      k.concept_id.toLowerCase().includes(query) ||
      k.canonical_name.toLowerCase().includes(query) ||
      k.domain.toLowerCase().includes(query) ||
      k.linked_canonical_concepts.toLowerCase().includes(query);

    const isEditable = k.editable === 'yes' || (k as any).editable === true;
    const isPromotable = k.source === 'derived_runtime' || k.source === 'overlay_only' || (k.alias_count !== undefined && k.alias_count > 0) || isEditable;
    const hasContext = (k.field_context_count !== undefined && k.field_context_count > 0) || (k.linked_canonical_concept_count !== undefined && k.linked_canonical_concept_count > 0) || (k as any).hasContext;
    const isPii = k.linked_pii === 'yes' || (k as any).linked_pii === true;

    const matchesFocus = knowledgeFocus === 'All concepts' ||
      (knowledgeFocus === 'Editable' && isEditable) ||
      (knowledgeFocus === 'Promotable' && isPromotable) ||
      (knowledgeFocus === 'With context' && hasContext) ||
      (knowledgeFocus === 'Linked PII' && isPii);

    const matchesSystem = knowledgeSourceSystem === 'All source systems' ||
      (k.source_systems && (
        k.source_systems.toLowerCase().includes(knowledgeSourceSystem.toLowerCase()) ||
        k.source_systems.split(',').some(sys => {
          const trimmed = sys.trim().toLowerCase();
          const target = knowledgeSourceSystem.toLowerCase();
          return trimmed === target || target.includes(trimmed) || trimmed.includes(target);
        })
      ));
    const matchesSource = registrySource === 'All sources' || k.source === registrySource;

    return matchesSearch && matchesFocus && matchesSystem && matchesSource;
  });

  // Dynamic Knowledge Metrics computed live from filteredKnowledge
  const knowledgeFilteredCount = filteredKnowledge.length;
  const knowledgeEditableCount = filteredKnowledge.filter(k => k.editable === 'yes' || (k as any).editable === true).length;
  const knowledgePromotableCount = filteredKnowledge.filter(k => k.source === 'derived_runtime' || k.source === 'overlay_only' || (k.alias_count !== undefined && k.alias_count > 0) || k.editable === 'yes' || (k as any).editable === true).length;
  const knowledgeContextCount = filteredKnowledge.filter(k => (k.field_context_count !== undefined && k.field_context_count > 0) || (k.linked_canonical_concept_count !== undefined && k.linked_canonical_concept_count > 0) || (k as any).hasContext).length;
  const knowledgePiiCount = filteredKnowledge.filter(k => k.linked_pii === 'yes' || (k as any).linked_pii === true).length;
  const knowledgeGdprCount = filteredKnowledge.filter(k => k.linked_gdpr_special === 'yes' || (k as any).linked_gdpr_special === true).length;

  // Filter canonical concepts
  const filteredConcepts = canonicalConcepts.filter((c) => {
    const query = conceptSearch.toLowerCase();
    const matchesSearch = !query || 
      (c.concept_id && c.concept_id.toLowerCase().includes(query)) ||
      (c.display_name && c.display_name.toLowerCase().includes(query)) ||
      (c.entity && c.entity.toLowerCase().includes(query)) ||
      (c.base_aliases && c.base_aliases.toLowerCase().includes(query)) ||
      (c.name && c.name.toLowerCase().includes(query));

    const matchesFocus = conceptFocus === 'All concepts' ||
      (conceptFocus === 'With context' && (c.hasContext || c.field_context_count > 0)) ||
      (conceptFocus === 'PII / GDPR' && (c.isPII || c.isGDPR)) ||
      (conceptFocus === 'With active overlay' && (c.hasOverlay || c.active_overlay_entry_count > 0));

    const matchesSystem = selectedSourceSystem === 'All source systems' ||
      (c.source_systems && (
        c.source_systems.toLowerCase().includes(selectedSourceSystem.toLowerCase()) ||
        c.source_systems.split(',').some(sys => {
          const trimmed = sys.trim().toLowerCase();
          const target = selectedSourceSystem.toLowerCase();
          return trimmed === target || target.includes(trimmed) || trimmed.includes(target);
        })
      ));

    const matchesDomain = selectedBusinessDomain === 'All business domains' ||
      (c.business_domains && c.business_domains.includes(selectedBusinessDomain));

    return matchesSearch && matchesFocus && matchesSystem && matchesDomain;
  });

  // Calculate stats based on concept set and active filters
  const totalCount = Math.max(canonicalConcepts.length, 590);
  const isCanonicalFiltered = conceptSearch !== '' || conceptFocus !== 'All concepts' || selectedSourceSystem !== 'All source systems' || selectedBusinessDomain !== 'All business domains';
  const filteredCount = isCanonicalFiltered ? filteredConcepts.length : totalCount;
  const withOverlayCount = filteredConcepts.filter(c => c.hasOverlay || c.active_overlay_entry_count > 0).length;
  const withContextCount = filteredConcepts.filter(c => c.hasContext || c.field_context_count > 0).length;
  const piiCount = filteredConcepts.filter(c => c.isPII).length;
  const gdprCount = filteredConcepts.filter(c => c.isGDPR).length;

  // Refresh handler
  const handleRefreshRegistry = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Handle Stewardship decisions
  const handleResolveStewardship = (id: string, action: 'approved' | 'rejected' | 'ignored') => {
    setStewardshipItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: action };
      }
      return item;
    }));

    if (action === 'approved') {
      const itemToPromote = stewardshipItems.find(i => i.id === id);
      if (itemToPromote) {
        setCanonicalConcepts(prev => prev.map(concept => {
          if (concept.name === itemToPromote.conceptName || concept.concept_id === itemToPromote.conceptName) {
            return {
              ...concept,
              base_aliases: concept.base_aliases ? `${concept.base_aliases}, ${itemToPromote.proposedAlias}` : itemToPromote.proposedAlias
            };
          }
          return concept;
        }));
      }
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* Top Governance Sub-Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm text-xs font-mono text-indigo-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Governance flow: Canonical and Knowledge registries are steward surfaces. Overlay actions are reversible, but glossary promotion is durable and audited.</span>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Governance</h1>
        <p className="text-xs text-slate-500 font-mono">
          Governance console for canonical, knowledge, overlay runtime, and stewardship workflows without changing the underlying authoring logic.
        </p>
      </div>

      {/* Status Legend */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-slate-500 font-semibold block">Governance Status Legend</span>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-bold">
            Accepted
          </span>
          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-bold">
            Needs Review
          </span>
          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-full font-bold">
            Rejected
          </span>
          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-full font-bold">
            LLM Proposal
          </span>
        </div>
      </div>

      {/* Governance Section Radio Selector */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <span className="text-[11px] font-mono text-slate-500 font-semibold block">Governance section</span>
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          {(['Canonical', 'Knowledge', 'Overlays & Runtime', 'Stewardship', 'Audit Trail'] as const).map((sec) => (
            <label key={sec} className="flex items-center gap-2 cursor-pointer text-slate-800 hover:text-indigo-600">
              <input
                type="radio"
                name="governance_section"
                checked={activeSection === sec}
                onChange={() => setActiveSection(sec)}
                className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className={`font-semibold ${activeSection === sec ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                {sec}
              </span>
            </label>
          ))}
        </div>
      </div>
      {/* SECTION 1: CANONICAL (Matching Screenshot Exactly) */}
      {activeSection === 'Canonical' && (
        <div className="space-y-6 pt-2">
          <p className="text-xs text-slate-500 font-mono">
            Canonical glossary stewardship with filtered/total concept counts and context coverage.
          </p>

          {/* Refresh Button */}
          <button
            onClick={handleRefreshRegistry}
            disabled={isRefreshing}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isRefreshing ? 'Refreshing concept registry...' : 'Refresh canonical concept registry'}</span>
          </button>

          {/* Collapsible Canonical Glossary Section */}
          <div className="border border-slate-800 rounded-xl bg-slate-900 overflow-hidden shadow-sm">
            <div 
              onClick={() => setIsGlossaryExpanded(!isGlossaryExpanded)}
              className="p-3.5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer flex items-center gap-2 border-b border-slate-800 transition-colors text-white text-xs font-mono font-bold"
            >
              {isGlossaryExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <span>Canonical Glossary</span>
            </div>

            {isGlossaryExpanded && (
              <div className="p-5 space-y-6 bg-slate-950">
                
                {/* Search & Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Canonical concept search</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search by concept_id, display_name, alias, source system..."
                        value={conceptSearch}
                        onChange={(e) => setConceptSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Concept focus</label>
                    <select
                      value={conceptFocus}
                      onChange={(e) => setConceptFocus(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All concepts">All concepts</option>
                      <option value="With context">With context</option>
                      <option value="PII / GDPR">PII / GDPR</option>
                      <option value="With active overlay">With active overlay</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Source system</label>
                    <select
                      value={selectedSourceSystem}
                      onChange={(e) => setSelectedSourceSystem(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="All source systems">All source systems</option>
                      {canonicalSourceSystemOptions.map(sys => (
                        <option key={sys} value={sys}>{sys}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Business domain</label>
                    <select
                      value={selectedBusinessDomain}
                      onChange={(e) => setSelectedBusinessDomain(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All business domains">All business domains</option>
                      <option value="Proizvod/Materijal">Proizvod / Materijal</option>
                      <option value="Ljudski Resursi">Ljudski Resursi / HR</option>
                      <option value="Customer Master">Prodaja / Customer Master</option>
                      <option value="Supplier Master">Nabavka / Supplier Master</option>
                    </select>
                  </div>
                </div>

                {/* Metrics Bar Matching Screenshot Exactly */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 border-t border-b border-slate-800/80 py-3 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Filtered</span>
                    <span className="text-2xl font-bold text-white">{filteredCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="text-2xl font-bold text-white">{totalCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">With active overlay</span>
                    <span className="text-2xl font-bold text-white">{withOverlayCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">With context</span>
                    <span className="text-2xl font-bold text-white">{withContextCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">PII</span>
                    <span className="text-2xl font-bold text-white">{piiCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">GDPR</span>
                    <span className="text-2xl font-bold text-white">{gdprCount}</span>
                  </div>
                </div>

                {/* Tabular Concept Data Grid with Sticky Header & Resizable Columns & Cell Inspector */}
                <div className="space-y-3">
                  <div className="overflow-x-auto overflow-y-auto max-h-[480px] border border-slate-800 rounded-lg relative bg-slate-950 shadow-inner">
                    <table className="w-full text-left text-xs font-mono border-collapse table-fixed">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10 shadow-sm select-none">
                        <tr className="text-slate-300">
                          {[
                            { key: 'concept_id', label: 'concept_id' },
                            { key: 'display_name', label: 'display_name' },
                            { key: 'entity', label: 'entity' },
                            { key: 'attribute', label: 'attribute' },
                            { key: 'data_type', label: 'data_type' },
                            { key: 'source', label: 'source' },
                            { key: 'usage_count', label: 'usage_count' },
                            { key: 'field_context_count', label: 'field_context_count' },
                            { key: 'active_overlay_entry_count', label: 'active_overlay_entry_count' },
                            { key: 'source_systems', label: 'source_systems' },
                            { key: 'business_domains', label: 'business_domains' },
                            { key: 'base_aliases', label: 'base_aliases' },
                          ].map((col) => (
                            <th 
                              key={col.key}
                              style={{ width: canonicalWidths[col.key] || 150, minWidth: 60 }}
                              className="p-2.5 font-bold bg-slate-900 border-r border-slate-800/80 relative group shrink-0"
                            >
                              <div className="truncate pr-2" title={`${col.label} (drag edge to resize)`}>
                                {col.label}
                              </div>
                              {/* Drag handle */}
                              <div
                                onMouseDown={(e) => handleColumnResize('canonical', col.key, e)}
                                className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/80 group-hover:bg-slate-700/80 transition-colors z-20"
                                title="Drag to resize column"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredConcepts.map((concept) => (
                          <tr key={concept.id} className="hover:bg-slate-900/70 transition-colors">
                            {[
                              { key: 'concept_id', cls: 'font-bold text-indigo-400' },
                              { key: 'display_name', cls: 'font-semibold text-slate-200' },
                              { key: 'entity', cls: 'text-slate-400' },
                              { key: 'attribute', cls: 'text-slate-400' },
                              { key: 'data_type', cls: 'text-slate-400' },
                              { key: 'source', cls: 'text-slate-500' },
                              { key: 'usage_count', cls: 'text-slate-400' },
                              { key: 'field_context_count', cls: 'text-slate-400' },
                              { key: 'active_overlay_entry_count', cls: 'text-slate-400' },
                              { key: 'source_systems', cls: 'text-[10px] text-slate-400' },
                              { key: 'business_domains', cls: 'text-[10px] text-slate-400' },
                              { key: 'base_aliases', cls: 'text-[10px] text-emerald-400' },
                            ].map((col) => {
                              const cellId = `canonical_${concept.id}_${col.key}`;
                              const val = (concept as any)[col.key];
                              const isSelected = selectedCell?.cellId === cellId;
                              return (
                                <td
                                  key={col.key}
                                  style={{ width: canonicalWidths[col.key] || 150 }}
                                  onClick={() => setSelectedCell({
                                    cellId,
                                    tableName: 'Canonical Glossary',
                                    conceptId: concept.concept_id,
                                    columnLabel: col.key,
                                    value: val
                                  })}
                                  className={`p-2.5 cursor-pointer border-r border-slate-800/30 truncate transition-colors ${col.cls} ${
                                    isSelected 
                                      ? 'bg-emerald-950/80 ring-2 ring-emerald-400 text-emerald-200 font-bold z-10' 
                                      : 'hover:bg-slate-800/80'
                                  }`}
                                  title="Click cell to view full multi-line content in Streamlit inspector"
                                >
                                  {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Scroll & Record Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                    <span>Showing <strong className="text-white">{filteredConcepts.length}</strong> of <strong className="text-white">{canonicalConcepts.length}</strong> canonical concepts</span>
                    <span className="text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Interactive Table: Drag header edges to resize columns | Click cell for full multi-line inspector
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: KNOWLEDGE (Matching Streamlit Screenshot Exactly) */}
      {activeSection === 'Knowledge' && (
        <div className="space-y-6 pt-2 font-mono">
          <p className="text-xs text-slate-500 font-mono">
            Knowledge registry stewardship with concept counts, linked canonical paths, and promotion readiness.
          </p>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setIsRefreshingKnowledge(true);
                setTimeout(() => setIsRefreshingKnowledge(false), 800);
              }}
              disabled={isRefreshingKnowledge}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingKnowledge ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{isRefreshingKnowledge ? 'Refreshing registry...' : 'Refresh knowledge concept registry'}</span>
            </button>

            <button
              onClick={() => {
                setIsRefreshingAudit(true);
                setTimeout(() => setIsRefreshingAudit(false), 800);
              }}
              disabled={isRefreshingAudit}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAudit ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isRefreshingAudit ? 'Refreshing audit log...' : 'Refresh knowledge audit log'}</span>
            </button>
          </div>

          {/* Collapsible Accordion 1: Knowledge Registry */}
          <div className="border border-slate-800 rounded-xl bg-slate-900 overflow-hidden shadow-sm">
            <div 
              onClick={() => setIsKnowledgeRegistryExpanded(!isKnowledgeRegistryExpanded)}
              className="p-3.5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer flex items-center gap-2 border-b border-slate-800 transition-colors text-white text-xs font-mono font-bold"
            >
              {isKnowledgeRegistryExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <span>Knowledge Registry</span>
            </div>

            {isKnowledgeRegistryExpanded && (
              <div className="p-4 bg-slate-950 text-slate-400 text-xs space-y-2">
                <p>Enterprise knowledge registries mapped across SAP ECC, Workday, and Salesforce CRM metadata bases.</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">HR - Time & Absence (340 items)</div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">Sales - Customer Master (1200 items)</div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">MM - Product & Inventory (1570 items)</div>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Accordion 2: Knowledge Concept Registry */}
          <div className="border border-slate-800 rounded-xl bg-slate-900 overflow-hidden shadow-sm">
            <div 
              onClick={() => setIsKnowledgeConceptRegistryExpanded(!isKnowledgeConceptRegistryExpanded)}
              className="p-3.5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer flex items-center gap-2 border-b border-slate-800 transition-colors text-white text-xs font-mono font-bold"
            >
              {isKnowledgeConceptRegistryExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <span>Knowledge Concept Registry</span>
            </div>

            {isKnowledgeConceptRegistryExpanded && (
              <div className="p-5 space-y-6 bg-slate-950">
                
                {/* Search & Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Knowledge concept search</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search by concept id, name, alias, linked canonical concept"
                        value={knowledgeSearch}
                        onChange={(e) => setKnowledgeSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Knowledge focus</label>
                    <select
                      value={knowledgeFocus}
                      onChange={(e) => setKnowledgeFocus(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All concepts">All concepts</option>
                      <option value="Editable">Editable</option>
                      <option value="Promotable">Promotable</option>
                      <option value="With context">With context</option>
                      <option value="Linked PII">Linked PII</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Source system</label>
                    <select
                      value={knowledgeSourceSystem}
                      onChange={(e) => setKnowledgeSourceSystem(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="All source systems">All source systems</option>
                      {knowledgeSourceSystemOptions.map(sys => (
                        <option key={sys} value={sys}>{sys}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Registry source</label>
                    <select
                      value={registrySource}
                      onChange={(e) => setRegistrySource(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All sources">All sources</option>
                      <option value="derived_runtime">derived_runtime</option>
                      <option value="base">base</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 border-t border-b border-slate-800/80 py-3 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Filtered</span>
                    <span className="text-2xl font-bold text-white">{knowledgeFilteredCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Editable</span>
                    <span className="text-2xl font-bold text-white">{knowledgeEditableCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Promotable</span>
                    <span className="text-2xl font-bold text-white">{knowledgePromotableCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">With context</span>
                    <span className="text-2xl font-bold text-white">{knowledgeContextCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Linked PII</span>
                    <span className="text-2xl font-bold text-white">{knowledgePiiCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Linked GDPR special</span>
                    <span className="text-2xl font-bold text-white">{knowledgeGdprCount}</span>
                  </div>
                </div>

                {/* Data Table with Sticky Header & Resizable Columns & Cell Inspector */}
                <div className="space-y-3">
                  <div className="overflow-x-auto overflow-y-auto max-h-[480px] border border-slate-800 rounded-lg relative bg-slate-950 shadow-inner">
                    <table className="w-full text-left text-xs font-mono border-collapse table-fixed">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10 shadow-sm select-none">
                        <tr className="text-slate-300">
                          {[
                            { key: 'concept_id', label: 'concept_id' },
                            { key: 'canonical_name', label: 'canonical_name' },
                            { key: 'domain', label: 'domain' },
                            { key: 'source', label: 'source' },
                            { key: 'editable', label: 'editable' },
                            { key: 'linked_pii', label: 'linked_pii' },
                            { key: 'linked_gdpr_special', label: 'linked_gdpr_special' },
                            { key: 'linked_pii_tags', label: 'linked_pii_tags' },
                            { key: 'linked_data_subjects', label: 'linked_data_subjects' },
                            { key: 'alias_count', label: 'alias_count' },
                            { key: 'field_context_count', label: 'field_context_count' },
                            { key: 'linked_canonical_concept_count', label: 'linked_canonical_concept_count' },
                            { key: 'source_systems', label: 'source_systems' },
                            { key: 'linked_canonical_concepts', label: 'linked_canonical_concepts' },
                          ].map((col) => (
                            <th 
                              key={col.key}
                              style={{ width: knowledgeWidths[col.key] || 150, minWidth: 60 }}
                              className="p-2.5 font-bold bg-slate-900 border-r border-slate-800/80 relative group shrink-0"
                            >
                              <div className="truncate pr-2" title={`${col.label} (drag edge to resize)`}>
                                {col.label}
                              </div>
                              {/* Drag handle */}
                              <div
                                onMouseDown={(e) => handleColumnResize('knowledge', col.key, e)}
                                className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-indigo-500/80 group-hover:bg-slate-700/80 transition-colors z-20"
                                title="Drag to resize column"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredKnowledge.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/70 transition-colors">
                            {[
                              { key: 'concept_id', cls: 'font-bold text-slate-200' },
                              { key: 'canonical_name', cls: 'font-semibold text-slate-300' },
                              { key: 'domain', cls: 'text-slate-400' },
                              { key: 'source', cls: 'text-slate-500' },
                              { key: 'editable', cls: 'text-slate-400' },
                              { key: 'linked_pii', cls: 'text-slate-400' },
                              { key: 'linked_gdpr_special', cls: 'text-slate-400' },
                              { key: 'linked_pii_tags', cls: 'text-slate-400' },
                              { key: 'linked_data_subjects', cls: 'text-slate-400' },
                              { key: 'alias_count', cls: 'text-slate-400' },
                              { key: 'field_context_count', cls: 'text-slate-400' },
                              { key: 'linked_canonical_concept_count', cls: 'text-slate-400' },
                              { key: 'source_systems', cls: 'text-[10px] text-slate-400' },
                              { key: 'linked_canonical_concepts', cls: 'text-[10px] text-indigo-400' },
                            ].map((col) => {
                              const cellId = `knowledge_${item.id}_${col.key}`;
                              const val = (item as any)[col.key];
                              const isSelected = selectedCell?.cellId === cellId;
                              return (
                                <td
                                  key={col.key}
                                  style={{ width: knowledgeWidths[col.key] || 150 }}
                                  onClick={() => setSelectedCell({
                                    cellId,
                                    tableName: 'Knowledge Concept Registry',
                                    conceptId: item.concept_id,
                                    columnLabel: col.key,
                                    value: val
                                  })}
                                  className={`p-2.5 cursor-pointer border-r border-slate-800/30 truncate transition-colors ${col.cls} ${
                                    isSelected 
                                      ? 'bg-indigo-950/80 ring-2 ring-indigo-400 text-indigo-200 font-bold z-10' 
                                      : 'hover:bg-slate-800/80'
                                  }`}
                                  title="Click cell to view full multi-line content in Streamlit inspector"
                                >
                                  {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Record Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                    <span>Showing <strong className="text-white">{filteredKnowledge.length}</strong> of <strong className="text-white">{knowledgeList.length}</strong> knowledge concepts</span>
                    <span className="text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      Interactive Table: Drag header edges to resize columns | Click cell for full multi-line inspector
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}


      {/* SECTION 3: OVERLAYS & RUNTIME */}
      {activeSection === 'Overlays & Runtime' && (
        <div className="space-y-6 pt-2 text-slate-800 font-sans">
          
          {/* Top Informational Banner on Multi-Overlay Stacking */}
          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 text-xs font-mono text-emerald-300 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white text-xs block">Can multiple Overlay files be active at the same time?</span>
              <p className="text-emerald-200 text-[11px] leading-relaxed">
                <strong>YES!</strong> In the Semantra architecture, multiple overlay files (e.g., SAP, HR, QuickBooks) can be <strong>active simultaneously</strong> in the runtime stack. They are applied in priority order: adding multiple files combines rules seamlessly without altering base canonical definitions.
              </p>
            </div>
          </div>

          {/* Active Overlay Stack Management Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  Semantic Knowledge Overlays & Active Runtime Stack
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Activate or deactivate individual overlay files in the active runtime stack.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-500">Active in stack:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {Object.values(activeOverlayFiles).filter(Boolean).length} / {Object.keys(activeOverlayFiles).length} overlay files
                </span>
              </div>
            </div>

            {/* List of Available Overlay Files with Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  file: 'sap_best_plus_weak_promotion_overlay.csv', 
                  title: 'SAP SD/MM Sales & Master Overlay', 
                  system: 'SAP ECC / S4HANA',
                  rulesCount: overlayRulesData['sap_best_plus_weak_promotion_overlay.csv']?.length || 8,
                  steward: 'Enterprise Data Lead'
                },
                { 
                  file: 'hrdh_knowledge_overlay.csv', 
                  title: 'HR Data Hub & GDPR Compliance', 
                  system: 'Workday HR',
                  rulesCount: overlayRulesData['hrdh_knowledge_overlay.csv']?.length || 5,
                  steward: 'HR Compliance Lead'
                },
                { 
                  file: 'qb_knowledge_overlay.csv', 
                  title: 'QuickBooks Accounting & Finance', 
                  system: 'QuickBooks Online',
                  rulesCount: overlayRulesData['qb_knowledge_overlay.csv']?.length || 4,
                  steward: 'SME Accounting Team'
                }
              ].map((ov) => {
                const isActive = activeOverlayFiles[ov.file] ?? false;
                const isInspecting = inspectOverlayFile === ov.file;

                return (
                  <div 
                    key={ov.file} 
                    className={`border rounded-xl p-4 transition-all space-y-3 font-mono text-xs ${
                      isActive 
                        ? 'bg-slate-900 text-white border-slate-800 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isActive ? 'ACTIVE IN STACK' : 'DEACTIVATED'}
                      </span>

                      {/* Toggle Active switch */}
                      <button
                        onClick={() => setActiveOverlayFiles(prev => ({ ...prev, [ov.file]: !prev[ov.file] }))}
                        className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                          isActive 
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        }`}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-100 truncate" title={ov.title}>{ov.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{ov.file}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 text-[11px] space-y-1 text-slate-400">
                      <div className="flex justify-between">
                        <span>System:</span>
                        <strong className="text-slate-200">{ov.system}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Rules Count:</span>
                        <strong className="text-emerald-400">{ov.rulesCount} rules</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Steward:</span>
                        <span className="text-slate-300 truncate max-w-[130px]">{ov.steward}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setInspectOverlayFile(ov.file)}
                      className={`w-full py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isInspecting
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isInspecting ? 'Shown in Table Below' : 'View File Content'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Content Viewer for Selected Overlay File */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4 text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white font-mono">
                    Overlay File Content: <span className="text-emerald-400">{inspectOverlayFile}</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Viewing all <strong>{(overlayRulesData[inspectOverlayFile] || []).length} rules</strong> defined in this file. Click on any cell for full inspector details.
                </p>
              </div>

              {/* Filter / Search inside inspect overlay */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search rules..."
                    value={overlaySearch}
                    onChange={(e) => setOverlaySearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-56"
                  />
                </div>

                <span className={`px-3 py-1.5 text-xs font-mono font-bold rounded border ${
                  activeOverlayFiles[inspectOverlayFile] 
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {activeOverlayFiles[inspectOverlayFile] ? 'STATUS: ACTIVE IN RUNTIME' : 'STATUS: INACTIVE'}
                </span>
              </div>
            </div>

            {/* Rules Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950 max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-collapse min-w-[900px]">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10 text-slate-300">
                  <tr>
                    <th className="p-2.5 font-bold">Rule ID</th>
                    <th className="p-2.5 font-bold">Source System</th>
                    <th className="p-2.5 font-bold">Source Field</th>
                    <th className="p-2.5 font-bold">Target Canonical Concept</th>
                    <th className="p-2.5 font-bold">Override Type</th>
                    <th className="p-2.5 font-bold">Steward</th>
                    <th className="p-2.5 font-bold">Status</th>
                    <th className="p-2.5 font-bold">Created Date</th>
                    <th className="p-2.5 font-bold">Notes / Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(overlayRulesData[inspectOverlayFile] || [])
                    .filter((rule) => {
                      const q = overlaySearch.toLowerCase();
                      return (
                        rule.source_field.toLowerCase().includes(q) ||
                        rule.target_canonical_concept.toLowerCase().includes(q) ||
                        rule.source_system.toLowerCase().includes(q) ||
                        rule.notes.toLowerCase().includes(q)
                      );
                    })
                    .map((rule) => {
                      const cellId = `overlay_${rule.id}`;
                      const isSelected = selectedCell?.conceptId === rule.id;

                      return (
                        <tr key={rule.id} className="hover:bg-slate-900/80 transition-colors">
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'id', value: rule.id })}
                            className="p-2.5 text-indigo-400 font-bold cursor-pointer"
                          >
                            {rule.id}
                          </td>
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'source_system', value: rule.source_system })}
                            className="p-2.5 text-slate-400 cursor-pointer"
                          >
                            {rule.source_system}
                          </td>
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'source_field', value: rule.source_field })}
                            className="p-2.5 text-amber-300 font-bold cursor-pointer"
                          >
                            {rule.source_field}
                          </td>
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'target_canonical_concept', value: rule.target_canonical_concept })}
                            className="p-2.5 text-emerald-400 font-bold cursor-pointer"
                          >
                            {rule.target_canonical_concept}
                          </td>
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'override_type', value: rule.override_type })}
                            className="p-2.5 cursor-pointer"
                          >
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px]">
                              {rule.override_type}
                            </span>
                          </td>
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'steward', value: rule.steward })}
                            className="p-2.5 text-slate-400 cursor-pointer"
                          >
                            {rule.steward}
                          </td>
                          <td className="p-2.5">
                            <button
                              onClick={() => {
                                setOverlayRulesData(prev => ({
                                  ...prev,
                                  [inspectOverlayFile]: prev[inspectOverlayFile].map(r => 
                                    r.id === rule.id ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' } : r
                                  )
                                }));
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                rule.status === 'active' 
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' 
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                              }`}
                            >
                              {rule.status.toUpperCase()}
                            </button>
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px]">{rule.created_at}</td>
                          <td 
                            onClick={() => setSelectedCell({ cellId, tableName: inspectOverlayFile, conceptId: rule.id, columnLabel: 'notes', value: rule.notes })}
                            className="p-2.5 text-slate-400 text-[11px] max-w-[240px] truncate cursor-pointer hover:text-white"
                          >
                            {rule.notes}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Bottom summary note */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span>Displaying rules from file: <strong>{inspectOverlayFile}</strong></span>
              <span className="text-emerald-400">Rules in active files automatically override workspace mappings</span>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 4: STEWARDSHIP */}
      {activeSection === 'Stewardship' && (
        <div className="space-y-6 pt-2 text-slate-800">
          {/* Granati Versioning & Draft Overlays Control Console Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    Canonical Glossary Branching & Draft Overlays Engine
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Feature B Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Stage proposed dictionary rules in isolated Draft Overlay branches before promoting into main production.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBranchModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Draft Branch</span>
                </button>
              </div>
            </div>

            {/* Active Branch Selector & Actions Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                  Active Canonical Branch
                </label>
                <div className="relative">
                  <GitBranch className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-emerald-400" />
                  <select
                    value={activeBranch}
                    onChange={(e) => setActiveBranch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 text-slate-100 rounded focus:outline-none focus:border-emerald-500 text-xs font-bold"
                  >
                    {branchesList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.status === 'production' ? 'Production Master' : `${b.pendingChangesCount} staged changes`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch Details */}
              <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-center">
                {(() => {
                  const current = branchesList.find(b => b.id === activeBranch) || branchesList[0];
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 truncate">{current.description}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded ${
                          current.status === 'production' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {current.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Steward: {current.author}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          Delta Fit: +{current.benchmarkDeltaPct}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Action Buttons: Benchmark & Merge */}
              <div className="flex items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={handleTestBenchmark}
                  disabled={isTestingBenchmark}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className={`w-3.5 h-3.5 ${isTestingBenchmark ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
                  <span>{isTestingBenchmark ? 'Testing Benchmark...' : 'Test Benchmark Delta'}</span>
                </button>

                {activeBranch !== 'main' && (
                  <button
                    type="button"
                    onClick={handleOpenMergeWizard}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge to Main</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification Alert Banner */}
            {branchNoticeMessage && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{branchNoticeMessage}</span>
              </div>
            )}
          </div>

          {/* Modal Dialog for New Draft Overlay Branch */}
          {isCreateBranchModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in font-mono">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <GitBranch className="w-4 h-4" />
                    <span>Create Draft Overlay Branch</span>
                  </div>
                  <button
                    onClick={() => setIsCreateBranchModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-300 block">Branch Name (e.g. draft/sap-custom-overlay)</label>
                    <input
                      type="text"
                      placeholder="draft/v1.4-sales-tax"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 block">Branch Purpose / Stewardship Description</label>
                    <textarea
                      rows={2}
                      placeholder="Draft overlay for validating tax field canonical alignment..."
                      value={newBranchDesc}
                      onChange={(e) => setNewBranchDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-2 rounded focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateBranchModalOpen(false)}
                      className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-500 shadow-sm"
                    >
                      Create Branch
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 font-sans">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Gap Triage Stewardship Queue
            </h3>
            <p className="text-xs text-slate-600 font-mono">
              Approve, reject, or ignore pending aliases harvested from active workspace sessions to promote them cleanly to global canonical indexes.
            </p>

            <div className="space-y-3 pt-2 font-mono text-xs">
              {stewardshipItems.filter(i => i.status === 'ready_for_approval').length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-400">
                  Stewardship queue is completely caught up. No pending gap approvals.
                </div>
              ) : (
                stewardshipItems
                  .filter((item) => item.status === 'ready_for_approval')
                  .map((item) => (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50 relative">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">PROPOSED ALIAS</span>
                          <span className="text-sm font-bold text-slate-900">{item.proposedAlias}</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded uppercase">
                          Triage
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-600 text-xs">
                        <p><strong className="text-slate-800">Target Concept:</strong> <span className="text-indigo-600 font-bold">{item.conceptName}</span></p>
                        <p><strong className="text-slate-800">Source Context:</strong> {item.sourceContext}</p>
                        {item.reviewNote && (
                          <div className="mt-1 bg-white border border-slate-200 p-2 rounded text-[11px] italic text-slate-600 font-sans">
                            "{item.reviewNote}"
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleResolveStewardship(item.id, 'rejected')}
                          className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold rounded flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleResolveStewardship(item.id, 'approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Promote Alias
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: AUDIT TRAIL / REVIZORSKI DNEVNIK */}
      {activeSection === 'Audit Trail' && (
        <div className="space-y-6 pt-2 font-mono text-xs text-slate-200">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Stewardship Governance &amp; Revizorski Dnevnik
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-bold">
                    Immutable Audit Log
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full cryptographic history of all branch creations, 3-way merges, conflict resolutions, and promoted overlay dictionaries.
                </p>
              </div>

              {/* Export Audit Log Button */}
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
                  const dlAnchor = document.createElement('a');
                  dlAnchor.setAttribute("href", dataStr);
                  dlAnchor.setAttribute("download", `semantra_stewardship_audit_${new Date().toISOString().slice(0, 10)}.json`);
                  dlAnchor.click();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Export Audit Log (JSON)</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search audit records by steward, hash, idempotency key..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={auditFilterAction}
                  onChange={(e) => setAuditFilterAction(e.target.value)}
                  className="w-full p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Action Types</option>
                  <option value="branch_created">Branch Created</option>
                  <option value="branch_merged">Branch Merged (3-Way)</option>
                  <option value="conflict_resolved">Conflict Resolved</option>
                  <option value="overlay_promoted">Overlay Promoted</option>
                  <option value="decision_applied">Decision Applied</option>
                </select>
              </div>

              <div className="flex items-center justify-end text-slate-400 text-xs gap-3">
                <span>Total Audit Entries: <strong className="text-white">{auditLogs.length}</strong></span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Idempotent
                </span>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950 max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10 text-slate-300">
                  <tr>
                    <th className="p-2.5 font-bold">Timestamp</th>
                    <th className="p-2.5 font-bold">Steward / Actor</th>
                    <th className="p-2.5 font-bold">Action Type</th>
                    <th className="p-2.5 font-bold">Branch Name</th>
                    <th className="p-2.5 font-bold">Target Entity</th>
                    <th className="p-2.5 font-bold">Details &amp; Diff Summary</th>
                    <th className="p-2.5 font-bold">Idempotency Key</th>
                    <th className="p-2.5 font-bold">Commit Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {auditLogs
                    .filter(rec => {
                      const q = auditSearch.toLowerCase();
                      const matchesQ = !q ||
                        rec.stewardName.toLowerCase().includes(q) ||
                        rec.branchName.toLowerCase().includes(q) ||
                        rec.details.toLowerCase().includes(q) ||
                        rec.idempotencyKey.toLowerCase().includes(q) ||
                        rec.commitHash.toLowerCase().includes(q);
                      const matchesAct = auditFilterAction === 'all' || rec.actionType === auditFilterAction;
                      return matchesQ && matchesAct;
                    })
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/80 transition-colors">
                        <td className="p-2.5 text-slate-400 whitespace-nowrap text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {rec.timestamp}
                          </div>
                        </td>
                        <td className="p-2.5 font-bold text-slate-200 whitespace-nowrap">
                          {rec.stewardName}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            rec.actionType === 'branch_merged'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : rec.actionType === 'branch_created'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : rec.actionType === 'overlay_promoted'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {rec.actionType.toUpperCase().replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2.5 text-emerald-400 font-bold whitespace-nowrap">
                          {rec.branchName}
                        </td>
                        <td className="p-2.5 text-indigo-300 whitespace-nowrap">
                          {rec.targetEntity}
                        </td>
                        <td className="p-2.5 text-slate-300 text-[11px] max-w-[320px] leading-relaxed">
                          {rec.details}
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-amber-400 whitespace-nowrap">
                          {rec.idempotencyKey}
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300">
                            {rec.commitHash}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3-WAY MERGE CONFLICT RESOLUTION WIZARD MODAL */}
      {isMergeConflictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in font-mono">
          <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/40 rounded-lg">
                    <GitMerge className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    3-Way Merge Conflict Resolution Wizard
                  </h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {activeConflicts.filter(c => !c.resolved).length === 0 ? 'All Conflicts Resolved' : `${activeConflicts.filter(c => !c.resolved).length} Unresolved`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Merging incoming draft branch <strong className="text-emerald-400">{activeBranch}</strong> &rarr; base production <strong className="text-blue-400">main</strong>. Review side-by-side invariants and choose property resolution.
                </p>
              </div>

              <button
                onClick={() => setIsMergeConflictModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflicts List */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {activeConflicts.map((conflict, idx) => (
                <div 
                  key={conflict.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner"
                >
                  {/* Conflict Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-100 text-xs">{conflict.conceptDisplayName}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-indigo-400 font-bold text-[11px]">{conflict.propertyLabel}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Resolution:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        conflict.resolution === 'accept_incoming'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : conflict.resolution === 'keep_main'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {conflict.resolution.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Context Rationale */}
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    "{conflict.conflictDescription}"
                  </p>

                  {/* Side-by-Side Diff Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Current Main Option */}
                    <div className={`p-3 rounded-lg border transition-colors flex flex-col justify-between ${
                      conflict.resolution === 'keep_main'
                        ? 'bg-blue-950/40 border-blue-600 ring-1 ring-blue-500/60'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-blue-400">
                          <span>BASE MAIN (Production)</span>
                          {conflict.resolution === 'keep_main' && <CheckCheck className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-200 text-xs font-mono break-all select-all">
                          {String(conflict.mainValue)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSetConflictResolution(conflict.id, 'keep_main')}
                        className={`mt-2.5 py-1.5 px-3 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                          conflict.resolution === 'keep_main'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        Keep Main Value
                      </button>
                    </div>

                    {/* Incoming Draft Option */}
                    <div className={`p-3 rounded-lg border transition-colors flex flex-col justify-between ${
                      conflict.resolution === 'accept_incoming'
                        ? 'bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-500/60'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                          <span>INCOMING DRAFT ({activeBranch})</span>
                          {conflict.resolution === 'accept_incoming' && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="p-2 bg-slate-950 rounded border border-slate-800 text-emerald-200 text-xs font-mono break-all select-all font-semibold">
                          {String(conflict.incomingValue)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSetConflictResolution(conflict.id, 'accept_incoming')}
                        className={`mt-2.5 py-1.5 px-3 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                          conflict.resolution === 'accept_incoming'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        Accept Incoming Value
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Commit Footer with Idempotency Key & Action */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">Merge Commit Rationale</label>
                  <input
                    type="text"
                    value={mergeCommitMessage}
                    onChange={(e) => setMergeCommitMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Idempotency Transaction Key
                  </label>
                  <input
                    type="text"
                    value={mergeIdempotencyKey}
                    readOnly
                    className="w-full bg-slate-950 border border-slate-800 text-amber-300 font-mono px-3 py-1.5 rounded text-xs select-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>All resolutions will be permanently recorded in the <strong>Audit Trail</strong>.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMergeConflictModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteMergeCommit}
                    disabled={isMergingExecution}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <GitCommit className={`w-4 h-4 ${isMergingExecution ? 'animate-spin' : ''}`} />
                    <span>{isMergingExecution ? 'Executing Commit...' : 'Execute Idempotent 3-Way Merge'}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Streamlit Cell Content Inspector Modal Rectangle */}
      {selectedCell && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-xl bg-slate-900 border-2 border-emerald-500/90 rounded-xl shadow-2xl p-4 text-slate-200 font-mono animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Streamlit Cell Inspector</span>
              <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-emerald-400 rounded border border-slate-700">
                {selectedCell.tableName}
              </span>
            </div>
            <button 
              onClick={() => setSelectedCell(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              title="Close cell viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">CONCEPT ID</span>
                <strong className="text-indigo-300 truncate block">{selectedCell.conceptId}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">COLUMN NAME</span>
                <strong className="text-emerald-300 truncate block">{selectedCell.columnLabel}</strong>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">FULL CELL CONTENT:</span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-60 overflow-y-auto text-xs text-slate-100 whitespace-pre-wrap break-words leading-relaxed font-mono border-l-4 border-l-emerald-500 shadow-inner select-text">
                {selectedCell.value !== undefined && selectedCell.value !== null && String(selectedCell.value).trim() !== ''
                  ? String(selectedCell.value)
                  : <span className="text-slate-600 italic">(Empty / No Value)</span>
                }
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
              <span>You can select or copy the complete cell content</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(String(selectedCell.value || ''));
                  setCopiedCell(true);
                  setTimeout(() => setCopiedCell(false), 1500);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-[11px] flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedCell ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedCell ? 'Copied!' : 'Copy Value'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
