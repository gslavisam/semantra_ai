import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, RotateCcw, ChevronRight, HelpCircle, ShieldCheck, GitBranch, CheckCircle2, AlertTriangle, Layers, FileCode2 } from 'lucide-react';

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    action: () => void;
  };
}

interface SemantraCopilotProps {
  activeTab: string;
  workspaceStep?: string;
  mappingCount?: number;
  lowConfidenceCount?: number;
  activeBranch?: string;
  selectedPreset?: string;
  onNavigateTab?: (tab: string) => void;
}

export const SemantraCopilot: React.FC<SemantraCopilotProps> = ({
  activeTab,
  workspaceStep = 'setup',
  mappingCount = 5,
  lowConfidenceCount = 1,
  activeBranch = 'main',
  selectedPreset = 'customer_sales_area',
  onNavigateTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am **Semantra Copilot**, your intelligent AI assistant built into the Semantra Data Workbench.

I can assist you across all integration stages:
- 🚀 **Getting Started Guide**: Step-by-step guidance on mapping, review, and code export workflows.
- 🔍 **Contract Reverse Engineering**: Inferring target schemas directly from SQL DDL, OpenAPI, or JSON payloads.
- 📊 **Workspace & Multi-Signal Diagnostics**: Analyzing match confidence scores (Name, Semantic, Knowledge, LLM) and risk alerts.
- 🌿 **Governance & Branching**: Explaining Draft Overlays, canonical dictionary staging, and benchmark evaluation deltas.
- 🧪 **Code Gen & Data Quality**: Exporting SQL, PySpark, and Pandas ETL scripts along with dbt schema tests and Great Expectations suites.
- 📚 **Enterprise Catalog**: Reusing approved organizational mapping rules and semantic concept search.

How can I help you today? You can type any question or pick a quick prompt below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const getContextQuickPrompts = () => {
    if (activeTab === 'workspace') {
      switch (workspaceStep) {
        case 'setup':
          return [
            { label: '⚙️ How to setup source model?', query: 'How do I select a preset source model or upload companion specs in Setup?' },
            { label: '🔍 How to use Reverse Engineering?', query: 'How does contract reverse engineering parse SQL DDL or OpenAPI into a target schema?' },
            { label: '🚀 5-Step Workflow Guide', query: 'What are the 5 main steps in the Semantra workspace workflow?' },
            { label: '🤖 Workspace Status', query: 'What is the current workspace status and recommended next steps?' }
          ];
        case 'mapping':
          return [
            { label: '🤖 How to run Batch AI Signals?', query: 'How does Batch AI Spec analysis work with Gemini to improve mapping scores?' },
            { label: '📊 Multi-Signal Scoring Breakdown', query: 'How do Name, Semantic, Knowledge, and LLM signals combine to build confidence?' },
            { label: '💡 How to add manual overrides?', query: 'How do I manually map an unmapped field to a target attribute?' },
            { label: '🤖 Workspace Status', query: 'What is the current workspace status and recommended next steps?' }
          ];
        case 'review':
          return [
            { label: '⚠️ Resolving Low Confidence', query: 'What causes fields to have low confidence scores and how to resolve them?' },
            { label: '🏛️ Promote to Canonical Glossary', query: 'How do I promote an approved workspace mapping into the Canonical Glossary?' },
            { label: '📜 Stewardship Decisions Log', query: 'Where are manual override decisions and audit logs stored?' },
            { label: '🤖 Workspace Status', query: 'What is the current workspace status and recommended next steps?' }
          ];
        case 'code':
          return [
            { label: '🌐 OpenLineage & Provenance', query: 'Explain how OpenLineage and data provenance tracking works in Semantra for EU AI Act compliance.' },
            { label: '💻 Export PySpark / SQL / Pandas', query: 'What transformation code formats can I export from Code Output?' },
            { label: '🧪 dbt Schema Tests & Great Expectations', query: 'How do I use auto-generated dbt schema.yml tests and Great Expectations?' },
            { label: '🚀 Deploying Generated Code', query: 'How can I run the generated transformation code in production?' }
          ];
        case 'ba_report':
          return [
            { label: '📄 Executive BA Spec Structure', query: 'What information is summarized in the Business Analyst Integration Report?' },
            { label: '📥 Exporting Executive Report', query: 'How can business stakeholders export or share this specification?' }
          ];
        default:
          break;
      }
    }

    if (activeTab === 'catalog') {
      return [
        { label: '📚 Semantic Vector Search', query: 'How does the Enterprise Catalog use vector similarity search to find concepts?' },
        { label: '♻️ Reusing Approved Mappings', query: 'How do I apply an approved catalog concept to my current workspace?' }
      ];
    }

    if (activeTab === 'reverse_engineering') {
      return [
        { label: '🔍 Supported Contract Formats', query: 'What contract types (SQL DDL, OpenAPI, JSON Schema) can I reverse engineer?' },
        { label: '📥 Importing Parsed Schema', query: 'How do I convert a parsed DDL contract into an active target schema?' }
      ];
    }

    if (activeTab === 'governance') {
      return [
        { label: '🌿 What are Draft Overlays?', query: 'Explain how Draft Overlays allow safe staging without touching the main dictionary.' },
        { label: '🎯 Benchmark Delta Testing', query: 'How do I test fit score improvements on a draft branch before merging?' }
      ];
    }

    if (activeTab === 'benchmarks') {
      return [
        { label: '🎯 Gold Baseline Precision & Recall', query: 'How are precision, recall, and fit scores evaluated against gold datasets?' }
      ];
    }

    if (activeTab === 'config') {
      return [
        { label: '⚙️ AI Model & API Key Config', query: 'How do I configure Google Gemini API keys or switch to offline mode?' }
      ];
    }

    if (activeTab === 'schema_drift') {
      return [
        { label: '📈 What is Schema Drift?', query: 'How does Semantra detect and adapt to schema drift without crashing downstream pipelines?' },
        { label: '📦 Dynamic JSONB & DLQ', query: 'How do _unmapped_dynamic_attributes and the Quarantine Dead Letter Queue work?' }
      ];
    }

    if (activeTab === 'type_coercion') {
      return [
        { label: '🔄 Strict Type Coercion', query: 'How does Semantra coerce formatted numeric strings and non-standard dates without precision loss?' },
        { label: '💻 Generated dbt SQL / PySpark', query: 'How do the generated dbt SQL and PySpark models implement safe casting functions?' }
      ];
    }

    if (activeTab === 'entity_resolution') {
      return [
        { label: '👥 Entity Resolution & Fuzzy Match', query: 'How do Jaro-Winkler and Levenshtein algorithms prevent entity duplication in Golden Records?' },
        { label: '⚖️ Auto-Merge vs Steward Review', query: 'How are similarity thresholds defined for automated merging vs Data Steward review?' }
      ];
    }

    if (activeTab === 'transactional_outbox') {
      return [
        { label: '📻 Transactional Outbox Pattern', query: 'How do Transactional Outbox and CDC Debezium solve the Dual-Write problem with Kafka?' },
        { label: '🛡️ At-Least-Once Delivery', query: 'How is zero message loss guaranteed between the relational database and Kafka event streams?' }
      ];
    }

    return [
      { label: '🚀 First Steps & Guide', query: 'What should be my first step in the app and how do I start?' },
      { label: '🤖 Workspace Status', query: 'What is the current workspace status and recommended next steps?' },
      { label: '🌿 How does Branching work?', query: 'Explain how Draft Overlays and Branching operate in the Governance console.' },
      { label: '🧪 Automated Quality Tests', query: 'What do the auto-generated dbt and Great Expectations tests provide?' }
    ];
  };

  const quickPrompts = getContextQuickPrompts();

  const generateAnswer = (userText: string): string => {
    const q = userText.toLowerCase();

    // Multilingual context-aware intent Definitions
    const INTENT_DEFINITIONS: Record<string, string[]> = {
      getting_started: [
        'start', 'begin', 'first step', 'guide', 'workflow', 'how to use', 'how do i', 'get started', 'tutorial', 'walkthrough', 'overview', 'introduction', 'learn', 'help',
        'pocen', 'pocet', 'počn', 'kako', 'kren', 'korak', 'prv', 'uvod', 'uputst', 'tutorij', 'pomoc', 'pomoć',
        'commencer', 'aide', 'guia', 'starten', 'hilfe', 'anfangen', 'passo'
      ],
      reverse_engineering: [
        'reverse', 'contract', 'ddl', 'openapi', 'swagger', 'infer', 'parse', 'import schema', 'json schema',
        'reverz', 'kontrakt', 'ddl', 'openapi', 'swagger', 'uvez', 'pars', 'strukt', 'baza', 'shem', 'šem', 'reverse engineering', 'json_schema'
      ],
      setup: [
        'setup', 'preset', 'companion', 'upload', 'spec', 'metadata', 'excel', 'csv', 'xml', 'source',
        'podes', 'podeš', 'preset', 'sablon', 'šablon', 'ucit', 'učit', 'companion', 'metapod', 'izvor', 'excel', 'fajl',
        'configurer', 'uploaden'
      ],
      ba_report: [
        'ba report', 'business analyst', 'executive', 'report', 'spec', 'lineage', 'summary',
        'izvest', 'izvešt', 'analit', 'report', 'biznis', 'rezime', 'pregled'
      ],
      decisions: [
        'decision', 'audit', 'log', 'history', 'override', 'steward', 'rationale', 'manual',
        'odluk', 'audit', 'log', 'istorij', 'override', 'steward', 'rucn', 'ručn', 'menj', 'izmen', 'promen'
      ],
      catalog: [
        'catalog', 'search', 'reuse', 'similarity', 'vector', 'enterprise catalog', 'concept',
        'katalog', 'pretraz', 'pretraž', 'ponov', 'slicn', 'sličn', 'vektor', 'koncept'
      ],
      benchmarks: [
        'benchmark', 'evaluate', 'accuracy', 'gold', 'precision', 'recall', 'test set', 'baseline',
        'benchmark', 'evalu', 'tacn', 'tačn', 'preciz', 'gold', 'test'
      ],
      config: [
        'config', 'api key', 'gemini', 'model', 'setting', 'provider', 'key',
        'konfig', 'podes', 'podeš', 'kljuc', 'ključ', 'api', 'gemini', 'model'
      ],
      status: [
        'status', 'recommend', 'next step', 'active', 'progress', 'where am i',
        'status', 'preporu', 'sledec', 'sledeć', 'sta', 'šta', 'korak', 'napred'
      ],
      branching: [
        'branch', 'overlay', 'draft', 'governance', 'admin', 'merge', 'stage', 'staged',
        'grana', 'overlay', 'draft', 'spaj', 'merge', 'admin', 'verzij'
      ],
      dbt_quality: [
        'dbt', 'quality', 'sanitize', 'expectations', 'test', 'validate', 'assertion',
        'dbt', 'kvalitet', 'expectations', 'test', 'valid', 'prov'
      ],
      openlineage: [
        'openlineage', 'lineage', 'provenance', 'marquez', 'datahub', 'eu ai act', 'trace', 'origin', 'facet',
        'lineage', 'poreklo', 'porekl', 'trag', 'trasibilnost', 'trasir', 'audit trail', 'marquez', 'datahub'
      ],
      scoring: [
        'score', 'signal', 'compute', 'confidence', 'algorithm', 'weight', 'name signal', 'semantic',
        'score', 'skor', 'signal', 'prorac', 'prorač', 'pover', 'algor', 'tez', 'tež'
      ],
      risk: [
        'risk', 'warn', 'alert', 'low', 'danger', 'issue', 'error',
        'rizik', 'upozor', 'alert', 'warn', 'nisk', 'opasn', 'problem'
      ]
    };

    // Calculate score for each intent based on multilingual keywords and exact matching
    const scores: Record<string, number> = {};
    Object.entries(INTENT_DEFINITIONS).forEach(([intentId, keywords]) => {
      let score = 0;
      keywords.forEach(kw => {
        if (q.includes(kw)) {
          // Boost exact matches
          const isExactWord = new RegExp(`\\b${kw}\\b`, 'i').test(q);
          score += isExactWord ? 3.0 : 1.2;
        }
      });
      scores[intentId] = score;
    });

    // Add Context-Sensitive Boosts
    if (activeTab === 'workspace') {
      if (workspaceStep === 'setup') {
        scores.setup += 2.0;
        scores.reverse_engineering += 1.0;
        scores.getting_started += 0.5;
      } else if (workspaceStep === 'mapping') {
        scores.scoring += 2.0;
        scores.status += 1.2;
      } else if (workspaceStep === 'review') {
        scores.decisions += 2.0;
        scores.risk += 1.5;
      } else if (workspaceStep === 'code') {
        scores.dbt_quality += 2.0;
      } else if (workspaceStep === 'ba_report') {
        scores.ba_report += 2.0;
      }
    } else if (activeTab === 'catalog') {
      scores.catalog += 2.5;
    } else if (activeTab === 'reverse_engineering') {
      scores.reverse_engineering += 2.5;
    } else if (activeTab === 'governance') {
      scores.branching += 2.5;
    } else if (activeTab === 'benchmarks') {
      scores.benchmarks += 2.5;
    } else if (activeTab === 'config') {
      scores.config += 2.5;
    }

    // Get the intent with the highest score
    const sortedIntents = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const bestIntent = sortedIntents[0];

    // If we have a reasonable confidence match, resolve with the proper response
    if (bestIntent && bestIntent[1] > 1.0) {
      const intentId = bestIntent[0];

      if (intentId === 'getting_started') {
        return `🚀 **Getting Started Guide & Recommended 5-Step Workspace Pipeline:**

Welcome to **Semantra v1.3 Enterprise Workbench**! Here is the recommended step-by-step path to execute semantic data integration:

1️⃣ **Step 1: Setup & Ingestion (Workspace > Setup)**
   - Select a verified enterprise pilot preset (e.g. \`SAP DEBMAS Customer Master\`, \`Workday Worker XML\`, \`QuickBooks Invoices\`) or upload your custom CSV, JSON, DDL, or Excel schema.
   - Attach optional **Companion Metadata / Spec Sheets** to enrich semantic context.
   - Built-in **PII Sanitization Shield** automatically detects and masks confidential values.

2️⃣ **Step 2: Review Candidates & Multi-Signal Scoring (Workspace > Candidates)**
   - Inspect automated candidate alignments ranked across 10 deterministic and AI signals with **Reciprocal Rank Fusion (RRF)**.
   - Open the **Signal Breakdown Drawer** for granular heuristic math and RRF confidence insights.

3️⃣ **Step 3: Decision Log & Human-in-the-Loop Review (Workspace > Decisions)**
   - Accept, override, reject, or attach custom transformation logic (*Direct Map*, *Type Cast*, *SQL Expression*, *Regex Extraction*, *Lookup Table*).
   - All actions generate an immutable audit trail with timestamp and steward rationale.

4️⃣ **Step 4: Code Output & Test Generation (Workspace > Code)**
   - Export production-ready ETL scripts in **PySpark DataFrame**, **ANSI SQL / dbt**, **Pandas**, and **MuleSoft DataWeave**.
   - Review automatically generated **Data Quality Invariants**, dbt schema tests, and Great Expectations suites.
   - Run live Python sandbox dry-runs against sample datasets.

5️⃣ **Step 5: Executive Business Analyst Report (Workspace > BA Report)**
   - Generate and export the complete **Executive BA Specification Report** in Markdown / PDF for stakeholders.

❓ *Would you like me to guide you through Step 1 (Setup) or Step 2 (Review Candidates) right now?*`;
      }

      if (intentId === 'reverse_engineering') {
        return `🔍 **Contract Reverse Engineering Engine (Mode 2):**
- **Purpose:** Deconstructs complex, multi-entity legacy schemas, raw DDL scripts, WSDL/XSD definitions, and OpenAPI contracts into vendor-agnostic canonical models.
- **8-Step Architecture:**
  1. **Multi-Entity Raw Input:** Ingests relational SQL DDLs, OpenAPI specs, Workday WSDLs, and nested JSON schemas.
  2. **Structural Decomposition:** Identifies entities, fields, data types, and nullability flags.
  3. **Entity Relationship Graph & Smart FK Analysis:** Interactive visual topology graph deducing cardinalities (\`1:1\`, \`1:N\`, \`N:M\`) and integrity behaviors (\`CASCADE\` vs \`RESTRICT\`).
  4. **Canonical Model Synthesis:** Synthesizes vendor-agnostic entities with >90% calculated confidence.
  5. **Contract Invariant Assertions:** Mathematically derives contract rules with **1-Click Sync to Workspace Test Sets**.
  6. **Multi-Target Code Export:** Generates clean schema contracts, Python adapters, and TypeScript DTOs for enterprise ESBs (MuleSoft, Boomi, Camel).
  7. **Visual Architecture Diagram:** End-to-end topology mapping source systems, middleware gateways, and targets.
  8. **Executive BA Contract Report:** Formally structured readiness assessment for architects and stakeholders.`;
      }

      if (intentId === 'setup') {
        return `⚙️ **Workspace Setup, Preset Models & Companion Specs:**

To start your integration project, you first establish your **Source Model** and configure your **Target Mapping Profile** in the **Workspace > Setup** stage.

1️⃣ **Selecting a Preset Source Model:**
   - In **Workspace**, make sure you are on the first sub-tab, **Setup**.
   - Choose from our standard predefined enterprise presets:
     - **SAP Customer Sales Area** (Customer relationships, sales districts, status)
     - **SAP Material Master** (Products, units of measure, material groups)
     - **SAP Supplier Master** (Vendors, buying organizations, payment terms)
     - **Generic Account Master** (Financial / GL Accounts, balances)
     - **Custom Model** (Load or define your own custom target attributes)

2️⃣ **Uploading Companion Specifications (Metadata):**
   - If you have an Excel sheet (\`.xlsx\`/\".xls\"), a CSV file, a SQL DDL, or a Talend XML schema describing your source data fields, click **"Upload Companion Metadata"**.
   - Semantra automatically parses the file, extracts field names, infers data types, and retrieves descriptions/sample values.
   - For Excel or CSV files, Semantra lets you map your file's columns (specifying which columns correspond to the *Field Name*, *Description*, *Data Type*, and *Sample Values*).
   - Once mapped, this metadata is ingested as **Companion Metadata** to directly feed the **Multi-Signal Matching Engine**, significantly increasing automated fit scores!

3️⃣ **Proceeding to Mapping:**
   - Once your preset or companion specs are configured, click the green **"Proceed to Field Mapping"** button to run match algorithms and begin reviewing candidate mappings!

❓ *Would you like me to explain how companion metadata enriches Name and Semantic matching signals?*`;
      }

      if (intentId === 'ba_report') {
        return `📄 **Business Analyst (BA) Integration Report:**
- **Purpose:** Generates a business-friendly integration spec summarizing technical mapping lineage into an executive narrative.
- **Key Sections:**
  1. **Executive Summary & Risk Assessment:** High-level metrics on mapping coverage and low-confidence warnings.
  2. **Detailed Lineage Table:** Source field to target attribute crosswalk with explicit transformation rules.
  3. **Stewardship Rationale:** Documented reasons for confidence scores, canonical concept alignments, and manual overrides.
- **Exporting:** View the **BA Report** tab from the top navigation to inspect or export the specification for business stakeholders and governance reviews.`;
      }

      if (intentId === 'decisions') {
        return `📜 **Stewardship Decisions & Audit Log:**
- **Purpose:** Maintains a immutable audit trail of every steward action taken within the workbench.
- **What is Tracked:**
  - Manual confidence overrides (e.g., elevating a rule from *Low* to *High*).
  - Custom transformation formula edits.
  - Rejections, approvals, and promotions into the Enterprise Catalog or Canonical Glossary.
  - Timestamps, steward identifiers, and contextual rationale.
- **Access:** Click **"Decisions"** in the top navigation bar during workspace mapping to inspect decision history.`;
      }

      if (intentId === 'catalog') {
        return `📚 **Enterprise Catalog & Reuse Engine:**
- **Purpose:** Prevents re-inventing the wheel by indexing approved mapping patterns across all enterprise integration projects.
- **Key Capabilities:**
  - **Semantic Vector Search:** Search for target concepts like *"Customer Tax ID"* or *"Material Number"* to find approved crosswalks.
  - **Similarity Matching:** Auto-suggests catalog matches during active workspace mapping when source fields resemble existing enterprise rules.
  - **Promotion Workflow:** Approved rules in the workspace can be promoted directly into the catalog for organization-wide reuse.`;
      }

      if (intentId === 'benchmarks') {
        return `🎯 **Benchmark & Accuracy Evaluation Suite:**
- **Purpose:** Provides rigorous, quantitative evaluation of mapping engine accuracy against verified gold-standard datasets (SAP DEBMAS, Workday Worker, QuickBooks).
- **Key Metrics Tracked:**
  - **Precision (P):** TP / (TP + FP) — Proportion of mapped attributes that are genuinely accurate.
  - **Recall (R):** TP / (TP + FN) — Coverage of target domain discovered automatically.
  - **F1-Score:** Balanced harmonic mean measuring robust accuracy without sacrificing volume.
- **Golden Master Alignment Audit:**
  - Audits workspace mappings against the authoritative Golden Master specification.
  - Identifies 4 deviation classes: *Exact Match (100%)*, *Functional Variation*, *Target Discrepancy*, and *Missing Mapping*.
  - **1-Click Auto-Healing:** Click **"Auto-Align with Golden Master"** to instantly reconcile workspace rules with reference standards.
- **Analyst Correction Impact:** Plots historical ROI curves proving exponential reduction in manual review hours over time.`;
      }

      if (intentId === 'config') {
        return `⚙️ **System Configuration & AI Provider Settings:**
- **Purpose:** Controls the underlying AI model providers, API keys, signal weights, and runtime execution modes.
- **Options Available:**
  - **Model Selection:** Choose between Google Gemini (Gemini 2.5 Flash), Anthropic Claude, or Offline Deterministic Mode.
  - **Signal Weight Tuning:** Adjust the balance between Name, Semantic, Knowledge, and LLM signals.
  - **Circuit Breaker Engine:** Live monitoring of fail-safe execution states with automatic fallback.
  - **Zero-Trust Security Triad:** Real-time demonstration of mTLS transport validation, ABAC dynamic field masking, and Hardware HSM digital signing.
  - **Express Server API Catalog:** Inspect protected backend routes on port 3000 ensuring zero API key exposure to browser clients.
- **Access:** Click **"System Config"** at the bottom of the left sidebar.`;
      }

      if (intentId === 'status') {
        return `📊 **Current Workspace Status:**
- **Active Preset / Source:** \`${selectedPreset}\`
- **Total Mapped Fields:** \`${mappingCount}\`
- **Low Confidence Fields:** \`${lowConfidenceCount}\`

💡 **Copilot Recommendations:**
1. Open the **Trust Review** tab to inspect fields marked with *Low/Medium confidence*.
2. Run **Batch AI Signals** (Gemini Spec Analysis) to enrich semantic signals.
3. For verified mapping rules, execute **Promote into Canonical Glossary** for permanent enterprise reuse.

❓ *Would you like me to take you directly to the Trust Review tab to address low-confidence items?*`;
      }

      if (intentId === 'branching') {
        return `🌿 **Branching & Draft Overlays Engine:**
- **Active Governance Branch:** \`${activeBranch}\`
- **How it works:** Instead of directly editing the main production canonical glossary (\`main\`), data stewards prepare changes in an isolated **Draft Overlay** branch (e.g. \`draft/v1.3-procurement\`).
- **Testing & Benchmarking:** On a draft branch, you stage dictionary changes, execute **Test Benchmark Delta** against gold evaluation datasets, and verify accuracy gains (e.g. +3.8% fit score improvement).
- **Promotion (Merge):** Once benchmark tests pass validation, stewards execute **Merge to Main**, promoting the staged rules into the official production baseline.

❓ *Would you like assistance creating a new draft branch or testing benchmark fit score deltas?*`;
      }

      if (intentId === 'dbt_quality') {
        return `🧪 **Automated Data Quality & Sanitization Tests:**
- **Purpose:** In addition to ETL/ELT SQL and PySpark transformation code, Semantra automatically generates target data quality tests.
- **Available Formats in Code Output:**
  1. **dbt Schema Tests (\`schema.yml\`):** Generates \`not_null\` assertions, \`unique\` key checks, and \`accepted_values\` for enum attributes.
  2. **Great Expectations:** Builds a ready-to-execute Python suite with \`expect_column_values_to_not_be_null\` and type validations.
  3. **SQL Data Quality Audit:** Standard SQL query scripts to audit NULL counts, duplicate records, and whitespace (\`TRIM\` anomalies).

❓ *Which quality test format (dbt YAML, Great Expectations Python, or SQL Audit) would you like to inspect?*`;
      }

      if (intentId === 'openlineage') {
        return `🌐 **Data Lineage & OpenLineage Standard (EU AI Act 2026 Auditability):**
Semantra provides complete end-to-end data provenance tracking conforming to the **OpenLineage 1.0 Standard**:
- 🏷️ **Input & Output Datasets:** Tracks source raw namespaces (\`sap.production.erp\`) and target canonical golden datasets (\`semantra.canonical.db\`) with dataset hashes and column-level schemas.
- ⚙️ **Transformation Facets:** Embeds deterministic mapping rules, RRF match scores, and PII redaction shield rules directly into metadata facets.
- 🔒 **Sovereign Security Facets:** Non-repudiation cryptographic verification (mTLS x509 + HSM signing context).
- 🚀 **Marquez & DataHub Compatibility:** Emits standard \`START\`, \`RUNNING\`, \`COMPLETE\`, and \`FAIL\` event payloads ready for automated ingestion into corporate catalog graphs.

💡 *Navigate to **Step 4: Output &rarr; OpenLineage (DataHub/Marquez)** to view the interactive lineage graph, test event emissions, or copy the standard JSON/Python tracking script.*`;
      }

      if (intentId === 'scoring') {
        return `📊 **Multi-Signal Scoring Engine Architecture:**

Semantra calculates candidate match rankings across 10 deterministic & AI signals using Reciprocal Rank Fusion (RRF with k=60):
- 🔤 **Exact & Token Signals:** Exact name matches and token similarity (Levenshtein / Jaro-Winkler).
- 🧠 **Semantic & Embedding Signals:** Vector similarity and semantic definitions.
- 📘 **Knowledge & Canonical Signals:** Active overlay dictionaries and enterprise glossary rules.
- 📊 **Pattern & Statistical Signals:** Regex matching, value ranges, and data type compatibility.
- 🤖 **Correction & Bounded LLM Signals:** Contextual AI evaluation and historical steward confirmations.

**Confidence Thresholds:**
- **High (≥ 0.80):** Green indicator — approved for automated transformation.
- **Medium (0.60 - 0.79):** Yellow indicator — review recommended.
- **Low (< 0.60):** Red indicator — requires steward manual review.

❓ *Do you want to know how adding a companion specification improves confidence scores?*`;
      }

      if (intentId === 'risk') {
        return `⚠️ **Integration Field Risk Assessment:**
- Detected **${lowConfidenceCount}** field(s) with low confidence.
- Common risk factors:
  1. Missing companion specification or ambiguous source description.
  2. Data type mismatches (e.g. \`VARCHAR\` to \`DECIMAL\`).
  3. Absence of matching canonical concept rules in the glossary.
- **Remediation:** Navigate to **"Trust Review"** to supply explicit transformation logic or trigger AI spec enrichment.

❓ *Shall we review the specific fields causing low confidence in your active dataset?*`;
      }
    }

    // Out-of-scope / Unrecognized Query Handling
    return `🤖 **Semantra AI Assistant:**
I am specialized in the **Semantra Data Workbench** and enterprise data integration domain.

Your query seems outside our core data workbench features, or requires further detail. I am equipped to assist you with:
- 🔍 **Contract Reverse Engineering** (SQL DDL, OpenAPI, JSON Schema parsing)
- 🌿 **Governance & Branching** (Draft dictionary overlays & benchmark testing)
- 💻 **ETL Code Generation** (Pandas, PySpark, dbt, SQL, Talend)
- 🧪 **Data Quality & Sanitization** (dbt schema tests & Great Expectations)
- 📘 **Companion Specs & Metadata** (SAP, Salesforce & legacy system integration)
- 🛡️ **Bounded AI Philosophy** (Deterministic-first governance model)

❓ *Could you clarify how your question relates to your current data integration or mapping task?*`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: messages.slice(-8).map(m => ({ sender: m.sender, text: m.text })),
          activeTab,
          workspaceStep,
          mappingCount,
          lowConfidenceCount,
          activeBranch
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const replyText = data.text || generateAnswer(text);

      const assistantMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.warn('AI Copilot online API failed, using local rule-based model fallback:', err);
      const replyText = generateAnswer(text);
      const assistantMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Sidebar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left border font-mono group cursor-pointer ${
          isOpen
            ? 'bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/70 hover:border-emerald-500/40'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="leading-tight truncate">
            <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
              Semantra Copilot
            </p>
            <p className="text-[10px] text-emerald-400 font-sans font-light truncate">AI Help &amp; Diagnostics</p>
          </div>
        </div>
        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
          AI
        </span>
      </button>

      {/* Floating Interactive Drawer Modal */}
      {isOpen && (
        <div className="fixed bottom-4 left-68 z-50 w-[445px] max-w-[calc(100vw-18rem)] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 font-mono text-xs">
          {/* Header */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white leading-none flex items-center gap-1.5">
                  Semantra Copilot
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded font-sans font-medium">
                    🛡️ PII Safe
                  </span>
                </h3>
                <span className="text-[9px] text-slate-400 font-sans flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Context: <strong className="text-slate-200 uppercase">{activeTab}{activeTab === 'workspace' ? ` > ${workspaceStep}` : ''}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Reset Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Summary Tag */}
          <div className="px-3 py-1.5 bg-emerald-950/30 border-b border-slate-800/80 text-[10px] text-emerald-300 flex items-center justify-between font-sans">
            <span className="truncate">Active preset: <strong className="font-mono text-emerald-200">{selectedPreset}</strong></span>
            <span className="shrink-0 font-mono bg-emerald-900/50 px-1.5 py-0.5 rounded text-[9px] border border-emerald-800">
              {mappingCount} mappings ({lowConfidenceCount} low)
            </span>
          </div>

          {/* Messages Area */}
          <div className="p-3 overflow-y-auto max-h-[380px] min-h-[260px] space-y-3 bg-slate-900/95 font-sans">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-xs font-medium'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono p-2 bg-slate-950/60 rounded-lg border border-slate-800 w-fit">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                <span>Semantra Copilot is thinking...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2 bg-slate-950 border-t border-slate-800/80 flex flex-wrap gap-1 font-sans">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p.query)}
                className="px-2 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors text-left"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Ask Copilot about the application..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 text-xs font-sans placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
