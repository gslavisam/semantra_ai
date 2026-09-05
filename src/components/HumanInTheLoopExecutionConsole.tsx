import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Play, 
  Database, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Download,
  Filter,
  Search,
  Check,
  Ban,
  Sparkles,
  Lock,
  UserCheck,
  FileCheck2,
  Clock,
  Layers,
  ArrowUpRight,
  HelpCircle,
  FileJson,
  Undo2,
  AlertOctagon,
  Copy
} from 'lucide-react';
import { MappingRow } from '../types';

export interface BatchRecord {
  id: string;
  sourceField: string;
  sourceValue: string;
  proposedCanonical: string;
  confidenceScore: number;
  status: 'auto_matched' | 'needs_review' | 'blocked' | 'quarantined';
  issueType: 'new_alias' | 'format_error' | 'ambiguous_match' | 'null_constraint' | 'low_confidence';
  issueDescription: string;
  similarOccurrencesCount?: number;
  aiSuggestedFix?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  userOverride?: string;
}

interface BatchJobMeta {
  jobId: string;
  jobName: string;
  sourceSystem: string;
  sourceFile: string;
  targetCanonicalModel: string;
  totalVolume: number;
  dataContractRef: string;
  startedAt: string;
}

interface HumanInTheLoopExecutionConsoleProps {
  activeMappings?: MappingRow[];
  selectedPreset?: string;
  onReturnToWorkspace?: () => void;
}

const PRESET_JOBS: { meta: BatchJobMeta; records: BatchRecord[] }[] = [
  {
    meta: {
      jobId: 'JOB-2026-SAP-8809',
      jobName: 'SAP FI/CO General Ledger Q3 Invoices',
      sourceSystem: 'SAP S/4HANA (BAPI_INVOICE_CREATE)',
      sourceFile: 'SAP_Invoices_CEE_Q3.csv',
      targetCanonicalModel: 'Canonical.InvoiceModel (v2.2.0)',
      totalVolume: 1500,
      dataContractRef: 'ODC-INVOICE-SLA-09',
      startedAt: '2026-09-05 08:30:14 UTC'
    },
    records: [
      {
        id: 'REC-001',
        sourceField: 'VEND_TAX_NUM',
        sourceValue: 'RS100223344',
        proposedCanonical: 'tax_identification_number',
        confidenceScore: 0.98,
        status: 'auto_matched',
        issueType: 'new_alias',
        issueDescription: 'Deterministic match via registered ISO 3166 VAT syntax.'
      },
      {
        id: 'REC-002',
        sourceField: 'supplier_vat_id',
        sourceValue: 'DE811223344',
        proposedCanonical: 'tax_identification_number',
        confidenceScore: 0.84,
        status: 'needs_review',
        issueType: 'new_alias',
        issueDescription: 'New alias in Salesforce/SAP feed — requires human steward alias authorization.',
        similarOccurrencesCount: 14,
        aiSuggestedFix: 'tax_identification_number'
      },
      {
        id: 'REC-003',
        sourceField: 'POSTING_DATE_RAW',
        sourceValue: '2026/13/45',
        proposedCanonical: 'posting_date',
        confidenceScore: 0.20,
        status: 'blocked',
        issueType: 'format_error',
        issueDescription: 'Invalid date calendar format [month 13 / day 45] — type coercion failed.',
        aiSuggestedFix: '2026-12-31'
      },
      {
        id: 'REC-004',
        sourceField: 'KOSTL_COST_CTR',
        sourceValue: 'CC-99002-SRB',
        proposedCanonical: 'cost_center_id',
        confidenceScore: 0.79,
        status: 'needs_review',
        issueType: 'ambiguous_match',
        issueDescription: 'Unregistered cost center prefix. Match confidence below 85% threshold.',
        similarOccurrencesCount: 22,
        aiSuggestedFix: 'cost_center_id'
      },
      {
        id: 'REC-005',
        sourceField: 'TOTAL_GROSS_AMT',
        sourceValue: 'N/A',
        proposedCanonical: 'gross_amount_currency',
        confidenceScore: 0.15,
        status: 'blocked',
        issueType: 'null_constraint',
        issueDescription: 'Strict schema violation: non-nullable canonical field received literal "N/A".',
        aiSuggestedFix: '0.00'
      },
      {
        id: 'REC-006',
        sourceField: 'WAERS_CURR',
        sourceValue: 'DIN',
        proposedCanonical: 'currency_code',
        confidenceScore: 0.81,
        status: 'needs_review',
        issueType: 'new_alias',
        issueDescription: 'Legacy non-ISO currency acronym ("DIN" instead of "RSD").',
        similarOccurrencesCount: 38,
        aiSuggestedFix: 'currency_code'
      }
    ]
  },
  {
    meta: {
      jobId: 'JOB-2026-CRM-4102',
      jobName: 'Salesforce B2B Accounts Daily Delta',
      sourceSystem: 'Salesforce CRM (REST v58.0)',
      sourceFile: 'SFDC_Accounts_Delta_Live.json',
      targetCanonicalModel: 'Canonical.CustomerAccount (v1.4.0)',
      totalVolume: 3200,
      dataContractRef: 'ODC-CUSTOMER-B2B',
      startedAt: '2026-09-05 09:12:00 UTC'
    },
    records: [
      {
        id: 'REC-CRM-101',
        sourceField: 'DUNS_NUMBER_STR',
        sourceValue: '12-345-6789',
        proposedCanonical: 'duns_identifier',
        confidenceScore: 0.99,
        status: 'auto_matched',
        issueType: 'new_alias',
        issueDescription: 'D&B standard Dun & Bradstreet 9-digit format verified.'
      },
      {
        id: 'REC-CRM-102',
        sourceField: 'Billing_State_Code_Custom',
        sourceValue: 'Vojvodina_Reg',
        proposedCanonical: 'state_province_code',
        confidenceScore: 0.72,
        status: 'needs_review',
        issueType: 'new_alias',
        issueDescription: 'Sub-national region label does not conform to standard 2-letter ISO 3166-2.',
        similarOccurrencesCount: 19,
        aiSuggestedFix: 'state_province_code'
      },
      {
        id: 'REC-CRM-103',
        sourceField: 'ANNUAL_REV_LOCAL',
        sourceValue: '-450000.00',
        proposedCanonical: 'annual_revenue_usd',
        confidenceScore: 0.31,
        status: 'blocked',
        issueType: 'format_error',
        issueDescription: 'Domain Rule Constraint: negative annual revenue is disallowed for customer entity.',
        aiSuggestedFix: '450000.00'
      }
    ]
  }
];

export const HumanInTheLoopExecutionConsole: React.FC<HumanInTheLoopExecutionConsoleProps> = ({
  activeMappings = [],
  selectedPreset = 'customer_sales_area',
  onReturnToWorkspace
}) => {
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);
  const currentJob = PRESET_JOBS[selectedJobIndex];

  const [records, setRecords] = useState<BatchRecord[]>(currentJob.records);
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs_review' | 'blocked' | 'quarantined' | 'auto_matched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stewardName, setStewardName] = useState('Slavisa Milinkovic');
  const [stewardRole, setStewardRole] = useState('Lead Data Steward');
  const [signOffRationale, setSignOffRationale] = useState('Production delta verification for financial period close.');
  const [commitHash, setCommitHash] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<{ id: string; time: string; msg: string; type: 'info' | 'override' | 'quarantine' }[]>([]);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Switch presets
  const handleSelectJob = (index: number) => {
    setSelectedJobIndex(index);
    setRecords(PRESET_JOBS[index].records);
    setIsCommitted(false);
    setCommitHash(null);
    setNotificationMsg(null);
  };

  // Stats calculation
  const totalInBatch = currentJob.meta.totalVolume;
  const sampleCount = records.length;
  const pendingCount = records.filter(r => r.status === 'needs_review').length;
  const blockedCount = records.filter(r => r.status === 'blocked').length;
  const quarantinedCount = records.filter(r => r.status === 'quarantined').length;
  const autoMatchedCount = records.filter(r => r.status === 'auto_matched').length;

  // Extrapolated volume estimates
  const estimatedAutoPassed = Math.round(totalInBatch * 0.94);
  const estimatedBlocked = blockedCount * 3;
  const estimatedReview = pendingCount * 12;

  // Filtered rows
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      if (activeFilter !== 'all' && rec.status !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.id.toLowerCase().includes(q) ||
          rec.sourceField.toLowerCase().includes(q) ||
          rec.sourceValue.toLowerCase().includes(q) ||
          rec.proposedCanonical.toLowerCase().includes(q) ||
          rec.issueDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, activeFilter, searchQuery]);

  // Actions
  const handleApproveRecord = (id: string, applyToSimilar = false) => {
    const targetRec = records.find(r => r.id === id);
    if (!targetRec) return;

    setRecords(prev => prev.map(r => {
      if (r.id === id || (applyToSimilar && r.sourceField === targetRec.sourceField)) {
        return {
          ...r,
          status: 'auto_matched',
          reviewedBy: `${stewardName} (${stewardRole})`,
          reviewedAt: new Date().toISOString().substring(11, 19) + ' UTC'
        };
      }
      return r;
    }));

    const msg = applyToSimilar
      ? `Steward approved ${targetRec.sourceField} and auto-applied resolution to all (${targetRec.similarOccurrencesCount || 1}) identical instances.`
      : `Steward approved record ${id} -> ${targetRec.proposedCanonical}. Registered in Semantic Decision Cache.`;

    setAuditLogs(prev => [
      { id: `AUD-${Date.now()}`, time: new Date().toLocaleTimeString(), msg, type: 'override' },
      ...prev
    ]);

    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleQuarantineRecord = (id: string) => {
    const targetRec = records.find(r => r.id === id);
    if (!targetRec) return;

    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'quarantined' } : r));

    const msg = `Record ${id} sent to Dead-Letter Queue (DLQ). Will not block execution of remaining ${totalInBatch - 1} records.`;
    setAuditLogs(prev => [
      { id: `AUD-${Date.now()}`, time: new Date().toLocaleTimeString(), msg, type: 'quarantine' },
      ...prev
    ]);
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleStartEdit = (rec: BatchRecord) => {
    setEditingRecordId(rec.id);
    setEditValue(rec.aiSuggestedFix || rec.sourceValue);
  };

  const handleSaveEdit = (id: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          sourceValue: editValue,
          status: 'auto_matched',
          issueDescription: `Manually corrected from original to: "${editValue}" by steward.`,
          confidenceScore: 1.0,
          reviewedBy: stewardName,
          reviewedAt: new Date().toLocaleTimeString()
        };
      }
      return r;
    }));
    setEditingRecordId(null);
    const msg = `Record ${id} corrected manually to "${editValue}". Status set to verified.`;
    setAuditLogs(prev => [
      { id: `AUD-${Date.now()}`, time: new Date().toLocaleTimeString(), msg, type: 'override' },
      ...prev
    ]);
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleRunDryRun = () => {
    setIsRunningDryRun(true);
    setTimeout(() => {
      setIsRunningDryRun(false);
      setAuditLogs(prev => [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          msg: `Dry-run completed in memory. ${estimatedAutoPassed} records passed cleanly. ${pendingCount} exceptions isolated for human review. Zero target DB mutations.`,
          type: 'info'
        },
        ...prev
      ]);
      setNotificationMsg(`Dry-Run finished successfully: 0 DB mutations. Found ${pendingCount} review warnings and ${blockedCount} blockers.`);
      setTimeout(() => setNotificationMsg(null), 5000);
    }, 1200);
  };

  const handleCommitBatch = () => {
    if (blockedCount > 0) return;
    const generatedHash = `sha256:7f89c02b${Math.floor(Math.random() * 899999 + 100000)}91d6e4a2c1`;
    setCommitHash(generatedHash);
    setIsCommitted(true);

    const msg = `BATCH COMMITTED: ${totalInBatch - quarantinedCount} verified records atomized into target ${currentJob.meta.targetCanonicalModel}. Hash: ${generatedHash}`;
    setAuditLogs(prev => [
      { id: `AUD-${Date.now()}`, time: new Date().toLocaleTimeString(), msg, type: 'info' },
      ...prev
    ]);
    setNotificationMsg(msg);
  };

  const handleDownloadAuditReport = () => {
    const reportData = {
      jobMeta: currentJob.meta,
      executionTimestamp: new Date().toISOString(),
      steward: { name: stewardName, role: stewardRole, rationale: signOffRationale },
      commitHash: commitHash || 'UNCOMMITTED_DRY_RUN',
      summary: {
        totalRecords: totalInBatch,
        autoMatched: autoMatchedCount,
        needsReview: pendingCount,
        blocked: blockedCount,
        quarantined: quarantinedCount
      },
      resolvedExceptions: records,
      auditTrail: auditLogs
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Semantra_HITL_Audit_${currentJob.meta.jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-slate-900 border border-emerald-500/60 shadow-xl rounded-xl p-3.5 flex items-center justify-between gap-3 text-sm text-emerald-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-xs">{notificationMsg}</span>
          </div>
          <button 
            onClick={() => setNotificationMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-slate-800 font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP HEADER & CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                MANAGED BATCH EXECUTION
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono text-slate-500 bg-slate-100 rounded border border-slate-200">
                Job ID: {currentJob.meta.jobId}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" />
                Contract: {currentJob.meta.dataContractRef}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              Human-in-the-Loop (HITL) Execution Console
            </h2>

            <p className="text-xs text-slate-500 font-sans">
              Source: <span className="font-mono text-slate-700 font-semibold">{currentJob.meta.sourceFile}</span> ({currentJob.meta.sourceSystem})
              <span className="mx-2 text-slate-300">|</span>
              Target: <span className="font-mono text-indigo-700 font-semibold">{currentJob.meta.targetCanonicalModel}</span>
            </p>
          </div>

          {/* Preset Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto justify-end">
            <select
              value={selectedJobIndex}
              onChange={(e) => handleSelectJob(Number(e.target.value))}
              className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PRESET_JOBS.map((j, idx) => (
                <option key={j.meta.jobId} value={idx}>
                  Preset: {j.meta.jobName} ({j.meta.totalVolume} rows)
                </option>
              ))}
            </select>

            <button
              onClick={handleRunDryRun}
              disabled={isRunningDryRun || isCommitted}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300/80 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Runs transform simulation in memory. Zero writes to target production system."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningDryRun ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
              <span>{isRunningDryRun ? 'Simulating in Memory...' : '1. Run Dry-Run Simulation'}</span>
            </button>

            <button
              onClick={handleCommitBatch}
              disabled={blockedCount > 0 || isCommitted || isRunningDryRun}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer ${
                isCommitted
                  ? 'bg-emerald-700 text-white shadow-emerald-900/20'
                  : blockedCount > 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/20'
              }`}
              title={blockedCount > 0 ? 'Resolve or quarantine all hard blockers before committing.' : 'Commit verified batch to target.'}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isCommitted 
                  ? 'Committed & Verified' 
                  : `2. Approve & Commit Batch (${totalInBatch - quarantinedCount - blockedCount} Rows)`}
              </span>
            </button>

            {onReturnToWorkspace && (
              <button
                onClick={onReturnToWorkspace}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Back to Pipeline
              </button>
            )}
          </div>
        </div>

        {/* WORKFLOW PIPELINE PROGRESS BAR */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-[11px] font-mono mb-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              EXECUTION PIPELINE STATE
            </span>
            <span className="text-slate-500">
              Contract Compliance: <strong className="text-emerald-700">100% Validated</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className={`p-2 rounded border flex items-center gap-2 ${
              isRunningDryRun ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                1
              </div>
              <div>
                <p className="font-bold leading-tight">Dry-Run Simulation</p>
                <p className="text-[10px] text-slate-500">In-memory isolation</p>
              </div>
            </div>

            <div className={`p-2 rounded border flex items-center gap-2 ${
              blockedCount > 0 ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                blockedCount > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-700'
              }`}>
                2
              </div>
              <div>
                <p className="font-bold leading-tight">Exception Engine</p>
                <p className="text-[10px] text-slate-500">{blockedCount > 0 ? `${blockedCount} Blockers Found` : 'Clean'}</p>
              </div>
            </div>

            <div className={`p-2 rounded border flex items-center gap-2 ${
              pendingCount > 0 && !isCommitted ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                pendingCount > 0 ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700'
              }`}>
                3
              </div>
              <div>
                <p className="font-bold leading-tight">Human Sign-off</p>
                <p className="text-[10px] text-slate-500">{pendingCount} Warnings</p>
              </div>
            </div>

            <div className={`p-2 rounded border flex items-center gap-2 ${
              isCommitted ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                isCommitted ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                4
              </div>
              <div>
                <p className="font-bold leading-tight">Verified Commit</p>
                <p className="text-[10px] text-slate-500">{isCommitted ? 'Atomized to DB' : 'Pending Sign-off'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* COMMIT HASH BANNER IF COMMITTED */}
        {isCommitted && commitHash && (
          <div className="bg-emerald-900 text-emerald-100 p-3.5 rounded-lg border border-emerald-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                <strong>TRANSACTION COMMITTED ATOMICALLY:</strong> {commitHash}
              </span>
            </div>
            <button
              onClick={handleDownloadAuditReport}
              className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded border border-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit Trail (.JSON)
            </button>
          </div>
        )}
      </div>

      {/* SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 font-medium block">Total Batch Records</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {totalInBatch.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">Full Ingestion Volume</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
          <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Auto-Mapped (100% Fit)
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
            {estimatedAutoPassed.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-emerald-600/80 mt-1 block">
            Confidence &ge; 90% (Zero Divergence)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs">
          <span className="text-[11px] font-mono text-amber-700 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Needs Steward Review
          </span>
          <div className="text-2xl font-extrabold text-amber-700 mt-1 font-mono">
            {pendingCount}
          </div>
          <span className="text-[10px] font-mono text-amber-600/80 mt-1 block">
            New aliases / marginal scores
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs">
          <span className="text-[11px] font-mono text-rose-700 font-semibold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Hard Blockers (Errors)
          </span>
          <div className="text-2xl font-extrabold text-rose-700 mt-1 font-mono">
            {blockedCount}
          </div>
          <span className="text-[10px] font-mono text-rose-600/80 mt-1 block">
            Strict schema / null violations
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200/80 shadow-xs">
          <span className="text-[11px] font-mono text-purple-700 font-semibold flex items-center gap-1">
            <Ban className="w-3.5 h-3.5 text-purple-600" />
            Quarantined (DLQ)
          </span>
          <div className="text-2xl font-extrabold text-purple-700 mt-1 font-mono">
            {quarantinedCount}
          </div>
          <span className="text-[10px] font-mono text-purple-600/80 mt-1 block">
            Isolated to Dead-Letter Queue
          </span>
        </div>
      </div>

      {/* INTERACTIVE BATCH EXCEPTION & OVERRIDE GRID */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Batch Exception Resolution Grid
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700 font-medium">
              Showing {filteredRecords.length} of {records.length} sampled items
            </span>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search field, ID, error..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({records.length})
              </button>
              <button
                onClick={() => setActiveFilter('needs_review')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeFilter === 'needs_review' ? 'bg-amber-500 text-white font-bold shadow-xs' : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Review ({pendingCount})
              </button>
              <button
                onClick={() => setActiveFilter('blocked')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeFilter === 'blocked' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-rose-800 hover:text-rose-950'
                }`}
              >
                Blocked ({blockedCount})
              </button>
              <button
                onClick={() => setActiveFilter('quarantined')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeFilter === 'quarantined' ? 'bg-purple-600 text-white font-bold shadow-xs' : 'text-purple-800 hover:text-purple-950'
                }`}
              >
                DLQ ({quarantinedCount})
              </button>
            </div>
          </div>
        </div>

        {/* The Exception Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/90 text-[10px] text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Source Field &amp; Raw Value</th>
                <th className="px-4 py-3">Proposed Canonical Field</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status &amp; Root Cause</th>
                <th className="px-4 py-3 text-right">Steward Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-mono text-xs">
                    No exceptions match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isEditing = editingRecordId === rec.id;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="font-bold text-slate-700">{rec.id}</div>
                        {rec.reviewedBy && (
                          <span className="text-[9px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                            <Check className="w-2.5 h-2.5" /> Reviewed
                          </span>
                        )}
                      </td>

                      {/* Source Field & Value */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 font-mono text-xs">{rec.sourceField}</div>
                        {isEditing ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-2 py-0.5 bg-white border border-indigo-400 rounded text-xs font-mono text-slate-900 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveEdit(rec.id)}
                              className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-semibold hover:bg-indigo-700 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRecordId(null)}
                              className="text-slate-400 hover:text-slate-600 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-slate-600 mt-0.5 bg-slate-100/80 px-1.5 py-0.5 rounded inline-block">
                            Value: <span className="font-bold text-slate-800">{rec.sourceValue}</span>
                          </div>
                        )}
                      </td>

                      {/* Proposed Canonical */}
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-700 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-indigo-400" />
                          <span>{rec.proposedCanonical}</span>
                        </div>
                        {rec.aiSuggestedFix && rec.status === 'blocked' && (
                          <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                            Suggested Coercion: <code className="text-slate-600 font-bold">{rec.aiSuggestedFix}</code>
                          </span>
                        )}
                      </td>

                      {/* Confidence Score */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  rec.confidenceScore >= 0.9 ? 'bg-emerald-500' : 
                                  rec.confidenceScore >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${rec.confidenceScore * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {Math.round(rec.confidenceScore * 100)}%
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 block">
                            {rec.confidenceScore >= 0.9 ? 'Safe / Deterministic' : rec.confidenceScore >= 0.7 ? 'Marginal Drift' : 'Type / Schema Conflict'}
                          </span>
                        </div>
                      </td>

                      {/* Status & Issue */}
                      <td className="px-4 py-3.5 max-w-xs">
                        {rec.status === 'auto_matched' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed / Auto-Matched
                          </span>
                        )}
                        {rec.status === 'needs_review' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-700" /> Needs Review
                            </span>
                            <p className="text-[11px] text-amber-900/90 leading-tight">{rec.issueDescription}</p>
                            {rec.similarOccurrencesCount && (
                              <span className="text-[9px] font-mono text-slate-500 block">
                                Affects {rec.similarOccurrencesCount} identical records in batch
                              </span>
                            )}
                          </div>
                        )}
                        {rec.status === 'blocked' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                              <XCircle className="w-3 h-3 text-rose-700" /> Hard Blocker
                            </span>
                            <p className="text-[11px] text-rose-900 leading-tight">{rec.issueDescription}</p>
                          </div>
                        )}
                        {rec.status === 'quarantined' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">
                              <Ban className="w-3 h-3 text-purple-700" /> Quarantined (DLQ)
                            </span>
                            <p className="text-[10px] text-purple-800/80 leading-tight">Isolated to Dead-Letter Queue. Execution unblocked.</p>
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.status === 'needs_review' && (
                            <>
                              <button
                                onClick={() => handleApproveRecord(rec.id, false)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded transition-colors cursor-pointer shadow-xs"
                                title="Approve this single record"
                              >
                                Approve
                              </button>
                              {rec.similarOccurrencesCount && rec.similarOccurrencesCount > 1 && (
                                <button
                                  onClick={() => handleApproveRecord(rec.id, true)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                  title={`Authorize alias and apply to all ${rec.similarOccurrencesCount} records`}
                                >
                                  <Sparkles className="w-3 h-3 text-indigo-600" />
                                  Apply to All ({rec.similarOccurrencesCount})
                                </button>
                              )}
                            </>
                          )}

                          {rec.status === 'blocked' && (
                            <>
                              <button
                                onClick={() => handleStartEdit(rec)}
                                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors cursor-pointer"
                                title="Edit invalid value inline"
                              >
                                Correct Value
                              </button>
                              <button
                                onClick={() => handleQuarantineRecord(rec.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded transition-colors cursor-pointer flex items-center gap-1"
                                title="Quarantine row to DLQ and unblock batch execution"
                              >
                                <Ban className="w-3 h-3 text-purple-600" />
                                Quarantine (DLQ)
                              </button>
                            </>
                          )}

                          {rec.status === 'auto_matched' && (
                            <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                            </span>
                          )}

                          {rec.status === 'quarantined' && (
                            <button
                              onClick={() => {
                                setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'blocked' } : r));
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-800 underline font-mono"
                            >
                              Restore
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

      {/* AUDIT SIGN-OFF & COMPLIANCE FOOTER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
              Steward Digital Sign-off &amp; Regulatory Audit (SOC2 / ISO 27001 / EU AI Act Art. 14)
            </h4>
          </div>
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
            <span>Audit Ledger Ref:</span>
            <code className="text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              AUDIT-2026-0905-HITL
            </code>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-slate-500 font-medium text-[10px] uppercase">Data Steward Name</label>
            <input
              type="text"
              value={stewardName}
              onChange={(e) => setStewardName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500 font-medium text-[10px] uppercase">Governance Role / Authority</label>
            <input
              type="text"
              value={stewardRole}
              onChange={(e) => setStewardRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500 font-medium text-[10px] uppercase">Approval Rationale</label>
            <input
              type="text"
              value={signOffRationale}
              onChange={(e) => setSignOffRationale(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Live Audit Log Stream */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5">
            <span className="font-bold flex items-center gap-1 text-slate-700">
              <Clock className="w-3 h-3 text-indigo-600" />
              SESSION AUDIT LOG TRAIL
            </span>
            <button
              onClick={handleDownloadAuditReport}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Download Audit Session Report (.JSON)
            </button>
          </div>

          <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto border border-slate-800">
            {auditLogs.length === 0 ? (
              <div className="text-slate-500 italic">
                Session initialized. Awaiting Dry-Run or manual steward override actions.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-500 text-[10px]">[{log.time}]</span>
                  <span className={
                    log.type === 'override' ? 'text-amber-300' :
                    log.type === 'quarantine' ? 'text-purple-300' : 'text-emerald-400'
                  }>
                    {log.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default HumanInTheLoopExecutionConsole;
