# Semantra React Workbench User Guide (Help Guide)

This document provides a comprehensive operational guide for the **Semantra Enterprise Semantic Integration Workbench** web application built using **React 18 / TypeScript** and a Node.js Express backend.

---

## 🧭 Navigation & Core Modules

Semantra provides six primary working surfaces accessible from the top navigation bar:

1. **Workspace (Mapping & Profiling)**: Central workbench for ingesting source and target schemas, calculating deterministic multi-signal confidence scores, authoring transformation specs, and generating multi-target code (Python/Pandas, PySpark, dbt SQL, TypeScript).
2. **Reverse Engineering (WF-13)**: A dedicated 7-step pipeline designed to deconstruct unknown JSON/XML payloads, discover implicit Foreign Keys and entity cardinalities, generate test assertions, and synthesize production-ready integration contracts.
3. **Canonical Console (Vocabulary & Stewardship)**: Central repository for enterprise canonical concepts, domain glossaries, Git-like sandbox branching (`main`, `draft`), a visual **3-Way Merge Conflict Resolution Wizard**, and an immutable Stewardship Audit Trail.
4. **Catalog (Integration Repository & Reuse)**: Discover, search, and reuse previously validated integration schemas and canonical models with automatic fit and reuse confidence calculations.
5. **Benchmarks (Quality Calibration & Evaluation)**: Test mapping algorithms against standardized benchmark datasets, compare scoring profiles (Strict, Balanced, Semantic-Heavy), and evaluate the impact of analyst corrections.
6. **System & Observability**: Monitor live system health, inspect server-side Gemini AI telemetry, toggle Circuit Breakers, and review automated PII redaction security rules.

---

## 🛠️ Detailed Workflow Guide

### 1. Workspace: Data Mapping & Transformation Flow

1. **Schema Ingestion & Selection**:
   - Ingest data via file upload (CSV, JSON, XML, Excel, DDL) or select from built-in enterprise industry fixtures (SAP IDoc, Workday, Salesforce, Stripe, EDI).
   - Automated profiling evaluates data types, field null ratios, sample values, and unique constraints.
2. **Deterministic Multi-Signal Scoring**:
   - The engine computes a composite match confidence score based on:
     - *Syntactic Distance* (Levenshtein, Jaro-Winkler)
     - *Token Jaccard & N-Gram overlap*
     - *Semantic Embedding Proximity*
     - *Data Type Compatibility Matrix*
     - *Structural Hierarchy & Synonym Dictionaries*
3. **Review & Triage**:
   - Field mappings are categorized into three operational tiers:
     - `High Confidence (≥ 0.80)`: Safe, direct mappings ready for verification.
     - `Needs Review (0.50 - 0.79)`: Requires analyst review with full multi-signal explanation breakdowns.
     - `Unmapped Gap (< 0.50)`: Unmatched source/target fields requiring manual association or custom transformation logic.
4. **Transformation Authoring & Starter Code**:
   - Configure transformation design operations: Direct Map, String Concatenation, Currency/Unit Conversion, Date Normalization, and Conditional Logic.
   - 1-Click code generation for:
     - **Python (Pandas DataFrame)**
     - **PySpark (Apache Spark DataFrame API)**
     - **dbt SQL (Transformation Models)**
     - **TypeScript / JavaScript Middleware**
5. **Assertions & Quality Validation**:
   - Define data quality invariants (`NOT_NULL`, `UNIQUE`, `REGEX_MATCH`, `NUMERIC_RANGE`).
   - Execute interactive assertion evaluations directly within the browser workspace.

---

## 🔄 2. Contract Reverse Engineering (WF-13)

A structured 7-step engine that transforms unstructured raw payloads into formal integration contracts:

- **Step 1 (Ingest & Health Audit)**: Structural validation, field completeness profiling, and anomaly detection.
- **Step 2 (Payload Deconstruction)**: Flattening nested hierarchies, discovering leaf field types, and fuzzy canonical matching.
- **Step 3 (Smart Graph & FK Relations)**: Auto-detection of cross-entity Foreign Keys and relationship cardinalities (`1:1`, `1:N`, `N:1`).
- **Step 4 (Assertions Synchronization)**: Converting detected constraints into executable assertions and syncing with the test suite.
- **Step 5 (Canonical Model Synthesis)**: Synthesizing clean, standard JSON Schema definitions with enriched business semantics.
- **Step 6 (Refined Contract & Export)**: Exporting SQL DDL, Python/TS transformation middleware, and OpenAPI-compatible specs.
- **Step 7 (Visual Architecture & BA Report)**: Generating visual interactive entity dependency graphs and exporting executive Business Analyst Architecture reports.

---

## 🏛️ 3. Canonical Governance & 3-Way Merge

- **Sandbox Branching**: Create isolated `draft` branches to propose modifications or additions to enterprise canonical models without affecting the production `main` glossary.
- **3-Way Merge Resolution Wizard**: When merging branches, any conflicting definitions trigger an interactive visual wizard:
  - *Keep Main*: Retain the production baseline definition.
  - *Use Draft*: Accept changes proposed in the draft branch.
  - *Custom Override*: Enter a refined custom definition.
- **Cryptographic Audit Log**: Every approved merge receives a SHA-256 transaction hash and is permanently recorded in the immutable Stewardship Audit Trail.

---

## 🔒 4. Security, Privacy & Bounded AI Principles

- **Bounded AI Architecture**: Generative AI (Google Gemini 2.5) functions strictly in an advisory capacity (explanations, optimization tips, summary briefings). All core mapping scoring and transformation logic remain 100% deterministic and under analyst control.
- **Client-Side PII Redaction**: Sensitive personal identification data (names, social security numbers, credit card numbers, auth tokens) are automatically detected and masked before any diagnostic payload is sent to AI endpoints.
- **Circuit Breaker Protection**: In the event of API latency spikes or quota limits, the workbench automatically isolates external AI calls, falling back gracefully to pure local heuristic operations.

---

## 💡 Productivity Tips

- Press the **Help (?)** button in the top navigation bar at any time to open the interactive documentation modal with scoring formulas, signal weights, and deep architectural specs.
- All generated code snippets, reports, and transformation specifications can be copied to the clipboard with one click or exported as standalone files (`.json`, `.py`, `.sql`, `.ts`, `.md`).
- Session states and draft mappings are persisted locally in browser memory for seamless work resumption.
