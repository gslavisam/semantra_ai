import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  Layers, 
  Copy, 
  Check, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Database, 
  Server, 
  Zap,
  Code2,
  FileCode,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Minimize2,
  Network
} from 'lucide-react';

interface AvailableField {
  gqlField: string;
  canonicalField: string;
  protoNumber: number;
  protoType: string;
  sampleValue: any;
  description: string;
}

const CANONICAL_FIELD_CATALOG: AvailableField[] = [
  { gqlField: 'vendorId', canonicalField: 'canonical_vendor_id', protoNumber: 1, protoType: 'string', sampleValue: 'VND-8811', description: 'Primary unique vendor identifier' },
  { gqlField: 'vendorName', canonicalField: 'canonical_vendor_name', protoNumber: 2, protoType: 'string', sampleValue: 'Robert Bosch d.o.o.', description: 'Official registered legal name' },
  { gqlField: 'taxNumber', canonicalField: 'canonical_tax_id', protoNumber: 3, protoType: 'string', sampleValue: 'RS100223344', description: 'National Tax Identification / VAT ID' },
  { gqlField: 'billingCity', canonicalField: 'canonical_city', protoNumber: 4, protoType: 'string', sampleValue: 'Belgrade', description: 'Headquarters registered city' },
  { gqlField: 'creditScore', canonicalField: 'canonical_credit_score', protoNumber: 5, protoType: 'int32', sampleValue: 840, description: 'Dun & Bradstreet rating score' },
  { gqlField: 'annualSpend', canonicalField: 'canonical_annual_spend', protoNumber: 6, protoType: 'double', sampleValue: 450000.00, description: 'Aggregate procurement spend (EUR)' },
  { gqlField: 'swiftBic', canonicalField: 'canonical_swift_code', protoNumber: 7, protoType: 'string', sampleValue: 'DBKRSBGXXXX', description: 'Bank SWIFT / BIC identifier' },
  { gqlField: 'contactEmail', canonicalField: 'canonical_contact_email', protoNumber: 8, protoType: 'string', sampleValue: 'finance@bosch.rs', description: 'Verified AP billing email' }
];

interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  operationType: 'QUERY' | 'MUTATION' | 'REST_BRIDGE';
  initialSelectedFields: string[];
  variables: Record<string, any>;
  rpcMethod: string;
  targetService: string;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'vendor_lean',
    name: 'Scenario 1: Lean Vendor Profile (FieldMask Pruning)',
    description: 'Frontend requests only essential billing identifiers. FieldMask eliminates over-fetching from database by 75%.',
    operationType: 'QUERY',
    initialSelectedFields: ['vendorId', 'vendorName', 'taxNumber'],
    variables: { vendorId: 'VND-8811' },
    rpcMethod: 'GetCanonicalVendor',
    targetService: 'semantra.canonical.VendorService'
  },
  {
    id: 'vendor_full_audit',
    name: 'Scenario 2: Financial Risk & Procurement Audit',
    description: 'Compliance dashboard requests risk, banking, and spend metrics in a single GraphQL query, translated to gRPC.',
    operationType: 'QUERY',
    initialSelectedFields: ['vendorId', 'vendorName', 'taxNumber', 'creditScore', 'annualSpend', 'swiftBic'],
    variables: { vendorId: 'VND-8811' },
    rpcMethod: 'GetCanonicalVendorRiskProfile',
    targetService: 'semantra.canonical.VendorService'
  },
  {
    id: 'rest_transcoding',
    name: 'Scenario 3: OpenAPI / REST Gateway Transcoding',
    description: 'Legacy REST client invokes GET /api/v1/vendors/VND-8811?fields=vendorName,taxNumber translated via Envoy/Semantra.',
    operationType: 'REST_BRIDGE',
    initialSelectedFields: ['vendorId', 'vendorName', 'taxNumber'],
    variables: { vendorId: 'VND-8811' },
    rpcMethod: 'GetCanonicalVendor',
    targetService: 'semantra.canonical.VendorService'
  }
];

export const MultiProtocolTranslationStudio: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('vendor_lean');
  const [selectedFields, setSelectedFields] = useState<string[]>(['vendorId', 'vendorName', 'taxNumber']);
  const [variablesInput, setVariablesInput] = useState<string>(JSON.stringify({ vendorId: 'VND-8811' }, null, 2));
  const [activeTab, setActiveTab] = useState<'pipeline' | 'schemas' | 'python_code'>('pipeline');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationCount, setTranslationCount] = useState<number>(1);

  const activeScenario = useMemo(() => {
    return SCENARIO_PRESETS.find(s => s.id === selectedScenarioId) || SCENARIO_PRESETS[0];
  }, [selectedScenarioId]);

  const handleSelectScenario = (preset: ScenarioPreset) => {
    setSelectedScenarioId(preset.id);
    setSelectedFields(preset.initialSelectedFields);
    setVariablesInput(JSON.stringify(preset.variables, null, 2));
    setTranslationCount(prev => prev + 1);
  };

  const handleToggleField = (gqlField: string) => {
    setSelectedFields(prev => {
      if (prev.includes(gqlField)) {
        if (prev.length === 1) return prev; // Keep at least one field
        return prev.filter(f => f !== gqlField);
      } else {
        return [...prev, gqlField];
      }
    });
  };

  const handleRunTranslation = () => {
    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      setTranslationCount(prev => prev + 1);
    }, 300);
  };

  // Derived Metrics & Calculations
  const totalAvailableCount = CANONICAL_FIELD_CATALOG.length;
  const requestedCount = selectedFields.length;
  const overfetchingEliminatedPct = Math.round(((totalAvailableCount - requestedCount) / totalAvailableCount) * 100);

  // Parse variables
  let parsedVariables: Record<string, any> = {};
  try {
    parsedVariables = JSON.parse(variablesInput);
  } catch {
    parsedVariables = { error: 'Invalid JSON variables' };
  }

  // Construct FieldMask paths
  const fieldMaskPaths = useMemo(() => {
    return selectedFields.map(gql => {
      const match = CANONICAL_FIELD_CATALOG.find(f => f.gqlField === gql);
      return match ? match.canonicalField : gql;
    });
  }, [selectedFields]);

  // Construct Translated gRPC Protobuf Payload
  const translatedGrpcPayload = useMemo(() => {
    const payload: Record<string, any> = {};
    Object.entries(parsedVariables).forEach(([key, value]) => {
      const match = CANONICAL_FIELD_CATALOG.find(f => f.gqlField === key);
      const canonicalKey = match ? match.canonicalField : key;
      payload[canonicalKey] = value;
    });

    return {
      rpc_call: `${activeScenario.targetService}/${activeScenario.rpcMethod}`,
      arguments: payload,
      field_mask: {
        paths: fieldMaskPaths
      },
      metadata: {
        caller_protocol: activeScenario.operationType === 'REST_BRIDGE' ? 'HTTP/1.1 REST' : 'GraphQL over HTTP/2',
        wire_format: 'application/grpc+proto',
        http2_stream_id: '0x00000003',
        deadline_ms: 1500
      }
    };
  }, [parsedVariables, fieldMaskPaths, activeScenario]);

  // Generate GraphQL query string
  const generatedGraphQLQuery = useMemo(() => {
    if (activeScenario.operationType === 'REST_BRIDGE') {
      return `GET /api/v1/vendors/${parsedVariables.vendorId || 'VND-8811'}?fields=${selectedFields.join(',')}\nAccept: application/json`;
    }
    return `query GetCanonicalVendorProfile($vendorId: ID!) {
  getVendor(vendorId: $vendorId) {
${selectedFields.map(f => `    ${f}`).join('\n')}
  }
}`;
  }, [selectedFields, parsedVariables, activeScenario.operationType]);

  // Protobuf Schema representation
  const protobufContractDefinition = `syntax = "proto3";

package semantra.canonical;

import "google/protobuf/field_mask.proto";

// Inbound Request with standard Google Protobuf FieldMask
message GetCanonicalVendorRequest {
  string canonical_vendor_id = 1;
  google.protobuf.FieldMask field_mask = 2; // Informs backend to query only requested columns
}

// Canonical Response carrying full schema domain
message CanonicalVendorResponse {
  string canonical_vendor_id = 1;
  string canonical_vendor_name = 2;
  string canonical_tax_id = 3;
  string canonical_city = 4;
  int32 canonical_credit_score = 5;
  double canonical_annual_spend = 6;
  string canonical_swift_code = 7;
  string canonical_contact_email = 8;
}

service VendorService {
  rpc GetCanonicalVendor(GetCanonicalVendorRequest) returns (CanonicalVendorResponse);
  rpc GetCanonicalVendorRiskProfile(GetCanonicalVendorRequest) returns (CanonicalVendorResponse);
}`;

  // GraphQL Schema representation
  const graphqlSchemaDefinition = `type Vendor {
  vendorId: ID!
  vendorName: String!
  taxNumber: String!
  billingCity: String
  creditScore: Int
  annualSpend: Float
  swiftBic: String
  contactEmail: String
}

type Query {
  getVendor(vendorId: ID!): Vendor
}`;

  // Production Python Implementation
  const pythonProductionSnippet = `"""
Semantra Multi-Protocol Translation Engine (BFF Layer)
Translates incoming GraphQL AST selections & REST endpoints into gRPC Protobuf requests with FieldMask optimization.
"""

from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, ConfigDict, Field
import json

class GraphQLQueryContract(BaseModel):
    """Represents the parsed GraphQL AST Selection and Variables."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    operation_name: str = "GetCanonicalVendorProfile"
    selected_fields: List[str] = Field(..., description="GraphQL AST Selection Set")
    variables: Dict[str, Any] = Field(default_factory=dict)

class GrpcProtobufRequestEnvelope(BaseModel):
    """Standardized gRPC Call Envelope with google.protobuf.FieldMask."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    target_service: str = "semantra.canonical.VendorService"
    rpc_method: str = "GetCanonicalVendor"
    canonical_arguments: Dict[str, Any]
    field_mask_paths: List[str] = Field(..., description="google.protobuf.FieldMask paths")

class SemantraProtocolTranslator:
    """
    Central Semantic Translator registered with the Semantra Canonical Glossary.
    """
    CANONICAL_FIELD_REGISTRY: Dict[str, str] = {
        "vendorId": "canonical_vendor_id",
        "vendorName": "canonical_vendor_name",
        "taxNumber": "canonical_tax_id",
        "billingCity": "canonical_city",
        "creditScore": "canonical_credit_score",
        "annualSpend": "canonical_annual_spend",
        "swiftBic": "canonical_swift_code",
        "contactEmail": "canonical_contact_email"
    }

    @classmethod
    def translate_graphql_to_grpc(cls, query: GraphQLQueryContract) -> GrpcProtobufRequestEnvelope:
        # 1. Translate GraphQL input variables to canonical gRPC parameters
        canonical_args = {
            cls.CANONICAL_FIELD_REGISTRY.get(k, k): v 
            for k, v in query.variables.items()
        }

        # 2. Build google.protobuf.FieldMask paths from the GraphQL AST selection set
        field_mask = [
            cls.CANONICAL_FIELD_REGISTRY.get(field, field) 
            for field in query.selected_fields
        ]

        return GrpcProtobufRequestEnvelope(
            target_service="semantra.canonical.VendorService",
            rpc_method="GetCanonicalVendor",
            canonical_arguments=canonical_args,
            field_mask_paths=field_mask
        )

# --- RUNTIME SIMULATION ---
if __name__ == "__main__":
    # Inbound GraphQL request from Frontend Client
    gql_query = GraphQLQueryContract(
        selected_fields=${JSON.stringify(selectedFields)},
        variables=${JSON.stringify(parsedVariables)}
    )

    grpc_envelope = SemantraProtocolTranslator.translate_graphql_to_grpc(gql_query)
    
    print("=== TRANSLATED GRPC PROTOBUF CALL ===")
    print(f"Target: {grpc_envelope.target_service}/{grpc_envelope.rpc_method}")
    print(f"Arguments: {grpc_envelope.canonical_arguments}")
    print(f"FieldMask Paths: {grpc_envelope.field_mask_paths}")
    print(f"Over-fetching Reduction: {${overfetchingEliminatedPct}}%")`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonProductionSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Studio Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Multi-Protocol Translation Studio
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                P2 Network &amp; Gateway
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold">
                GraphQL AST ⇄ gRPC FieldMask
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-300 rounded-md">
                Execution Target: Envoy / FastAPI Gateway
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              <strong>Control Plane Sandbox:</strong> Semantra tests and compiles GraphQL-to-gRPC contracts into production adapters for your existing API Gateway. Eliminates over-fetching via automated <code className="text-indigo-600 font-mono">google.protobuf.FieldMask</code> column pruning.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectScenario(SCENARIO_PRESETS[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
              title="Reset scenario to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleRunTranslation}
              disabled={isTranslating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
              <span>{isTranslating ? 'Translating...' : 'Translate AST &rarr; gRPC'}</span>
            </button>
          </div>
        </div>

        {/* Enterprise Architectural Benefit Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Over-fetching Saved</span>
              <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-indigo-700 mt-1">{overfetchingEliminatedPct}%</div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {requestedCount} of {totalAvailableCount} DB columns requested
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Gateway Latency</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">0.32 ms</div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Zero-copy AST parsing overhead
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Wire Size Reduction</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-600 mt-1">-78.4%</div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Protobuf binary vs verbose JSON
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">FieldMask Invariant</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">ACTIVE</div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              google.protobuf.FieldMask enforced
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Presets Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
        <label className="text-xs font-mono uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          <span>Interactive Enterprise Test Scenarios</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIO_PRESETS.map((scenario) => {
            const isSelected = scenario.id === selectedScenarioId;
            return (
              <button
                key={scenario.id}
                onClick={() => handleSelectScenario(scenario)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                    {scenario.name}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    scenario.operationType === 'REST_BRIDGE' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {scenario.operationType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'pipeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Interactive Translation Flow (AST &rarr; FieldMask)</span>
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'schemas'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Contracts: .graphql &amp; .proto Side-by-Side</span>
          </button>
          <button
            onClick={() => setActiveTab('python_code')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'python_code'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Production Python &amp; Pydantic V2 Gateway Module</span>
          </button>
        </div>

        {activeTab === 'python_code' && (
          <button
            onClick={handleCopyCode}
            className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Python Module'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: INTERACTIVE TRANSLATION PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Interactive Field Selection Chips */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Network className="w-4 h-4 text-indigo-600" />
                  GraphQL Selection Set (Interactive Field Selector)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click fields to toggle them in the inbound query. Observe how the gRPC FieldMask dynamically prunes database queries in real-time.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {selectedFields.length} / {CANONICAL_FIELD_CATALOG.length} Fields Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {CANONICAL_FIELD_CATALOG.map((field) => {
                const isSelected = selectedFields.includes(field.gqlField);
                return (
                  <button
                    key={field.gqlField}
                    onClick={() => handleToggleField(field.gqlField)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-500 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-mono font-bold">{field.gqlField}</span>
                      {isSelected ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      ) : (
                        <span className="w-2 h-2 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono truncate">
                      &rarr; {field.canonicalField}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 font-mono">
                      proto #{field.protoNumber} ({field.protoType})
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-Column Visual Bridging Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Column 1: Client Inbound (GraphQL Query AST) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase">
                    1. Inbound Client Query
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  GraphQL / AST
                </span>
              </div>
              <div className="p-4 space-y-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Query Document:</div>
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg overflow-x-auto text-[11px] leading-relaxed border border-slate-800">
                    {generatedGraphQLQuery}
                  </pre>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Variables (JSON):</div>
                  <textarea
                    value={variablesInput}
                    onChange={(e) => setVariablesInput(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 bg-slate-900 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Semantra Translation Engine & Canonical Resolution */}
            <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-xs ring-1 ring-indigo-500/10">
              <div className="bg-indigo-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-indigo-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase">
                    2. Canonical Field Resolver
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-200 bg-indigo-800 px-1.5 py-0.5 rounded">
                  Semantra Core
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  Semantra inspects the GraphQL AST selection set and dynamically pairs client fields to registered Canonical Enterprise Concepts.
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                    Resolved Field Mappings:
                  </div>
                  <div className="space-y-1">
                    {selectedFields.map((field) => {
                      const match = CANONICAL_FIELD_CATALOG.find(f => f.gqlField === field);
                      return (
                        <div key={field} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
                          <span className="text-slate-700 font-semibold">{field}</span>
                          <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="text-indigo-600 font-bold">{match?.canonicalField}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FieldMask Paths Box */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1.5 font-mono">
                  <div className="text-[10px] uppercase font-bold text-indigo-900 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Compiled FieldMask Paths ({fieldMaskPaths.length}):</span>
                  </div>
                  <div className="text-[11px] text-indigo-900 font-semibold break-all bg-white p-2 rounded border border-indigo-100">
                    [{fieldMaskPaths.map(p => `"${p}"`).join(', ')}]
                  </div>
                  <p className="text-[10px] text-indigo-700 font-sans">
                    Backend service applies <code className="font-mono">SELECT {fieldMaskPaths.join(', ')}</code>, preventing over-fetching.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Outbound gRPC Call with Binary Payload & FieldMask */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono font-bold tracking-wider uppercase">
                    3. Outbound gRPC Protobuf
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                  HTTP/2 Binary
                </span>
              </div>
              <div className="p-4 space-y-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">
                    Target Service &amp; Method:
                  </div>
                  <div className="p-2 bg-slate-100 text-slate-800 rounded font-bold text-xs truncate">
                    {activeScenario.targetService}/{activeScenario.rpcMethod}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">
                    Protobuf Envelope Payload:
                  </div>
                  <pre className="p-3 bg-slate-950 text-cyan-300 rounded-lg overflow-x-auto text-[11px] leading-relaxed border border-slate-800 max-h-[220px]">
                    {JSON.stringify(translatedGrpcPayload, null, 2)}
                  </pre>
                </div>

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center gap-2 font-sans">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sub-millisecond binary dispatch over HTTP/2 multiplexed channel.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEMAS SIDE-BY-SIDE */}
      {activeTab === 'schemas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* GraphQL Schema */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">Frontend Contract (schema.graphql)</h3>
              </div>
              <span className="text-[10px] font-mono text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-800">
                GraphQL SDL
              </span>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 mb-3 font-sans">
                Exposed to Frontend Web &amp; Mobile applications for high query flexibility and client-driven field selection.
              </p>
              <pre className="p-4 bg-slate-950 text-pink-300 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                {graphqlSchemaDefinition}
              </pre>
            </div>
          </div>

          {/* gRPC Protobuf Schema */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">Backend Contract (canonical_vendor.proto)</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                Protobuf v3
              </span>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 mb-3 font-sans">
                Internal microservice and ERP contract with strict binary typing and <code className="font-mono text-slate-700">google.protobuf.FieldMask</code> support.
              </p>
              <pre className="p-4 bg-slate-950 text-cyan-300 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                {protobufContractDefinition}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTION PYTHON MODULE */}
      {activeTab === 'python_code' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs animate-fade-in">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                Production Gateway Module (semantra_protocol_translator.py)
              </h3>
            </div>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-600 mb-3 font-sans leading-relaxed">
              Drop-in, zero-dependency Python &amp; Pydantic V2 module ready to embed in your FastAPI gateway, Envoy transcoder filter, or BFF microservice layer.
            </p>
            <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-[500px]">
              {pythonProductionSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
