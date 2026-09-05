# Semantra • Semantic Integration & Data Mapping Workbench

**Semantra** is an enterprise-grade, deterministic-first semantic integration and data mapping workbench. It combines multi-signal heuristic ranking, bounded AI validation, canonical stewardship, and integration contract reverse-engineering in a unified full-stack application built with **React 18**, **TypeScript**, and **Express (Node.js)**.

---

## 🌟 Key Capabilities

### 1. Workspace & Mapping Engine (Mode 1)
- **Multi-Format Ingestion**: Ingest CSV, JSON, XML, Excel (.xlsx), and DDL schema specifications with automated data profiling and companion metadata enrichment.
- **Deterministic Multi-Signal Scoring**: Combines syntactic, token jaccard, semantic embeddings, data type compatibility, and structural context signals into an explainable composite match score.
- **Explainable Review & Routing**: Categorizes mapping proposals into `high_confidence`, `needs_review`, and `unmapped_gap` with full signal breakdowns.
- **Target Transformations & Starter Code**: Authors structured Transformation Design specs and generates production-ready **Python (Pandas)**, **PySpark**, **dbt SQL**, and **TypeScript** code.
- **Assertions Test Suite**: Authors, verifies, and executes validation invariants with 1-click test harness generation.
- **Executive Mapping Summaries & Audio Briefing**: Generates technical mapping analysis reports and multi-speaker audio briefings.

### 2. Integration Contract Reverse Engineering (Mode 2 / WF-13)
- **7-Step Reverse Engineering Pipeline**:
  1. *Ingest & Health Audit*: Parses JSON/XML payloads, computes structural health scores, and performs null-ratio audits.
  2. *Payload Deconstruction*: Flattens nested hierarchies, discovers leaf types, and matches canonical concepts.
  3. *Smart Graph & FK Relations*: Automatically extracts cross-entity Foreign Keys, cardinalities (`1:1`, `1:N`, `N:1`), and `CASCADE`/`RESTRICT` lifecycle rules.
  4. *Assertions Synchronization*: Synchronizes discovered schema constraints (`PRIMARY_KEY`, `NOT_NULL`, `CHECK`, `PII_MASKED`) into the Semantra Test Suite with 1-click generation of PyTest & SQL harnesses.
  5. *Canonical Model Synthesis*: Synthesizes unified JSON Schema contracts and domain models.
  6. *Refined Contract & Export*: Generates executable Python/TS middleware transformation code and SQL DDL.
  7. *Visual Architecture & BA Report*: Renders interactive visual dependency graphs and exports Business Analyst Executive Architecture reports.

### 3. Canonical Governance & Stewardship Console
- **Canonical Concept Registry**: Manages enterprise standard entities, attributes, business domains, and field aliases.
- **Git-Like Versioning & Sandboxes**: Isolates vocabulary iterations across branch sandboxes (`main`, `draft` branches).
- **3-Way Merge Conflict Resolution Wizard**: Interactive visual conflict resolution allowing attribute-by-attribute reconciliation (*Use Draft*, *Keep Main*, *Custom Override*) with cryptographic commit hashes and idempotency transaction keys.
- **Stewardship Audit Trail**: Immutable log of approvals, overlays, and branch merges with JSON export capabilities.

### 4. Integration Catalog & Reuse
- **Searchable Integration Inventory**: Index approved mapping sets and canonical models.
- **Workspace Reuse Fit**: Evaluates reuse compatibility against current workspace schema with confidence scoring.

### 5. Benchmarks & Quality Calibration
- **Scoring Profile Evaluation**: Evaluates mapping accuracy against benchmark datasets across Strict, Balanced, and Semantic-heavy scoring profiles.
- **Correction Impact Analysis**: Measures how analyst corrections and manual overrides improve downstream accuracy.

### 6. Human-in-the-Loop (HITL) Execution Console & Safety Gate (WF-15)
- **4-Stage Execution Pipeline**:
  1. *Ingest & Dry-Run Simulation*: Simulates transformations in-memory with **zero target database mutations**.
  2. *Staging & Exception Engine*: Auto-approves safe matches (≥ 90% confidence) while isolating unknown aliases, format ambiguities, and schema type violations.
  3. *Human Review & Triage*:
     - **"Apply to All Similar"**: Resolves repeated aliases (e.g. `supplier_vat_id` → `tax_identification_number`) across the entire batch with one click.
     - **Dead-Letter Queue (DLQ / Quarantine)**: Quarantines unfixable records or enables inline value fixes, **unblocking the execution of remaining clean records**.
  4. *Verified Commit & Sign-off*: Atomically commits clean records, applies a SHA-256 cryptographic batch seal, records Data Steward credentials (Name, Role, Rationale), and exports audit trails compliant with **SOC2, ISO 27001, and EU AI Act (Article 14 - Human Oversight)**.

### 7. Modern Architecture Studios & Data Mesh Tools
- **Data Contracts (ODC) & GitOps CI/CD**: Authors Open Data Contract Standard (ODCS v3.0.1) contracts, runs automated linter & breaking-change detection, and triggers GitOps PR creation.
- **Import & AI Enrichment Studio**: Grid-based schema ingestion, AI-assisted description & semantic tag generation, and bulk type inferencing.
- **Zero-Trust Security Triad**: End-to-end mTLS certificates, Attribute-Based Access Control (ABAC), and simulated Cloud HSM key management.

### 8. System Health, Observability & Circuit Breakers
- **Live Circuit Breaker**: Real-time monitoring and controls for server-side Gemini AI calls.
- **Security & Privacy Controls**: Built-in PII masking heuristics with field-level redaction for sensitive enterprise data.

---

## 🏗️ Architecture & Technology Stack

```
┌──────────────────────────────────────────────────────────┐
│                   React 18 Client (SPA)                  │
│  - Vite + TypeScript + Tailwind CSS                      │
│  - Lucide Icons + Motion (framer-motion)                 │
│  - Deterministic Mapping & Heuristic Scoring Engine     │
│  - 7-Step Reverse Engineering & Contract Synthesis       │
│  - 3-Way Merge Conflict Wizard & Canonical Stewardship    │
└────────────────────────────┬─────────────────────────────┘
                             │  HTTP API Proxy / Middleware
┌────────────────────────────▼─────────────────────────────┐
│                 Express Server (Node.js)                 │
│  - Entry Point: server.ts (Port 3000)                    │
│  - Secure Server-Side Google Gemini 3.8 API Integration  │
│  - Health, Telemetry & Circuit Breaker API Endpoints     │
│  - Bundled Production CJS via esbuild                    │
└──────────────────────────────────────────────────────────┘
```

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, `@google/genai` (server-side proxy), Lucide React, Motion.
- **Backend / API**: Node.js, Express, esbuild.
- **Bounded AI**: Google Gemini 3.8 (`gemini-3.8-flash`) for advisory explanations, contract analysis, and refinement suggestions (server-side proxying). Multi-provider support for OpenAI (GPT-6 Astra), Anthropic (Claude Sonnet 5), Local AI (Ollama & LM Studio), and Custom API gateways.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ or v20+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd semantra

# Install dependencies
npm install
```

### Environment Variables
Create a `.env` file based on `.env.example`:
```env
# Server-side Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Production Build & Run
```bash
# Compile client assets with Vite and bundle the Express server with esbuild
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
├── src/
│   ├── components/            # React UI components & views
│   │   ├── Workspace.tsx       # Primary mapping & profiling workbench (Pipeline Steps 1-6)
│   │   ├── HumanInTheLoopExecutionConsole.tsx # 4-Stage HITL Dry-Run & Verified Commit Engine
│   │   ├── ReverseEngineeringView.tsx # 7-Step contract reverse engineering engine
│   │   ├── CanonicalConsole.tsx# Canonical glossary & 3-Way Merge wizard
│   │   ├── DataContractGitOpsStudio.tsx # ODCS Data Contracts & GitOps CI/CD
│   │   ├── ImportEnrichmentStudio.tsx   # Schema grid ingestion & AI semantic enrichment
│   │   ├── MtlsHsmSecurityStudio.tsx    # mTLS + ABAC + HSM Zero-Trust security triad
│   │   ├── CatalogView.tsx     # Integration catalog & asset reuse
│   │   ├── BenchmarkView.tsx   # Scoring benchmarks & correction metrics
│   │   ├── SystemConfigView.tsx# Observability, config & circuit breaker
│   │   ├── HelpModal.tsx       # In-app interactive documentation console (14 sections)
│   │   └── ...
│   ├── types.ts               # Core TypeScript interfaces & schemas
│   ├── main.tsx               # Client entry point
│   ├── index.css              # Tailwind CSS styles
│   └── ...
├── server.ts                  # Express backend & Gemini API proxy
├── help.md                    # Serbian documentation & spec reference
├── help.en.md                 # English documentation & spec reference
├── package.json               # Dependencies & build scripts
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite build configuration
```

---

## 🛡️ Governance & Design Principles

1. **Deterministic-First**: Mapping scores, heuristics, and data transformations are fully transparent, repeatable, and inspectable.
2. **Bounded AI**: Generative AI operates strictly as an advisory accelerator with explicit analyst approval gates.
3. **Zero Unintended Mutations (HITL Air-Gap)**: No production database mutations occur without human verification and cryptographic sign-off on isolated exceptions.
4. **Enterprise Privacy**: Sensitive fields (PII, tokens) are automatically flagged and masked before AI inspection.
5. **Governed Lifecycle**: Canonical schema changes require explicit branch merges and audit logging.

---

## 📄 License
Enterprise & Pilot Workbench — All Rights Reserved.
