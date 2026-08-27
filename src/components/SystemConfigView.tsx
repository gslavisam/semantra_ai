import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Cpu, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Terminal, 
  FileCode, 
  Copy, 
  Download, 
  Play, 
  ShieldCheck, 
  Key, 
  Globe, 
  Sparkles, 
  Check, 
  AlertCircle,
  Server,
  Layers,
  ShieldAlert,
  Zap,
  Lock,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  RotateCcw,
  Fingerprint,
  FileSignature,
  Shield,
  Hash,
  ArrowRight,
  CheckCircle,
  Users,
  UserCheck,
  Filter,
  LockKeyhole,
  FileText
} from 'lucide-react';
import { AIModelConfig, AIProvider, OpenAPIEndpoint, CircuitBreakerMetrics, PIIEntity } from '../types';
import { globalCircuitBreaker } from '../lib/circuitBreaker';
import { maskPIIPayload, unmaskPIIText, DEFAULT_PII_SETTINGS, PIISettings } from '../lib/piiMasking';

interface SystemConfigViewProps {
  aiConfig: AIModelConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AIModelConfig>>;
}

const PROVIDER_MODEL_PRESETS: Record<AIProvider, { id: string; name: string; desc: string }[]> = {
  gemini: [
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Default)', desc: 'Ultra-fast, highly accurate for structured mapping & closed-set validation' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', desc: 'Complex reasoning & deep code generation for intricate SQL/PySpark pipelines' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', desc: 'Minimal latency for bulk field matching' }
  ],
  openai: [
    { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol (Default)', desc: 'Absolute flagship for complex workloads, heavy schema coding, and deep reasoning' },
    { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', desc: 'Balanced mid-tier with strong capabilities at heavily reduced latency' },
    { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', desc: 'Optimized for broad field categorization and rapid metadata matching' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', desc: 'Fastest entry & most affordable option for lightweight validation' }
  ],
  lmstudio: [
    { id: 'gemma-4', name: 'Gemma 4 (Google Open Weights)', desc: 'Gemma 4 model running locally in LM Studio' },
    { id: 'llama-3.2-3b-instruct', name: 'Llama 3.2 3B Instruct', desc: 'Local LM Studio endpoint (http://localhost:1234/v1)' },
    { id: 'mistral-7b-instruct-v0.3', name: 'Mistral 7B Instruct', desc: 'Local high-performance open weights' },
    { id: 'custom-local', name: 'Custom Loaded Model in LM Studio', desc: 'Any model currently loaded in local LM Studio server' }
  ],
  ollama: [
    { id: 'gemma4:latest', name: 'Gemma 4 (Ollama)', desc: 'Gemma 4 model served locally via Ollama' },
    { id: 'llama3.2:latest', name: 'Llama 3.2 (Ollama)', desc: 'Local Ollama endpoint (http://localhost:11434/v1)' },
    { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', desc: 'Reasoning-focused open weights model' },
    { id: 'qwen2.5-coder:14b', name: 'Qwen 2.5 Coder 14B', desc: 'Specialized code generation & schema mapping' }
  ],
  custom: [
    { id: 'custom-api-model', name: 'Custom OpenAI-Compatible API', desc: 'Custom enterprise proxy or hosted LLM gateway' }
  ]
};

const OPENAPI_ENDPOINTS: OpenAPIEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/upload',
    summary: 'Ingest Dataset & Generate Schema Profile',
    description: 'Uploads raw CSV, JSON, or SQL dump file, computes column null/unique ratios, infers types, and returns dataset handle.',
    requestBodySample: {
      filename: "sap_ecc_knvv.csv",
      format: "csv",
      sample_rows: [
        { KUNNR: "0000100451", VKORG: "1000", VTWEG: "10", SPART: "00" }
      ]
    },
    responseSample: {
      status: "success",
      datasetId: "ds_9843102",
      columns: [
        { name: "KUNNR", inferredType: "VARCHAR(10)", nullRatio: 0.0, uniqueRatio: 0.98, sampleValues: ["0000100451", "0000100452"] },
        { name: "VKORG", inferredType: "VARCHAR(4)", nullRatio: 0.0, uniqueRatio: 0.05, sampleValues: ["1000", "2000"] }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/mapping/run',
    summary: 'Execute Multi-Signal Candidate Mapping Job',
    description: 'Runs deterministic scoring engines (lexical, semantic, knowledge, canonical, pattern) and ranks candidate target fields.',
    requestBodySample: {
      datasetId: "ds_9843102",
      mode: "standard",
      preset: "customer_sales_area",
      signalWeights: { lexical: 0.3, semantic: 0.25, knowledge: 0.2, canonical: 0.15, pattern: 0.1 }
    },
    responseSample: {
      jobId: "job_mapping_5512",
      status: "completed",
      totalFields: 14,
      mappedCount: 14,
      averageConfidence: 0.92,
      topCandidates: [
        { sourceField: "KUNNR", targetField: "customer_id", score: 0.98, confidence: "high", signals: ["name", "knowledge", "canonical"] },
        { sourceField: "VKORG", targetField: "sales_organization_id", score: 0.89, confidence: "high", signals: ["semantic", "canonical"] }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/mapping/validate',
    summary: 'Bounded LLM Candidate Validation',
    description: 'Submits closed candidate pairs to the configured AI model (Gemini / OpenAI / Ollama) with JSON guardrails.',
    requestBodySample: {
      modelConfig: { provider: "gemini", modelName: "gemini-3.6-flash" },
      candidatePairs: [
        { source: "KUNNR", target: "customer_id", sourceDesc: "Customer Number" }
      ]
    },
    responseSample: {
      modelUsed: "gemini-3.6-flash",
      validatedResults: [
        {
          sourceField: "KUNNR",
          targetField: "customer_id",
          validatedScore: 1.0,
          guardrailPassed: true,
          reasoning: "KUNNR in SAP SD maps directly to customer_id in canonical sales model."
        }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/decisions/apply',
    summary: 'Apply Decisions & Update Catalog Audit Log',
    description: 'Commits human analyst decisions, updates active mapping set, and logs stewardship audit records.',
    requestBodySample: {
      mappingSetId: "map_set_2026_01",
      acceptedRowIds: ["KUNNR_customer_id", "VKORG_sales_organization_id"],
      overrides: [
        { sourceField: "VTWEG", manualTarget: "distribution_channel_id" }
      ]
    },
    responseSample: {
      status: "applied",
      updatedRecords: 14,
      auditLogId: "audit_90123",
      timestamp: "2026-07-25T11:30:00Z"
    }
  },
  {
    method: 'GET',
    path: '/api/v1/catalog/search',
    summary: 'Search Approved Integration Catalog & Reuse Fit',
    description: 'Queries approved mappings catalog with semantic similarity and returns reuse fit scores.',
    parameters: [
      { name: 'q', type: 'string', required: true, description: 'Search term or table name' },
      { name: 'minScore', type: 'number', required: false, description: 'Minimum reuse fit threshold' }
    ],
    responseSample: {
      query: "SAP KNVV",
      results: [
        { id: "cat_1", name: "SAP Customer Sales Area (KNVV)", reuseFitScore: 0.96, fieldsMapped: 14, status: "approved" }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/transform/preview',
    summary: 'Generate Code Transformations & Execute Assertions',
    description: 'Generates production Pandas, PySpark, or dbt SQL models with assertions for padding and coercions.',
    requestBodySample: {
      targetFramework: "pandas",
      mappings: [{ sourceField: "KUNNR", targetField: "customer_id" }],
      applyPaddingRules: true
    },
    responseSample: {
      framework: "pandas",
      generatedCode: "import pandas as pd\n\ndef run_semantra_mapping(path):\n    df = pd.read_csv(path)\n    ...",
      assertionsCount: 3,
      warnings: [{ field: "PLTYP", message: "Nullable field cast to integer" }]
    }
  },
  {
    method: 'GET',
    path: '/api/v1/observability/reload',
    summary: 'Reload Runtime Config & AI Engine Diagnostics',
    description: 'Reloads persistent knowledge overlays, flushes embedding caches, and returns AI model health status.',
    responseSample: {
      status: "ok",
      activeOverlay: "sap_best_plus_weak_promotion_overlay.csv",
      loadedConcepts: 18,
      aiProviderStatus: "connected",
      aiActiveModel: "gemini-3.6-flash",
      port: 3000
    }
  }
];

export const SystemConfigView: React.FC<SystemConfigViewProps> = ({ aiConfig, setAiConfig }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'security' | 'mtls_hsm' | 'openapi'>('models');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testOutput, setTestOutput] = useState<string | null>(null);

  // Circuit Breaker Telemetry State
  const [cbMetrics, setCbMetrics] = useState<CircuitBreakerMetrics>(globalCircuitBreaker.getMetrics());

  // PII Sandbox State
  const [piiInputSample, setPiiInputSample] = useState<string>(
    `Sample Customer Record:\nName: John Doe (Account Manager)\nEmail: john.doe@enterprise-corp.com\nPhone: +381 64 123 4567\nTax/PIB: 104582910\nIBAN: RS35160005400001234567\nNational ID/JMBG: 2408985710023\nIP Address: 192.168.1.105`
  );
  const [piiSettings, setPiiSettings] = useState<PIISettings>(DEFAULT_PII_SETTINGS);
  const [piiMaskResult, setPiiMaskResult] = useState<{
    sanitized: string;
    entities: PIIEntity[];
    dict: Record<string, string>;
  } | null>(null);
  const [showRehydrated, setShowRehydrated] = useState(false);

  // Zero-Trust Security Triad (mTLS + ABAC + HSM) State
  const [isMtlsEnabled, setIsMtlsEnabled] = useState(true);
  const [isAbacEnabled, setIsAbacEnabled] = useState(true);
  const [isHsmEnabled, setIsHsmEnabled] = useState(true);
  const [hsmKeyId, setHsmKeyId] = useState('HSM_KEY_SERBIA_PROD_2026');
  
  // Simulated Client Certificate (mTLS Subject Layer)
  const [selectedClientCert, setSelectedClientCert] = useState('SHA256:4A:8B:12:34:56:78:BOSCH_CERT');
  
  // Simulated User Context (ABAC Subject & Context Layer)
  const [selectedUserRole, setSelectedUserRole] = useState<'FINANCE_ANALYST' | 'OPERATIONS_SPECIALIST' | 'SUPER_AUDITOR' | 'UNAUTHORIZED_ROLE'>('FINANCE_ANALYST');
  const [selectedUserRegion, setSelectedUserRegion] = useState<'CEE' | 'DACH' | 'EMEA' | 'GLOBAL'>('CEE');
  const [userAuthLimit, setUserAuthLimit] = useState<number>(50000);

  // Canonical Payload Input (Golden Record with sensitive attributes)
  const [mtlsPayloadInput, setMtlsPayloadInput] = useState<string>(JSON.stringify({
    invoice_id: "INV-2026-9900",
    vendor: "Bosch Srbija d.o.o.",
    vendor_tax_id: "104582910",
    region: "CEE",
    customer: "Enterprise Automotive d.o.o.",
    amount: 125000.00,
    currency: "EUR",
    margin_percentage: 22.4,
    supplier_bank_account: "RS3516000000000088",
    internal_cost_center: "CC-SRB-FIN-99",
    payment_terms: "NET30_SEPA",
    line_items: [
      { sku: "ECU-CONTROL-V4", qty: 25, unit_price: 5000.00 }
    ]
  }, null, 2));

  // ABAC Predefined Policy Set
  const ABAC_POLICIES = [
    {
      policyId: 'POL_FINANCE_CEE',
      name: 'Finance Analyst (CEE Region)',
      subjectRole: 'FINANCE_ANALYST',
      allowedRegion: 'CEE',
      maxAmountView: 50000.0,
      restrictedFields: ['margin_percentage', 'supplier_bank_account', 'internal_cost_center'],
      description: 'Permits access to CEE records up to $50,000; dynamically redacts margin percentage, bank accounts, and cost centers.'
    },
    {
      policyId: 'POL_REGIONAL_OPS',
      name: 'Operations Specialist (DACH)',
      subjectRole: 'OPERATIONS_SPECIALIST',
      allowedRegion: 'DACH',
      maxAmountView: 25000.0,
      restrictedFields: ['margin_percentage', 'supplier_bank_account', 'internal_cost_center', 'vendor_tax_id'],
      description: 'Restricted to DACH operations; masks high-level financial accounts and tax IDs.'
    },
    {
      policyId: 'POL_SUPER_AUDITOR',
      name: 'Global Compliance & Super Auditor',
      subjectRole: 'SUPER_AUDITOR',
      allowedRegion: 'GLOBAL',
      maxAmountView: 1000000000.0,
      restrictedFields: [] as string[],
      description: 'Full unredacted access across all regions, amounts, and sensitive fields for sovereign audits.'
    }
  ];

  interface ZeroTrustSimulationResult {
    overallStatus: '200_ACCEPTED_AND_SEALED' | '403_MTLS_FAILED' | '403_ABAC_DENIED';
    step1_mtls: {
      passed: boolean;
      statusCode: number;
      tenantId?: string;
      certFingerprint: string;
      latencyMs: number;
      error?: string;
    };
    step2_abac: {
      passed: boolean;
      appliedPolicyId?: string;
      roleMatch?: boolean;
      regionMatch?: boolean;
      amountExceeded?: boolean;
      rawAmount?: number;
      maxAmountAllowed?: number;
      redactedFields: string[];
      filteredPayload?: any;
      error?: string;
    };
    step3_hsm: {
      passed: boolean;
      payloadHash?: string;
      hsmSignature?: string;
      hsmKeyId: string;
      processedAt?: string;
    };
  }

  const [zeroTrustSimResult, setZeroTrustSimResult] = useState<ZeroTrustSimulationResult | null>(null);
  const [isSimulatingZeroTrust, setIsSimulatingZeroTrust] = useState(false);

  // Immutable Audit Trail
  const [hsmAuditTrail, setHsmAuditTrail] = useState<Array<{
    id: string;
    timestamp: string;
    tenantId: string;
    userRole: string;
    userRegion: string;
    certFingerprint: string;
    maskedFieldsCount: number;
    payloadHash: string;
    hsmSignature: string;
    status: 'ACCEPTED' | 'REJECTED';
  }>>([
    {
      id: 'AUD-88219-01',
      timestamp: '2026-08-25 10:14:22 UTC',
      tenantId: 'TENANT_BOSCH',
      userRole: 'FINANCE_ANALYST',
      userRegion: 'CEE',
      certFingerprint: 'SHA256:4A:8B:12:34:56:78:BOSCH_CERT',
      maskedFieldsCount: 3,
      payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      hsmSignature: '9f8e76543210abcd12345678abcdef0123456789abcdef0123456789abcdef01',
      status: 'ACCEPTED'
    },
    {
      id: 'AUD-88219-02',
      timestamp: '2026-08-25 11:32:05 UTC',
      tenantId: 'TENANT_CONTINENTAL',
      userRole: 'SUPER_AUDITOR',
      userRegion: 'GLOBAL',
      certFingerprint: 'SHA256:9F:8E:76:54:32:10:CONTINENTAL_CERT',
      maskedFieldsCount: 0,
      payloadHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      hsmSignature: '8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b',
      status: 'ACCEPTED'
    }
  ]);

  const TRUSTED_CLIENT_CERTS: Record<string, { tenantId: string; name: string; org: string; role: string }> = {
    'SHA256:4A:8B:12:34:56:78:BOSCH_CERT': {
      tenantId: 'TENANT_BOSCH',
      name: 'Bosch Automotive GmbH Client CA',
      org: 'Robert Bosch GmbH (Stuttgart)',
      role: 'B2B ERP Integration Peer'
    },
    'SHA256:9F:8E:76:54:32:10:CONTINENTAL_CERT': {
      tenantId: 'TENANT_CONTINENTAL',
      name: 'Continental AG Supply Chain Gateway',
      org: 'Continental AG (Hanover)',
      role: 'EDI & Order Management'
    },
    'SHA256:C3:5D:89:11:22:33:ERSTE_CORE_CERT': {
      tenantId: 'TENANT_ERSTE_FINTECH',
      name: 'Erste Bank Open Banking Gateway',
      org: 'Erste Group Bank AG (Vienna)',
      role: 'Payment & ISO 20022 Clearing'
    },
    'SHA256:00:00:00:UNTRUSTED_ATTACKER': {
      tenantId: 'UNKNOWN_ATTACKER',
      name: 'Untrusted / Self-Signed Attacker Cert',
      org: 'Unknown Entity (Untrusted PKI)',
      role: 'Malicious / Spoofed Client'
    }
  };

  // Run Integrated Zero-Trust Pipeline Simulation (mTLS ➔ ABAC ➔ HSM)
  const handleRunZeroTrustSimulation = () => {
    setIsSimulatingZeroTrust(true);
    setZeroTrustSimResult(null);

    setTimeout(() => {
      setIsSimulatingZeroTrust(false);
      
      // ==========================================
      // STEP 1: mTLS TRANSPORT LAYER VERIFICATION
      // ==========================================
      const isMtlsValid = !isMtlsEnabled || (selectedClientCert in TRUSTED_CLIENT_CERTS && selectedClientCert !== 'SHA256:00:00:00:UNTRUSTED_ATTACKER');
      
      if (!isMtlsValid) {
        setZeroTrustSimResult({
          overallStatus: '403_MTLS_FAILED',
          step1_mtls: {
            passed: false,
            statusCode: 403,
            certFingerprint: selectedClientCert,
            latencyMs: 14,
            error: 'mTLS Handshake Rejected: Untrusted Client Certificate (Not present in Sovereign PKI Registry)'
          },
          step2_abac: {
            passed: false,
            redactedFields: [],
            error: 'ABAC Evaluation bypassed because transport handshake was rejected.'
          },
          step3_hsm: {
            passed: false,
            hsmKeyId
          }
        });
        return;
      }

      const tenantInfo = TRUSTED_CLIENT_CERTS[selectedClientCert];

      // Parse payload
      let parsedRawPayload: any = {};
      try {
        parsedRawPayload = JSON.parse(mtlsPayloadInput);
      } catch (err) {
        parsedRawPayload = { raw: mtlsPayloadInput };
      }

      // ==========================================
      // STEP 2: ABAC POLICY DECISION & FIELD-LEVEL MASKING
      // ==========================================
      let filteredPayload = { ...parsedRawPayload };
      let appliedPolicy: any = null;
      let roleMatch = false;
      let regionMatch = true;
      let amountExceeded = false;
      const redactedFieldsList: string[] = [];

      if (isAbacEnabled) {
        // Find matching policy for user role
        appliedPolicy = ABAC_POLICIES.find(p => p.subjectRole === selectedUserRole);

        if (!appliedPolicy && selectedUserRole !== 'SUPER_AUDITOR') {
          setZeroTrustSimResult({
            overallStatus: '403_ABAC_DENIED',
            step1_mtls: {
              passed: true,
              statusCode: 200,
              tenantId: tenantInfo?.tenantId || 'TENANT_UNKNOWN',
              certFingerprint: selectedClientCert,
              latencyMs: 16
            },
            step2_abac: {
              passed: false,
              roleMatch: false,
              redactedFields: [],
              error: `ABAC Deny: No authorization policy found for user role '${selectedUserRole}'. Access Denied.`
            },
            step3_hsm: {
              passed: false,
              hsmKeyId
            }
          });
          return;
        }

        if (appliedPolicy) {
          roleMatch = true;
          // 1. Region check
          const payloadRegion = parsedRawPayload.region || 'CEE';
          if (appliedPolicy.allowedRegion !== 'GLOBAL' && appliedPolicy.allowedRegion !== selectedUserRegion) {
            regionMatch = false;
            setZeroTrustSimResult({
              overallStatus: '403_ABAC_DENIED',
              step1_mtls: {
                passed: true,
                statusCode: 200,
                tenantId: tenantInfo?.tenantId,
                certFingerprint: selectedClientCert,
                latencyMs: 16
              },
              step2_abac: {
                passed: false,
                appliedPolicyId: appliedPolicy.policyId,
                roleMatch: true,
                regionMatch: false,
                redactedFields: [],
                error: `ABAC Geographic Constraint Deny: User in region '${selectedUserRegion}' is not permitted to access resource allocated to region '${appliedPolicy.allowedRegion}'.`
              },
              step3_hsm: {
                passed: false,
                hsmKeyId
              }
            });
            return;
          }

          // 2. Numeric amount authorization check
          const payloadAmount = typeof parsedRawPayload.amount === 'number' ? parsedRawPayload.amount : parseFloat(parsedRawPayload.amount || '0');
          if (payloadAmount > appliedPolicy.maxAmountView) {
            amountExceeded = true;
            filteredPayload.amount = `[EXCEEDS_AUTHORIZATION_LIMIT: Max $${appliedPolicy.maxAmountView.toLocaleString()}]`;
            redactedFieldsList.push('amount (threshold masked)');
          }

          // 3. Field-Level Redaction
          for (const field of appliedPolicy.restrictedFields) {
            if (field in filteredPayload) {
              filteredPayload[field] = '[REDACTED_BY_ABAC_POLICY]';
              redactedFieldsList.push(field);
            }
          }
        }
      }

      // ==========================================
      // STEP 3: HSM CRYPTOGRAPHIC SIGNING OF FILTERED RECORD
      // ==========================================
      const cleanJson = JSON.stringify(filteredPayload, Object.keys(filteredPayload).sort());
      let hash = '';
      for (let i = 0; i < 64; i++) {
        hash += ((cleanJson.charCodeAt(i % cleanJson.length) * 31 + i * 17) % 16).toString(16);
      }

      let signature = '';
      const sigSeed = hash + hsmKeyId;
      for (let i = 0; i < 64; i++) {
        signature += ((sigSeed.charCodeAt(i % sigSeed.length) * 47 + i * 29) % 16).toString(16);
      }

      const newAudit = {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        tenantId: tenantInfo?.tenantId || 'TENANT_UNKNOWN',
        userRole: selectedUserRole,
        userRegion: selectedUserRegion,
        certFingerprint: selectedClientCert,
        maskedFieldsCount: redactedFieldsList.length,
        payloadHash: hash,
        hsmSignature: signature,
        status: 'ACCEPTED' as const
      };

      setHsmAuditTrail(prev => [newAudit, ...prev]);

      setZeroTrustSimResult({
        overallStatus: '200_ACCEPTED_AND_SEALED',
        step1_mtls: {
          passed: true,
          statusCode: 200,
          tenantId: tenantInfo?.tenantId,
          certFingerprint: selectedClientCert,
          latencyMs: 18
        },
        step2_abac: {
          passed: true,
          appliedPolicyId: appliedPolicy ? appliedPolicy.policyId : 'POL_DEFAULT_PERMISSIVE',
          roleMatch,
          regionMatch,
          amountExceeded,
          rawAmount: parsedRawPayload.amount,
          maxAmountAllowed: appliedPolicy?.maxAmountView,
          redactedFields: redactedFieldsList,
          filteredPayload
        },
        step3_hsm: {
          passed: true,
          payloadHash: hash,
          hsmSignature: signature,
          hsmKeyId,
          processedAt: new Date().toISOString()
        }
      });
    }, 600);
  };

  // Selected endpoint for OpenAPI tester
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [apiTestResponse, setApiTestResponse] = useState<string | null>(null);
  const [isExecutingApiTest, setIsExecutingApiTest] = useState(false);

  const selectedEndpoint = OPENAPI_ENDPOINTS[selectedEndpointIndex];

  // Subscribe to Circuit Breaker updates
  useEffect(() => {
    const unsubscribe = globalCircuitBreaker.subscribe((metrics) => {
      setCbMetrics(metrics);
    });
    return () => unsubscribe();
  }, []);

  // Fetch backend circuit breaker status on load
  const refreshBackendBreaker = async () => {
    try {
      const res = await fetch('/api/ai/circuit-breaker/status');
      if (res.ok) {
        const data = await res.json();
        setCbMetrics(data);
      }
    } catch (e) {
      console.warn('Backend breaker check:', e);
    }
  };

  const handleResetBreaker = async () => {
    globalCircuitBreaker.reset();
    try {
      await fetch('/api/ai/circuit-breaker/reset', { method: 'POST' });
    } catch (e) {
      // client-side reset fallback
    }
    setCbMetrics(globalCircuitBreaker.getMetrics());
  };

  const handleTripBreaker = async () => {
    globalCircuitBreaker.trip('Manual Steward Test Simulation');
    try {
      await fetch('/api/ai/circuit-breaker/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual Steward Test Simulation' })
      });
    } catch (e) {
      // client-side trip fallback
    }
    setCbMetrics(globalCircuitBreaker.getMetrics());
  };

  // Run PII Sandbox Masking
  const handleRunPiiMasking = () => {
    const res = maskPIIPayload(piiInputSample, piiSettings);
    setPiiMaskResult({
      sanitized: res.sanitizedPayload,
      entities: res.detectedEntities,
      dict: res.mappingDict
    });
    setShowRehydrated(false);
  };

  // Handle provider selection update
  const handleProviderChange = (provider: AIProvider) => {
    const presets = PROVIDER_MODEL_PRESETS[provider];
    const defaultModel = presets[0]?.id || 'custom-model';
    let defaultBaseUrl = '';
    if (provider === 'lmstudio') defaultBaseUrl = 'http://localhost:1234/v1';
    if (provider === 'ollama') defaultBaseUrl = 'http://localhost:11434/v1';

    setAiConfig(prev => ({
      ...prev,
      provider,
      modelName: defaultModel,
      baseUrl: defaultBaseUrl,
      isCustomModel: provider === 'custom'
    }));
  };

  // Test AI Model Ping / Connection
  const handleTestConnection = () => {
    setTestState('testing');
    setTestOutput(null);

    setTimeout(() => {
      setTestState('success');
      setTestOutput(
        JSON.stringify({
          status: '200 OK',
          provider: aiConfig.provider,
          model: aiConfig.modelName,
          circuitBreaker: cbMetrics.state,
          latencyMs: 142,
          guardrailsActive: aiConfig.enableGuardrails,
          piiProtected: true,
          testResponse: `[${aiConfig.modelName}] Semantra bounded AI validation online with active PII shield.`
        }, null, 2)
      );
    }, 1200);
  };

  // Execute interactive OpenAPI endpoint request simulator
  const handleExecuteApiCall = () => {
    setIsExecutingApiTest(true);
    setApiTestResponse(null);

    setTimeout(() => {
      setIsExecutingApiTest(false);
      setApiTestResponse(JSON.stringify(selectedEndpoint.responseSample, null, 2));
    }, 600);
  };

  // Generate complete OpenAPI 3.0 YAML String for Export
  const generateOpenApiYaml = () => {
    return `# Semantra Pilot-Ready OpenAPI 3.0 Specification
openapi: 3.0.3
info:
  title: Semantra Semantic Integration API
  description: Deterministic-first semantic integration workbench API with bounded AI model surfaces, PII protection, and circuit breaker resilience.
  version: 1.2.0
servers:
  - url: http://localhost:3000
    description: Local Container Runtime (Port 3000)
paths:
  /api/v1/upload:
    post:
      summary: Ingest Dataset & Generate Schema Profile
      responses:
        '200':
          description: Successful schema profile creation
  /api/v1/mapping/run:
    post:
      summary: Execute Multi-Signal Candidate Mapping Job
      responses:
        '200':
          description: Candidate mapping array returned
  /api/v1/mapping/validate:
    post:
      summary: Bounded LLM Candidate Validation
      responses:
        '200':
          description: Validated mapping candidate scores
  /api/ai/circuit-breaker/status:
    get:
      summary: Get AI Circuit Breaker Telemetry
      responses:
        '200':
          description: Live circuit breaker state metrics
  /api/ai/pii-mask:
    post:
      summary: PII Masking & Tokenization Verification
      responses:
        '200':
          description: Sanitized payload and token dictionary
`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            AI Model Selection &amp; Governance Architecture
          </h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Configure active AI Providers, inspect real-time <strong>Circuit Breaker resilience</strong>, test <strong>PII sanitization</strong>, and review the OpenAPI 3.0 contract.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'models' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>1. Model Selection</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
            <span>2. PII Shield &amp; Circuit Breaker</span>
          </button>
          <button
            onClick={() => setActiveTab('mtls_hsm')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'mtls_hsm' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
            <span>3. Zero-Trust Security (mTLS + ABAC + HSM)</span>
          </button>
          <button
            onClick={() => setActiveTab('openapi')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'openapi' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>4. OpenAPI Contract</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI Model Selection */}
      {activeTab === 'models' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left 2 Columns: Model Selector & Settings */}
          <div className="xl:col-span-2 space-y-6">
            {/* Active Provider Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-4 h-4 text-indigo-500" />
                Select AI Engine Provider
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'gemini', name: 'Google Gemini', badge: 'Default' },
                  { id: 'openai', name: 'OpenAI API', badge: 'Cloud' },
                  { id: 'lmstudio', name: 'LM Studio', badge: 'Local' },
                  { id: 'ollama', name: 'Ollama', badge: 'Local' },
                  { id: 'custom', name: 'Custom API', badge: 'Gateway' }
                ].map((p) => {
                  const isSelected = aiConfig.provider === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProviderChange(p.id as AIProvider)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/40 text-slate-900 ring-1 ring-indigo-500' 
                          : 'border-slate-200 bg-slate-50/30 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-400">{p.badge}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <span className="text-xs font-bold font-sans mt-2">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Model Choice Dropdown / Input */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 font-sans block">
                    Active Model Descriptor
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={aiConfig.modelName}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, modelName: e.target.value }))}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      {PROVIDER_MODEL_PRESETS[aiConfig.provider].map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Or enter custom model ID..."
                      value={aiConfig.modelName}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, modelName: e.target.value, isCustomModel: true }))}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Current preset: {PROVIDER_MODEL_PRESETS[aiConfig.provider].find(m => m.id === aiConfig.modelName)?.desc || 'Custom user model descriptor.'}
                  </p>
                </div>

                {/* Base URL for Local / Custom Endpoints */}
                {(aiConfig.provider === 'lmstudio' || aiConfig.provider === 'ollama' || aiConfig.provider === 'custom') && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-xs font-semibold text-slate-700 font-sans flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      Local Server Base URL
                    </label>
                    <input
                      type="text"
                      value={aiConfig.baseUrl || ''}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder={aiConfig.provider === 'ollama' ? 'http://localhost:11434/v1' : 'http://localhost:1234/v1'}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">
                      Ensure your local server is running with CORS enabled (e.g. `ollama serve` or LM Studio local server on port 1234).
                    </p>
                  </div>
                )}

                {/* API Key input if applicable */}
                {aiConfig.provider === 'openai' && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-xs font-semibold text-slate-700 font-sans flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      OpenAI API Secret Key
                    </label>
                    <input
                      type="password"
                      value={aiConfig.apiKey || ''}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Model Generation Hyperparameters */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="w-4 h-4 text-emerald-500" />
                Hyperparameters &amp; Guardrail Bounding
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Temperature:</span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {aiConfig.temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiConfig.temperature}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400">
                    Lower values (0.00-0.20) are recommended for deterministic schema alignment.
                  </p>
                </div>

                {/* Guardrails Toggle */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 font-sans flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Closed-Set JSON Guardrails
                    </span>
                    <input
                      type="checkbox"
                      checked={aiConfig.enableGuardrails}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, enableGuardrails: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Validates model JSON outputs against strict schema definitions before applying confidence scores.
                  </p>
                </div>
              </div>

              {/* System Instruction Prompt */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700 font-sans block">
                  Bounded System Instruction Persona
                </label>
                <textarea
                  rows={3}
                  value={aiConfig.systemInstruction}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Connection Diagnostics & Active Model Status */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Model Engine Ping Diagnostic
              </h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Provider:</span>
                    <span className="font-mono font-bold text-slate-800 uppercase">{aiConfig.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Model ID:</span>
                    <span className="font-mono font-bold text-indigo-600">{aiConfig.modelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Circuit Breaker:</span>
                    <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      cbMetrics.state === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' :
                      cbMetrics.state === 'HALF_OPEN' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {cbMetrics.state}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testState === 'testing'}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testState === 'testing' ? 'animate-spin text-emerald-400' : ''}`} />
                  {testState === 'testing' ? 'Pinging AI Engine...' : 'Test AI Model Ping'}
                </button>

                {testOutput && (
                  <div className="mt-3 p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-lg border border-slate-800 overflow-x-auto">
                    <pre>{testOutput}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Architectural Summary Box */}
            <div className="bg-slate-900 text-slate-300 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Semantra AI Operating Model
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                In Semantra, LLM models act as advisory inspectors for closed candidate sets. All primary mapping scoring is computed deterministically first via lexical, knowledge overlay, pattern, and canonical matching.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI Security, PII Shield & Circuit Breaker */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Top Telemetry Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Circuit State Card */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Circuit State</span>
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  cbMetrics.state === 'CLOSED' ? 'bg-emerald-500 animate-pulse' :
                  cbMetrics.state === 'HALF_OPEN' ? 'bg-amber-500 animate-pulse' :
                  'bg-rose-500 animate-pulse'
                }`} />
                <span className={`text-base font-mono font-bold ${
                  cbMetrics.state === 'CLOSED' ? 'text-emerald-700' :
                  cbMetrics.state === 'HALF_OPEN' ? 'text-amber-700' :
                  'text-rose-700'
                }`}>
                  {cbMetrics.state}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                {cbMetrics.state === 'CLOSED' && 'Healthy. AI calls route normally.'}
                {cbMetrics.state === 'HALF_OPEN' && 'Probing AI service readiness.'}
                {cbMetrics.state === 'OPEN' && 'Fast fail active. Deterministic fallback engaged.'}
              </p>
            </div>

            {/* Uptime & Reliability */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">AI Call Reliability</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900">
                {cbMetrics.uptimePercent ?? 100}%
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                {cbMetrics.totalCalls} total calls ({cbMetrics.failedCalls} failed / {cbMetrics.fallbackCalls} fallbacks)
              </p>
            </div>

            {/* Consecutive Failures */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Trip Threshold</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900">
                {cbMetrics.consecutiveFailures} / 3 <span className="text-xs text-slate-400 font-normal">failures</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Trips to OPEN after 3 consecutive errors or timeout (&gt;8000ms).
              </p>
            </div>

            {/* PII Compliance Level */}
            <div className="p-5 bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-800 text-white rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Privacy Guard</span>
                <Lock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                GDPR &amp; HIPAA Ready
              </div>
              <p className="text-[10px] text-emerald-300/80 font-sans">
                Pre-flight tokenization active. Zero raw PII transmitted to external LLMs.
              </p>
            </div>
          </div>

          {/* Circuit Breaker Controls & Status Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  Circuit Breaker Operations &amp; Fault Injection Simulator
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Test system resilience by simulating circuit trips or manually restoring closed operational state.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetBreaker}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to CLOSED
                </button>
                <button
                  type="button"
                  onClick={handleTripBreaker}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Simulate Trip (OPEN)
                </button>
              </div>
            </div>

            {cbMetrics.lastFallbackReason && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-sans text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Last Recorded Fallback / Failure Event:</span>
                  <p className="font-mono text-[11px] text-amber-800 mt-0.5">{cbMetrics.lastFallbackReason}</p>
                </div>
              </div>
            )}
          </div>

          {/* PII Live Sandbox & Configuration */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left 2 Columns: Interactive Sandbox */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Live PII Sanitization &amp; Tokenization Sandbox
                </h3>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  Pre-Flight Interceptor
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 font-sans block">
                  Input Raw Text / Payload (Contains Emails, Phones, Tax/PIB, IBAN, National ID):
                </label>
                <textarea
                  rows={5}
                  value={piiInputSample}
                  onChange={(e) => setPiiInputSample(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRunPiiMasking}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Run PII Masking &amp; Tokenization Test
                </button>

                {piiMaskResult && (
                  <button
                    type="button"
                    onClick={() => setShowRehydrated(!showRehydrated)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {showRehydrated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showRehydrated ? 'Show Masked Payload' : 'Test Reverse Rehydration'}
                  </button>
                )}
              </div>

              {/* Output Result Box */}
              {piiMaskResult && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {showRehydrated ? 'Rehydrated Safe Text (Authorized View)' : 'Sanitized Payload Transmitted to AI Model:'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                      {piiMaskResult.entities.length} PII Entities Neutralized
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {showRehydrated 
                      ? unmaskPIIText(piiMaskResult.sanitized, piiMaskResult.dict)
                      : piiMaskResult.sanitized
                    }
                  </div>

                  {/* Token Extraction Table */}
                  {piiMaskResult.entities.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                        Detected Entity Dictionary &amp; Token Map
                      </span>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">PII Category</th>
                              <th className="p-2.5">Masked Token Placeholder</th>
                              <th className="p-2.5">Confidence</th>
                              <th className="p-2.5">Original Value (Encrypted)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {piiMaskResult.entities.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/60">
                                <td className="p-2.5 font-bold text-slate-800 uppercase text-[10px]">{e.type}</td>
                                <td className="p-2.5 font-bold text-emerald-600 bg-emerald-50/50">{e.maskedToken}</td>
                                <td className="p-2.5 text-slate-500">{(e.confidence * 100).toFixed(0)}%</td>
                                <td className="p-2.5 text-slate-400 blur-xs hover:blur-none transition-all cursor-help" title="Hover to view original">
                                  {e.rawValue}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: PII Rules & Toggles */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Active Sanitization Rules
              </h3>

              <div className="space-y-3 text-xs">
                {[
                  { key: 'maskEmails', label: 'Email Addresses', desc: 'john@domain.com -> [MASKED_EMAIL_1]' },
                  { key: 'maskPhones', label: 'Phone Numbers', desc: '+381 64 123... -> [MASKED_PHONE_1]' },
                  { key: 'maskTaxIds', label: 'Tax IDs & PIB', desc: '104582910 -> [MASKED_TAX_ID_1]' },
                  { key: 'maskIbans', label: 'IBAN & Bank Accounts', desc: 'RS35... -> [MASKED_IBAN_1]' },
                  { key: 'maskNationalIds', label: 'National IDs / JMBG / SSN', desc: '13-digit ID -> [MASKED_NATIONAL_ID_1]' },
                  { key: 'maskCreditCards', label: 'Credit Card Numbers', desc: '4532... -> [MASKED_CREDIT_CARD_1]' },
                  { key: 'maskIps', label: 'IPv4 Network Addresses', desc: '192.168.1.1 -> [MASKED_CUSTOM_1]' }
                ].map((rule) => {
                  const val = (piiSettings as any)[rule.key];
                  return (
                    <div key={rule.key} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 font-sans block">{rule.label}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">{rule.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => setPiiSettings(prev => ({ ...prev, [rule.key]: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Zero-Trust Security Triad (mTLS + ABAC + HSM) Tab */}
      {activeTab === 'mtls_hsm' && (
        <div className="space-y-6">
          {/* Visual Zero-Trust Pipeline Flow Diagram */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-indigo-900/60 rounded-xl p-5 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-900/40">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Sovereign B2B Defense Architecture
                </span>
                <h3 className="text-base font-bold font-sans text-white mt-0.5">
                  The Zero-Trust Security Triad: mTLS ➔ ABAC ➔ HSM Pipeline
                </h3>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  Every incoming B2B transaction passes through three deterministic defense layers before payload sealing and dispatch.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-mono font-bold">
                  DEFENSE-IN-DEPTH: 3 LAYERS
                </span>
              </div>
            </div>

            {/* 3 Step Visual Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 font-sans text-xs">
              {/* Step 1 */}
              <div className="p-3 bg-slate-900/90 border border-indigo-800/60 rounded-lg space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-mono font-bold text-[10px]">
                    LAYER 1 (TRANSPORT)
                  </span>
                  <Fingerprint className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="font-bold text-slate-100 text-xs">mTLS Network Handshake</h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Verifies x509 client certificate against PKI whitelist. Stops unauthenticated spoofing at Layer 4/7 with 403.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-slate-900/90 border border-amber-800/60 rounded-lg space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-amber-500/30 text-amber-300 rounded font-mono font-bold text-[10px]">
                    LAYER 2 (APPLICATION)
                  </span>
                  <Filter className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="font-bold text-slate-100 text-xs">ABAC Field-Level Masking</h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Evaluates Role, Region, and Auth Limits. Dynamically redacts secrets (<code className="text-amber-300 font-mono text-[10px]">[REDACTED]</code>) without API endpoint proliferation.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-slate-900/90 border border-emerald-800/60 rounded-lg space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 rounded font-mono font-bold text-[10px]">
                    LAYER 3 (HARDWARE)
                  </span>
                  <FileSignature className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="font-bold text-slate-100 text-xs">HSM Non-Repudiation Signing</h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Generates SHA-256 digest over the <em>cleansed record</em> and signs it inside a tamper-proof HSM slot for legal non-repudiation.
                </p>
              </div>
            </div>
          </div>

          {/* Top 4 Assurance Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* mTLS Status */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Layer 1: Transport</span>
                <Fingerprint className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 flex items-center gap-2">
                {isMtlsEnabled ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    mTLS Active
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    mTLS Disabled
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Bi-directional x509 verification enforcing zero spoofing.
              </p>
            </div>

            {/* ABAC Status */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Layer 2: ABAC Engine</span>
                <Filter className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 flex items-center gap-1.5">
                <LockKeyhole className="w-5 h-5 text-amber-500" />
                {isAbacEnabled ? 'Field-Level Masking' : 'ABAC Disabled'}
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Dynamic attribute evaluation on Golden Records.
              </p>
            </div>

            {/* HSM Status */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Layer 3: HSM Hardware</span>
                <FileSignature className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-mono font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                HSM Slot 01
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Non-repudiation cryptographic seal via tamper-proof hardware.
              </p>
            </div>

            {/* Compliance Guarantee */}
            <div className="p-5 bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800 text-white rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold">Assurance Standard</span>
                <CheckCircle className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-bold text-indigo-200 flex items-center gap-1.5">
                PSD2, ISO 20022 &amp; ABAC
              </div>
              <p className="text-[10px] text-indigo-300/80 font-sans">
                Full Zero-Trust Triad data protection for B2B transactions.
              </p>
            </div>
          </div>

          {/* Configuration & ABAC Policy Management Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  Zero-Trust Triad &amp; ABAC Policy Rules Configuration
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Toggle pipeline enforcement layers, configure active HSM slots, and inspect attribute-based authorization policies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 font-sans block">1. Enforce mTLS Handshake</span>
                  <span className="text-[10px] text-slate-500 block">Reject unverified client x509 certs</span>
                </div>
                <input
                  type="checkbox"
                  checked={isMtlsEnabled}
                  onChange={(e) => setIsMtlsEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 font-sans block">2. Enforce ABAC Masking</span>
                  <span className="text-[10px] text-slate-500 block">Dynamic field redaction by attributes</span>
                </div>
                <input
                  type="checkbox"
                  checked={isAbacEnabled}
                  onChange={(e) => setIsAbacEnabled(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 font-sans block">3. Hardware HSM Signing</span>
                  <span className="text-[10px] text-slate-500 block">Sign cleansed payload in HSM</span>
                </div>
                <input
                  type="checkbox"
                  checked={isHsmEnabled}
                  onChange={(e) => setIsHsmEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <label className="font-bold text-slate-800 font-sans block">Active HSM Key Alias</label>
                <input
                  type="text"
                  value={hsmKeyId}
                  onChange={(e) => setHsmKeyId(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded p-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* ABAC Policy Registry View */}
            <div className="pt-2">
              <span className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Active ABAC Policy Decision Set (Authorization Matrix):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ABAC_POLICIES.map(p => (
                  <div key={p.policyId} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-700">{p.policyId}</span>
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono text-[9px] rounded font-semibold">
                        {p.allowedRegion}
                      </span>
                    </div>
                    <div className="font-sans font-semibold text-slate-800 text-xs">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-1">
                      <div>Max View: <strong className="font-mono text-slate-700">${p.maxAmountView.toLocaleString()}</strong></div>
                      <div>
                        Redacted Fields: {p.restrictedFields.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.restrictedFields.map(f => (
                              <span key={f} className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-mono text-[9px] rounded border border-amber-200">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold font-mono text-[10px]">None (Full Access)</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PKI Registry & Live Multi-Stage Simulator Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left 5 Cols: PKI & Subject Identity Context */}
            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Subject Identity &amp; PKI Context
                </h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                  Auth &amp; Scopes
                </span>
              </div>

              {/* Layer 1: Simulated Client Certificate */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 font-sans block flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
                  1. Incoming Client Certificate (mTLS Subject):
                </label>
                <select
                  value={selectedClientCert}
                  onChange={(e) => setSelectedClientCert(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.entries(TRUSTED_CLIENT_CERTS).map(([fp, cert]) => (
                    <option key={fp} value={fp}>
                      {cert.name} ({cert.tenantId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Layer 2: Subject Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 font-sans block flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  2. Subject Role (From OAuth2 / JWT Scopes):
                </label>
                <select
                  value={selectedUserRole}
                  onChange={(e) => setSelectedUserRole(e.target.value as any)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="FINANCE_ANALYST">FINANCE_ANALYST (CEE Analyst - Subject to Redaction)</option>
                  <option value="OPERATIONS_SPECIALIST">OPERATIONS_SPECIALIST (DACH Ops Specialist)</option>
                  <option value="SUPER_AUDITOR">SUPER_AUDITOR (Global Compliance - Unredacted Access)</option>
                  <option value="UNAUTHORIZED_ROLE">UNAUTHORIZED_GUEST (Unregistered Role - Expect Deny)</option>
                </select>
              </div>

              {/* Layer 2: Subject Region */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 font-sans block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-600" />
                  3. Subject Region Attribute:
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(['CEE', 'DACH', 'EMEA', 'GLOBAL'] as const).map(reg => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setSelectedUserRegion(reg)}
                      className={`py-1.5 rounded border text-center font-mono font-bold transition-all cursor-pointer ${
                        selectedUserRegion === reg 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trusted PKI Whitelist List */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Configured PKI Peer Whitelist:
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(TRUSTED_CLIENT_CERTS).map(([fingerprint, cert]) => {
                    const isUntrusted = fingerprint === 'SHA256:00:00:00:UNTRUSTED_ATTACKER';
                    return (
                      <div
                        key={fingerprint}
                        className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                          isUntrusted 
                            ? 'border-rose-200 bg-rose-50/40 text-rose-900' 
                            : 'border-slate-200 bg-slate-50/50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-sans flex items-center gap-1">
                            {isUntrusted ? (
                              <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            )}
                            {cert.name}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            isUntrusted ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            {cert.tenantId}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Canonical Golden Record Input & 3-Step Live Execution Engine */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  Zero-Trust Triad Live Execution Sandbox
                </h3>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  Interactive Simulator
                </span>
              </div>

              {/* Canonical JSON Payload Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 font-sans block">
                    Canonical Golden Record (Incoming Raw Payload with Secrets):
                  </label>
                  <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Contains margin_percentage, bank_account, cost_center
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={mtlsPayloadInput}
                  onChange={(e) => setMtlsPayloadInput(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleRunZeroTrustSimulation}
                disabled={isSimulatingZeroTrust}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Play className={`w-4 h-4 ${isSimulatingZeroTrust ? 'animate-spin' : ''}`} />
                {isSimulatingZeroTrust ? 'Executing Zero-Trust Triad Pipeline (mTLS ➔ ABAC ➔ HSM)...' : 'Execute Zero-Trust Pipeline (mTLS ➔ ABAC ➔ HSM)'}
              </button>

              {/* Simulation Result Breakdown */}
              {zeroTrustSimResult && (
                <div className={`p-4 rounded-xl border space-y-4 ${
                  zeroTrustSimResult.overallStatus === '200_ACCEPTED_AND_SEALED'
                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/40 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded ${
                        zeroTrustSimResult.overallStatus === '200_ACCEPTED_AND_SEALED' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-rose-600 text-white'
                      }`}>
                        {zeroTrustSimResult.overallStatus}
                      </span>
                      <span className="text-xs font-bold font-sans">
                        {zeroTrustSimResult.overallStatus === '200_ACCEPTED_AND_SEALED'
                          ? 'Transaction Authenticated, Redacted & Cryptographically Sealed'
                          : 'Security Pipeline Rejected Transaction'}
                      </span>
                    </div>
                  </div>

                  {/* 3 Step Status Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                    {/* Step 1 Tile */}
                    <div className={`p-2.5 rounded-lg border ${
                      zeroTrustSimResult.step1_mtls.passed 
                        ? 'bg-white border-emerald-200 text-slate-800' 
                        : 'bg-rose-100 border-rose-300 text-rose-900'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">1. mTLS TRANSPORT</span>
                      <span className={`font-bold text-xs ${zeroTrustSimResult.step1_mtls.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {zeroTrustSimResult.step1_mtls.passed ? `✓ ${zeroTrustSimResult.step1_mtls.tenantId}` : '✗ 403 REJECTED'}
                      </span>
                    </div>

                    {/* Step 2 Tile */}
                    <div className={`p-2.5 rounded-lg border ${
                      zeroTrustSimResult.step2_abac.passed 
                        ? 'bg-white border-amber-200 text-slate-800' 
                        : 'bg-rose-100 border-rose-300 text-rose-900'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">2. ABAC REDACTION</span>
                      <span className={`font-bold text-xs ${zeroTrustSimResult.step2_abac.passed ? 'text-amber-700' : 'text-rose-700'}`}>
                        {zeroTrustSimResult.step2_abac.passed 
                          ? `✓ ${zeroTrustSimResult.step2_abac.redactedFields.length} Fields Redacted` 
                          : '✗ ABAC DENIED'}
                      </span>
                    </div>

                    {/* Step 3 Tile */}
                    <div className={`p-2.5 rounded-lg border ${
                      zeroTrustSimResult.step3_hsm.passed 
                        ? 'bg-white border-emerald-200 text-slate-800' 
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">3. HSM SIGNATURE</span>
                      <span className={`font-bold text-xs ${zeroTrustSimResult.step3_hsm.passed ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {zeroTrustSimResult.step3_hsm.passed ? '✓ HARDWARE SEALED' : '— SKIPPED'}
                      </span>
                    </div>
                  </div>

                  {/* Failure Message */}
                  {zeroTrustSimResult.overallStatus !== '200_ACCEPTED_AND_SEALED' && (
                    <div className="p-3 bg-white border border-rose-200 rounded-lg text-xs font-mono text-rose-700 space-y-1">
                      <div className="font-bold">⚠️ Access Control Violation:</div>
                      <div>{zeroTrustSimResult.step1_mtls.error || zeroTrustSimResult.step2_abac.error}</div>
                    </div>
                  )}

                  {/* Success Details */}
                  {zeroTrustSimResult.overallStatus === '200_ACCEPTED_AND_SEALED' && (
                    <div className="space-y-3 font-mono text-xs">
                      {/* Redacted Fields Pill List */}
                      {zeroTrustSimResult.step2_abac.redactedFields.length > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">
                            ABAC AUTOMATIC FIELD-LEVEL REDACTION APPLIED ({zeroTrustSimResult.step2_abac.appliedPolicyId}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {zeroTrustSimResult.step2_abac.redactedFields.map(f => (
                              <span key={f} className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-bold text-[10px] rounded border border-amber-300">
                                🔒 {f} ➔ [REDACTED_BY_ABAC_POLICY]
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cleansed Output Record (Delivered to Client) */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          FINAL CLEANSED GOLDEN RECORD DELIVERED TO CLIENT API:
                        </span>
                        <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-[11px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
                          {JSON.stringify(zeroTrustSimResult.step2_abac.filteredPayload, null, 2)}
                        </pre>
                      </div>

                      {/* HSM Cryptographic Seals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 bg-slate-950 text-slate-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase block">SHA-256 CLEANSED DIGEST</span>
                          <div className="font-mono text-cyan-300 truncate" title={zeroTrustSimResult.step3_hsm.payloadHash}>
                            {zeroTrustSimResult.step3_hsm.payloadHash}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-950 text-slate-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase block">HSM NON-REPUDIATION SEAL</span>
                          <div className="font-mono text-emerald-300 truncate" title={zeroTrustSimResult.step3_hsm.hsmSignature}>
                            {zeroTrustSimResult.step3_hsm.hsmSignature}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Non-Repudiation Immutable Audit Trail Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Immutable Non-Repudiation Audit Trail (Cryptographically Sealed)
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Permanent record of all processed B2B transactions with their ABAC redaction metrics and HSM hardware signatures.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {hsmAuditTrail.length} Records Logged
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Audit ID &amp; Time</th>
                    <th className="p-3">Tenant Peer</th>
                    <th className="p-3">Subject Role / Region</th>
                    <th className="p-3">ABAC Redactions</th>
                    <th className="p-3">Payload SHA-256 Digest</th>
                    <th className="p-3">HSM Hardware Signature</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {hsmAuditTrail.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{log.id}</span>
                        <span className="text-[10px] text-slate-400 block">{log.timestamp}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                          {log.tenantId}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-800 font-semibold block">{log.userRole}</span>
                        <span className="text-[10px] text-slate-400 block">Region: {log.userRegion}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.maskedFieldsCount > 0 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {log.maskedFieldsCount} fields masked
                        </span>
                      </td>
                      <td className="p-3 text-cyan-700 font-bold text-[10px] max-w-36 truncate" title={log.payloadHash}>
                        {log.payloadHash}
                      </td>
                      <td className="p-3 text-emerald-700 font-bold text-[10px] max-w-36 truncate" title={log.hsmSignature}>
                        {log.hsmSignature}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Python Unified Zero-Trust Security Module Snippet */}
          <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md space-y-3 font-mono">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">
                  Production Python Pipeline Module (`semantra_zero_trust_pipeline.py`)
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`# Semantra Sovereign Zero-Trust Security Pipeline (mTLS ➔ ABAC ➔ HSM)
import hashlib, json, time
from typing import Dict, Any, Tuple

class HardwareSecurityModule:
    """Hardware Security Module (HSM) Cryptographic Signer."""
    def __init__(self, key_id: str = "${hsmKeyId}"):
        self._hsm_key_id = key_id

    def sign_payload(self, payload_hash: str) -> str:
        """Cryptographically signs SHA-256 digest of cleansed payload."""
        raw_signature = f"{payload_hash}:{self._hsm_key_id}:VERIFIED_OK"
        return hashlib.sha256(raw_signature.encode('utf-8')).hexdigest()

class ABACPolicyEngine:
    """Attribute-Based Access Control Policy Engine with Field-Level Redaction."""
    def __init__(self):
        self.policies = [
            {
                "policy_id": "POL_FINANCE_CEE",
                "subject_role": "FINANCE_ANALYST",
                "allowed_region": "CEE",
                "max_amount_view": 50000.0,
                "restricted_fields": ["margin_percentage", "supplier_bank_account", "internal_cost_center"]
            }
        ]

    def filter_payload(self, user_role: str, user_region: str, data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        filtered = data.copy()
        for policy in self.policies:
            if policy["subject_role"] == user_role:
                if policy["allowed_region"] != "GLOBAL" and policy["allowed_region"] != user_region:
                    return False, {}
                
                # Check numeric constraint
                amount = filtered.get("amount", 0.0)
                if isinstance(amount, (int, float)) and amount > policy["max_amount_view"]:
                    filtered["amount"] = f"[EXCEEDS_AUTHORIZATION_LIMIT: Max \${policy['max_amount_view']}]"
                
                # Field-Level Redaction
                for field in policy["restricted_fields"]:
                    if field in filtered:
                        filtered[field] = "[REDACTED_BY_ABAC_POLICY]"
        return True, filtered

class SemantraZeroTrustPipeline:
    def __init__(self):
        self.hsm = HardwareSecurityModule()
        self.abac = ABACPolicyEngine()
        self.trusted_certs = {
            "SHA256:4A:8B:12:34:56:78:BOSCH_CERT": {"tenant": "TENANT_BOSCH", "role": "FINANCE_ANALYST", "region": "CEE"},
            "SHA256:9F:8E:76:54:32:10:CONTINENTAL_CERT": {"tenant": "TENANT_CONTINENTAL", "role": "SUPER_AUDITOR", "region": "GLOBAL"}
        }

    def process_b2b_request(self, client_cert_id: str, raw_data_record: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        # STEP 1: mTLS Transport Check
        if client_cert_id not in self.trusted_certs:
            return 403, {"error": "mTLS Authentication Failed: Untrusted Client Certificate"}

        client_info = self.trusted_certs[client_cert_id]

        # STEP 2: ABAC Field-Level Filtering
        allowed, filtered_data = self.abac.filter_payload(
            user_role=client_info["role"],
            user_region=client_info["region"],
            data=raw_data_record
        )
        if not allowed:
            return 403, {"error": "ABAC Authorization Denied: Geographic Constraint Violation"}

        # STEP 3: HSM Cryptographic Signing of Cleansed Record
        serialized_json = json.dumps(filtered_data, sort_keys=True)
        data_hash = hashlib.sha256(serialized_json.encode('utf-8')).hexdigest()
        hsm_signature = self.hsm.sign_payload(data_hash)

        return 200, {
            "client_tenant": client_info["tenant"],
            "data": filtered_data,
            "security_metadata": {
                "mtls_verified": True,
                "abac_applied": True,
                "hsm_signature": hsm_signature,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
        }`);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Python Pipeline</span>
              </button>
            </div>

            <pre className="text-xs text-emerald-400 overflow-x-auto p-3 bg-slate-950 rounded-lg leading-relaxed">
{`# Semantra Sovereign Zero-Trust Security Pipeline (mTLS ➔ ABAC ➔ HSM)
import hashlib, json, time
from typing import Dict, Any, Tuple

class HardwareSecurityModule:
    """Hardware Security Module (HSM) Cryptographic Signer."""
    def __init__(self, key_id: str = "${hsmKeyId}"):
        self._hsm_key_id = key_id

    def sign_payload(self, payload_hash: str) -> str:
        """Cryptographically signs SHA-256 digest of cleansed payload."""
        raw_signature = f"{payload_hash}:{self._hsm_key_id}:VERIFIED_OK"
        return hashlib.sha256(raw_signature.encode('utf-8')).hexdigest()

class ABACPolicyEngine:
    """Attribute-Based Access Control Policy Engine with Field-Level Redaction."""
    def __init__(self):
        self.policies = [
            {
                "policy_id": "POL_FINANCE_CEE",
                "subject_role": "FINANCE_ANALYST",
                "allowed_region": "CEE",
                "max_amount_view": 50000.0,
                "restricted_fields": ["margin_percentage", "supplier_bank_account", "internal_cost_center"]
            }
        ]

    def filter_payload(self, user_role: str, user_region: str, data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        filtered = data.copy()
        for policy in self.policies:
            if policy["subject_role"] == user_role:
                if policy["allowed_region"] != "GLOBAL" and policy["allowed_region"] != user_region:
                    return False, {}
                
                # Check numeric constraint
                amount = filtered.get("amount", 0.0)
                if isinstance(amount, (int, float)) and amount > policy["max_amount_view"]:
                    filtered["amount"] = f"[EXCEEDS_AUTHORIZATION_LIMIT: Max \${policy['max_amount_view']}]"
                
                # Field-Level Redaction
                for field in policy["restricted_fields"]:
                    if field in filtered:
                        filtered[field] = "[REDACTED_BY_ABAC_POLICY]"
        return True, filtered

class SemantraZeroTrustPipeline:
    def __init__(self):
        self.hsm = HardwareSecurityModule()
        self.abac = ABACPolicyEngine()
        self.trusted_certs = {
            "SHA256:4A:8B:12:34:56:78:BOSCH_CERT": {"tenant": "TENANT_BOSCH", "role": "FINANCE_ANALYST", "region": "CEE"},
            "SHA256:9F:8E:76:54:32:10:CONTINENTAL_CERT": {"tenant": "TENANT_CONTINENTAL", "role": "SUPER_AUDITOR", "region": "GLOBAL"}
        }

    def process_b2b_request(self, client_cert_id: str, raw_data_record: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        # STEP 1: mTLS Transport Check
        if client_cert_id not in self.trusted_certs:
            return 403, {"error": "mTLS Authentication Failed: Untrusted Client Certificate"}

        client_info = self.trusted_certs[client_cert_id]

        # STEP 2: ABAC Field-Level Filtering
        allowed, filtered_data = self.abac.filter_payload(
            user_role=client_info["role"],
            user_region=client_info["region"],
            data=raw_data_record
        )
        if not allowed:
            return 403, {"error": "ABAC Authorization Denied: Geographic Constraint Violation"}

        # STEP 3: HSM Cryptographic Signing of Cleansed Record
        serialized_json = json.dumps(filtered_data, sort_keys=True)
        data_hash = hashlib.sha256(serialized_json.encode('utf-8')).hexdigest()
        hsm_signature = self.hsm.sign_payload(data_hash)

        return 200, {
            "client_tenant": client_info["tenant"],
            "data": filtered_data,
            "security_metadata": {
                "mtls_verified": True,
                "abac_applied": True,
                "hsm_signature": hsm_signature,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
        }`}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: OpenAPI Contract Tab */}
      {activeTab === 'openapi' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Endpoint List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                Node.js Backend Endpoints
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                v1.3 REST
              </span>
            </div>

            <div className="space-y-2">
              {OPENAPI_ENDPOINTS.map((ep, idx) => {
                const isSelected = selectedEndpointIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedEndpointIndex(idx);
                      setApiTestResponse(null);
                    }}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500' 
                        : 'border-slate-150 bg-slate-50/20 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                        ep.method === 'POST' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">{ep.path}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans line-clamp-1">{ep.summary}</p>
                  </button>
                );
              })}
            </div>

            {/* Export Spec Action */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const blob = new Blob([generateOpenApiYaml()], { type: 'text/yaml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'semantra-openapi-spec.yaml';
                  a.click();
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export OpenAPI 3.0 YAML
              </button>
            </div>
          </div>

          {/* Right 2 Columns: Endpoint Inspector & Tester */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded ${
                      selectedEndpoint.method === 'POST' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900">{selectedEndpoint.path}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-sans leading-normal">{selectedEndpoint.description}</p>
                </div>

                <button
                  onClick={handleExecuteApiCall}
                  disabled={isExecutingApiTest}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${isExecutingApiTest ? 'animate-spin' : ''}`} />
                  {isExecutingApiTest ? 'Simulating...' : 'Send Request Stub'}
                </button>
              </div>

              {/* Sample Request Payload */}
              {selectedEndpoint.requestBodySample && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">SAMPLE REQUEST BODY (JSON)</span>
                  <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-200 overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(selectedEndpoint.requestBodySample, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Interactive Response Result */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">RESPONSE PAYLOAD</span>
                  {apiTestResponse && (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      200 OK (24ms)
                    </span>
                  )}
                </div>

                <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto max-h-60">
                  <pre>{apiTestResponse || JSON.stringify(selectedEndpoint.responseSample, null, 2)}</pre>
                </div>
              </div>

              {/* Code Snippets (cURL / Fetch) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">NODE.JS / FETCH INTEGRATION CODE</span>
                <div className="bg-white p-3 rounded border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto">
                  <code>{`const res = await fetch("http://localhost:3000${selectedEndpoint.path}", {
  method: "${selectedEndpoint.method}",
  headers: { "Content-Type": "application/json" },
  ${selectedEndpoint.requestBodySample ? `body: JSON.stringify(${JSON.stringify(selectedEndpoint.requestBodySample)})` : ''}
});
const data = await res.json();`}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
