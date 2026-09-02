import React, { useState } from 'react';
import { 
  GitBranch, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Copy, 
  Check, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Database, 
  ShieldAlert, 
  ArrowRight,
  Code2,
  FileJson,
  Zap
} from 'lucide-react';

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
}

interface DriftAnalysisResult {
  status: 'MATCHED_V1' | 'NON_BREAKING_DRIFT_ADAPTED' | 'BREAKING_DRIFT_QUARANTINE';
  severity: 'success' | 'warning' | 'error';
  summary: string;
  missingRequired: string[];
  newDynamicFields: string[];
  typeMismatches: string[];
  adaptedPayload: Record<string, any>;
  dynamicAttributes: Record<string, any>;
  suggestedVersion: string;
  evolutionProposal?: {
    suggestedNewVersion: string;
    newFieldsToPromote: { field: string; detectedType: string; suggestedCanonicalName: string }[];
    backwardCompatibilityScore: number;
    recommendedAction: string;
  };
}

const DEFAULT_REGISTERED_SCHEMA: SchemaField[] = [
  { name: 'invoice_id', type: 'string', required: true },
  { name: 'vendor_id', type: 'string', required: true },
  { name: 'amount', type: 'float', required: true },
  { name: 'currency', type: 'string', required: true },
  { name: 'issue_date', type: 'string', required: true }
];

const PRESET_PAYLOADS = [
  {
    name: 'Scenario 1: Additive Non-Breaking Drift (New Optional Tax & Line Items)',
    description: 'Client introduced `tax_exemption_code` & `cost_center_code` without breaking existing fields.',
    payload: JSON.stringify({
      invoice_id: "INV-2026-9901",
      vendor_id: "VND-BOSCH",
      amount: 4200.00,
      currency: "EUR",
      issue_date: "2026-08-31T00:00:00Z",
      tax_exemption_code: "TAX_FREE_EU",
      cost_center_code: "CC-CENTRAL-88"
    }, null, 2)
  },
  {
    name: 'Scenario 2: Breaking Drift (Missing Required `vendor_id` -> Quarantine DLQ)',
    description: 'Upstream vendor dropped required field `vendor_id`. Redirected to Dead-Letter Queue without crashing.',
    payload: JSON.stringify({
      invoice_id: "INV-2026-9902",
      amount: 1540.50,
      currency: "USD",
      issue_date: "2026-08-31T00:00:00Z",
      notes: "Urgent shipment"
    }, null, 2)
  },
  {
    name: 'Scenario 3: 100% Strict Schema Match (v1.0 Baseline)',
    description: 'Standard payload matching registered v1.0 schema contract perfectly.',
    payload: JSON.stringify({
      invoice_id: "INV-2026-1001",
      vendor_id: "VND-SIEMENS",
      amount: 8750.00,
      currency: "EUR",
      issue_date: "2026-09-01T00:00:00Z"
    }, null, 2)
  }
];

export const SchemaDriftStudio: React.FC = () => {
  const [registeredSchema, setRegisteredSchema] = useState<SchemaField[]>(DEFAULT_REGISTERED_SCHEMA);
  const [schemaVersion, setSchemaVersion] = useState<string>('v1.0');
  const [rawPayloadInput, setRawPayloadInput] = useState<string>(PRESET_PAYLOADS[0].payload);
  const [analysisResult, setAnalysisResult] = useState<DriftAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'adapted_json' | 'python_code'>('visual');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const runDriftDetection = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const parsed = JSON.parse(rawPayloadInput);
        const registeredMap = new Map(registeredSchema.map(f => [f.name, f]));
        const requiredNames = registeredSchema.filter(f => f.required).map(f => f.name);
        const incomingKeys = Object.keys(parsed);

        const missingRequired = requiredNames.filter(name => !(name in parsed) || parsed[name] === null || parsed[name] === undefined);
        const newDynamicFields = incomingKeys.filter(k => !registeredMap.has(k));

        if (missingRequired.length > 0) {
          setAnalysisResult({
            status: 'BREAKING_DRIFT_QUARANTINE',
            severity: 'error',
            summary: `Breaking schema mismatch: ${missingRequired.length} required field(s) missing from payload. Ingest stream routed safely to Quarantine Dead Letter Queue (DLQ).`,
            missingRequired,
            newDynamicFields,
            typeMismatches: [],
            adaptedPayload: {},
            dynamicAttributes: {},
            suggestedVersion: schemaVersion
          });
        } else if (newDynamicFields.length > 0) {
          const adapted: Record<string, any> = {};
          const dynamics: Record<string, any> = {};

          incomingKeys.forEach(k => {
            if (registeredMap.has(k)) {
              adapted[k] = parsed[k];
            } else {
              dynamics[k] = parsed[k];
            }
          });
          adapted._unmapped_dynamic_attributes = dynamics;

          setAnalysisResult({
            status: 'NON_BREAKING_DRIFT_ADAPTED',
            severity: 'warning',
            summary: `Additive Non-Breaking Drift detected: ${newDynamicFields.length} new optional field(s) detected. Automatically isolated into \`_unmapped_dynamic_attributes\` JSONB context without pipeline interruption.`,
            missingRequired: [],
            newDynamicFields,
            typeMismatches: [],
            adaptedPayload: adapted,
            dynamicAttributes: dynamics,
            suggestedVersion: 'v1.1',
            evolutionProposal: {
              suggestedNewVersion: 'v1.1',
              newFieldsToPromote: newDynamicFields.map(f => ({
                field: f,
                detectedType: typeof parsed[f] === 'number' ? 'float' : typeof parsed[f] === 'boolean' ? 'boolean' : 'string',
                suggestedCanonicalName: `ext_${f}`
              })),
              backwardCompatibilityScore: 98.5,
              recommendedAction: 'Approve & evolve Schema Contract to v1.1. Auto-generate dbt/PySpark column transforms.'
            }
          });
        } else {
          setAnalysisResult({
            status: 'MATCHED_V1',
            severity: 'success',
            summary: `Payload perfectly matches registered ${schemaVersion} contract. 0 breaking changes, 0 unmapped attributes.`,
            missingRequired: [],
            newDynamicFields: [],
            typeMismatches: [],
            adaptedPayload: parsed,
            dynamicAttributes: {},
            suggestedVersion: schemaVersion
          });
        }
      } catch (err: any) {
        setAnalysisResult({
          status: 'BREAKING_DRIFT_QUARANTINE',
          severity: 'error',
          summary: `Malformed JSON Payload: ${err.message || 'Invalid JSON syntax'}. Ingest stream rejected.`,
          missingRequired: [],
          newDynamicFields: [],
          typeMismatches: [],
          adaptedPayload: {},
          dynamicAttributes: {},
          suggestedVersion: schemaVersion
        });
      }
      setIsAnalyzing(false);
    }, 200);
  };

  const handlePromoteEvolution = () => {
    if (!analysisResult?.evolutionProposal) return;
    const newFields: SchemaField[] = analysisResult.evolutionProposal.newFieldsToPromote.map(f => ({
      name: f.field,
      type: f.detectedType,
      required: false
    }));
    setRegisteredSchema(prev => [...prev, ...newFields]);
    setSchemaVersion(analysisResult.evolutionProposal.suggestedNewVersion);
    alert(`Schema promoted to ${analysisResult.evolutionProposal.suggestedNewVersion}! Added ${newFields.length} new optional attributes to Registry.`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const pythonSnippet = `# Semantra Schema Drift Engine (Pydantic V2 Model & Dynamic JSONB Adaptation)
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime

class InvoiceCanonicalContractV1(BaseModel):
    """
    Semantra Canonical Contract v1.0 sa ugrađenom podrškom za Dynamic JSONB Drift.
    Pydantic V2 automatski pakuje sva nova/nepoznata polja u \`model_extra\`.
    """
    model_config = ConfigDict(
        extra='allow',                # Ključno: nova polja se automatski prihvataju bez rušenja validacije
        str_strip_whitespace=True,
        populate_by_name=True
    )

    # Invarijantna obavezna polja (Strict Invariants)
    invoice_id: str = Field(..., description="Jedinstveni primarni identifikator fakture")
    vendor_id: str = Field(..., description="ID vendora / dobavljača")
    amount: float = Field(..., gt=0.0, description="Iznos fakture mora biti strogo pozitivan")
    currency: str = Field(default="EUR", max_length=3, description="ISO valutni kod")
    issue_date: str = Field(..., description="Datum izdavanja u ISO formatu")

class SemantraPydanticDriftEngine:
    @staticmethod
    def ingest_and_adapt(raw_json: Dict[str, Any]) -> Tuple[str, Dict[str, Any], Optional[List[str]]]:
        """
        Validira i adaptira dolazni payload kroz Pydantic V2 u mikrosekundama.
        Vraća: (drift_status, adapted_payload, error_list)
        """
        try:
            # 1. Pydantic V2 brza C-level/Rust validacija
            validated_model = InvoiceCanonicalContractV1.model_validate(raw_json)
            adapted_payload = validated_model.model_dump()

            # 2. Additive Non-Breaking Drift -> Pydantic model_extra
            dynamic_extras = validated_model.model_extra or {}
            if dynamic_extras:
                # Sva nepoznata polja bezbedno smeštamo u JSONB buffer
                adapted_payload["_unmapped_dynamic_attributes"] = dynamic_extras
                print(f"[NON-BREAKING DRIFT] Detektovano {len(dynamic_extras)} novih polja -> Pakovano u JSONB buffer.")
                return "NON_BREAKING_DRIFT_ADAPTED", adapted_payload, None

            return "EXACT_MATCH_V1", adapted_payload, None

        except ValidationError as err:
            # 3. Breaking Drift -> Nedostaju obavezna polja ili nevalidan tip -> DLQ Karantin
            errors = [f"Polje '{e['loc'][0]}': {e['msg']}" for e in err.errors()]
            print(f"[BREAKING DRIFT QUARANTINE] Poruka odbačena u DLQ: {errors}")
            return "BREAKING_DRIFT_QUARANTINE", {}, errors

# --- RUNTIME SIMULACIJA ---
if __name__ == "__main__":
    # Primer 1: Additive Drift sa novim SAP poljem 'tax_exemption_code'
    raw_partner_payload = {
        "invoice_id": "INV-2026-9011",
        "vendor_id": "VND-8822",
        "amount": 14500.50,
        "currency": "EUR",
        "issue_date": "2026-08-31",
        "tax_exemption_code": "EXEMPT-EU-ART138"  # Novo nestandardno polje!
    }

    status, payload, errors = SemantraPydanticDriftEngine.ingest_and_adapt(raw_partner_payload)
    print(f"Status: {status}")
    print(f"Adapted Data: {payload}")`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                P0 Enterprise Resilience
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Registry: {schemaVersion}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                Execution Target: Databricks / Snowflake / Pydantic Ingestion
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-indigo-400" />
              Automated Schema Drift Detection & Evolution Engine
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              <strong>Control Plane Sandbox:</strong> Prevents pipeline crashes when upstream ERPs alter payload contracts. Semantra tests drift scenarios on sample payloads and generates Pydantic V2 &amp; SQL DDL adapters that execute natively inside your existing Databricks, Snowflake, or API ingestion pipelines.
            </p>
          </div>
          <button
            onClick={runDriftDetection}
            disabled={isAnalyzing}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isAnalyzing ? 'Evaluating Drift...' : 'Evaluate Schema Drift'}</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_PAYLOADS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setRawPayloadInput(preset.payload);
              setAnalysisResult(null);
            }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              rawPayloadInput === preset.payload
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">{preset.name.split(':')[0]}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {idx === 0 ? 'Additive' : idx === 1 ? 'Breaking' : 'Exact'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{preset.description}</p>
          </button>
        ))}
      </div>

      {/* Main Dual Pane: Schema Registry vs Incoming Payload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Schema Contract (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Registered Schema Registry</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                Version {schemaVersion}
              </span>
            </div>

            <div className="space-y-2">
              {registeredSchema.map((field) => (
                <div key={field.name} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{field.name}</span>
                    {field.required ? (
                      <span className="text-[9px] font-sans uppercase font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100">
                        Required
                      </span>
                    ) : (
                      <span className="text-[9px] font-sans uppercase font-medium text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px]">{field.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
              Contract enforced on ingress by Semantra Invariant Gateway.
            </p>
          </div>
        </div>

        {/* Right Column: Incoming Payload Editor (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Raw Incoming B2B Ingestion Payload</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Accepts arbitrary JSON / EDI payloads</span>
          </div>

          <div>
            <textarea
              value={rawPayloadInput}
              onChange={(e) => setRawPayloadInput(e.target.value)}
              rows={9}
              className="w-full font-mono text-xs p-3.5 rounded-lg bg-slate-900 text-emerald-300 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none shadow-inner"
              placeholder="Paste raw JSON message here..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Try modifying keys or adding new custom attributes to test real-time drift response.</span>
            </div>
            <button
              onClick={runDriftDetection}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Analyze Contract Diff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Output Dashboard */}
      {analysisResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in">
          {/* Status Bar */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            analysisResult.severity === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : analysisResult.severity === 'warning'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-start gap-3">
              {analysisResult.severity === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : analysisResult.severity === 'warning' ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded uppercase tracking-wider bg-white/80 border border-slate-200 shadow-2xs">
                    {analysisResult.status}
                  </span>
                  <span className="text-xs font-semibold">
                    {analysisResult.severity === 'success' ? 'Pipeline 100% Operational' : analysisResult.severity === 'warning' ? 'Auto-Adaptive Mode Active (0 Downtime)' : 'Quarantined in DLQ'}
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed font-sans">{analysisResult.summary}</p>
              </div>
            </div>

            {analysisResult.evolutionProposal && (
              <button
                onClick={handlePromoteEvolution}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Evolve Contract to {analysisResult.evolutionProposal.suggestedNewVersion}</span>
              </button>
            )}
          </div>

          {/* Tabbed Result Inspection */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'visual' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Visual Attribute Triage
                </button>
                <button
                  onClick={() => setActiveTab('adapted_json')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'adapted_json' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Adapted Canonical Payload (JSONB)
                </button>
                <button
                  onClick={() => setActiveTab('python_code')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'python_code' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Python Architecture Module
                </button>
              </div>

              {activeTab === 'python_code' && (
                <button
                  onClick={() => copyCode(pythonSnippet)}
                  className="px-2.5 py-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Python Class'}</span>
                </button>
              )}
            </div>

            {/* Visual Triage View */}
            {activeTab === 'visual' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Regular Mapped Attributes */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">✅ Registered Attributes</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      {Object.keys(analysisResult.adaptedPayload).filter(k => k !== '_unmapped_dynamic_attributes').length} Mapped
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(analysisResult.adaptedPayload)
                      .filter(([k]) => k !== '_unmapped_dynamic_attributes')
                      .map(([k, v]) => (
                        <div key={k} className="p-2 bg-white rounded border border-slate-200 text-xs font-mono flex items-center justify-between">
                          <span className="text-slate-700 font-semibold">{k}</span>
                          <span className="text-slate-400 truncate max-w-[120px]">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Dynamic JSONB Attributes */}
                <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-900">⚡ Dynamic JSONB Fields</span>
                    <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      {analysisResult.newDynamicFields.length} Isolated
                    </span>
                  </div>
                  {analysisResult.newDynamicFields.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No dynamic attributes detected in payload.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {analysisResult.newDynamicFields.map(field => (
                        <div key={field} className="p-2 bg-white rounded border border-amber-200 text-xs font-mono flex items-center justify-between">
                          <span className="text-amber-900 font-bold">{field}</span>
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                            {JSON.stringify(analysisResult.dynamicAttributes[field])}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing / Quarantine DLQ */}
                <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-rose-900">🚨 Missing Required / DLQ</span>
                    <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                      {analysisResult.missingRequired.length} Critical
                    </span>
                  </div>
                  {analysisResult.missingRequired.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 p-2 bg-emerald-50/60 rounded border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>All required invariants present.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {analysisResult.missingRequired.map(field => (
                        <div key={field} className="p-2 bg-white rounded border border-rose-200 text-xs font-mono flex items-center justify-between">
                          <span className="text-rose-700 font-bold">{field}</span>
                          <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                            DLQ Route
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Adapted JSON Output */}
            {activeTab === 'adapted_json' && (
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                {JSON.stringify(analysisResult.adaptedPayload, null, 2)}
              </pre>
            )}

            {/* Python Implementation Code */}
            {activeTab === 'python_code' && (
              <pre className="p-4 rounded-xl bg-slate-900 text-indigo-300 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                {pythonSnippet}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
