import { 
  MappingRow, 
  DecisionProposal, 
  CatalogEntry, 
  BenchmarkDataset, 
  StewardshipItem, 
  CanonicalConcept,
  KnowledgeConcept,
  CorrectionRule
} from '../types';
import realCanonicalConcepts from './realCanonicalConcepts.json';
import realKnowledgeConcepts from './realKnowledgeConcepts.json';

export const SAP_CUSTOMER_SALES_AREA_MAPPINGS: MappingRow[] = [
  {
    id: 'c1',
    sourceField: 'KUNNR',
    sourceDesc: 'SAP customer number used to identify the sold-to party',
    sourceType: 'VARCHAR(20)',
    targetField: 'customer_id',
    targetDesc: 'Canonical customer identifier',
    targetType: 'VARCHAR(20)',
    confidence: 'high',
    score: 0.94,
    signals: ['name', 'semantic', 'canonical'],
    explanation: 'Highly matched on semantic description "customer number" and canonical concept link for customer master entities.',
    llmNotes: 'Matches standard sold-to party canonical patterns.',
    transformationCode: 'def transform(row):\n    return str(row["KUNNR"]).strip().zfill(10)'
  },
  {
    id: 'c2',
    sourceField: 'NAME1',
    sourceDesc: 'Customer name in the general master',
    sourceType: 'VARCHAR(120)',
    targetField: 'customer_name',
    targetDesc: 'Normalized customer display name',
    targetType: 'VARCHAR(120)',
    confidence: 'high',
    score: 0.89,
    signals: ['name', 'semantic'],
    explanation: 'Name overlap with target "customer_name" and semantic description alignment on "Customer name".',
    transformationCode: 'def transform(row):\n    return str(row["NAME1"]).upper()'
  },
  {
    id: 'c3',
    sourceField: 'VKORG',
    sourceDesc: 'Sales organization responsible for the customer sales area',
    sourceType: 'VARCHAR(10)',
    targetField: 'sales_organization_id',
    targetDesc: 'Normalized sales organization identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.78,
    signals: ['semantic', 'knowledge'],
    explanation: 'Matched on standard SAP technical concept (VKORG -> Sales Org) from Semantra ERP Knowledge Base.',
    llmNotes: 'Auto-accepted under threshold (>=0.75) with medium confidence.',
    transformationCode: 'def transform(row):\n    return str(row["VKORG"]).strip()'
  },
  {
    id: 'c4',
    sourceField: 'VTWEG',
    sourceDesc: 'Distribution channel used for sales processing',
    sourceType: 'VARCHAR(10)',
    targetField: 'distribution_channel_id',
    targetDesc: 'Normalized distribution channel identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.76,
    signals: ['semantic', 'knowledge'],
    explanation: 'Matched via SAP metadata dictionary overlay for distribution channel VTWEG.',
    transformationCode: 'def transform(row):\n    return str(row["VTWEG"]).strip()'
  },
  {
    id: 'c5',
    sourceField: 'SPART',
    sourceDesc: 'Division code for the customer sales area',
    sourceType: 'VARCHAR(10)',
    targetField: 'division_id',
    targetDesc: 'Normalized division identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.72,
    signals: ['semantic', 'knowledge'],
    explanation: 'Linked using SAP concept SPART (Division code).',
    transformationCode: 'def transform(row):\n    return str(row["SPART"]).strip()'
  },
  {
    id: 'c6',
    sourceField: 'KDGRP',
    sourceDesc: 'Customer group code used for segmentation',
    sourceType: 'VARCHAR(10)',
    targetField: 'customer_group_id',
    targetDesc: 'Normalized customer group identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.81,
    signals: ['name', 'semantic'],
    explanation: 'Aligned with customer_group_id based on abbreviation KDGRP matching customer segmentation rule.',
    transformationCode: 'def transform(row):\n    return str(row["KDGRP"]).zfill(2)'
  },
  {
    id: 'c7',
    sourceField: 'BZIRK',
    sourceDesc: 'Sales district code',
    sourceType: 'VARCHAR(10)',
    targetField: 'sales_district_id',
    targetDesc: 'Normalized sales district identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.79,
    signals: ['semantic', 'knowledge'],
    explanation: 'Technical metadata lookup matches BZIRK to Sales District.',
    transformationCode: 'def transform(row):\n    return str(row["BZIRK"]).strip()'
  },
  {
    id: 'c8',
    sourceField: 'VSBED',
    sourceDesc: 'Shipping conditions code',
    sourceType: 'VARCHAR(10)',
    targetField: 'shipping_condition_code',
    targetDesc: 'Shipping condition code',
    targetType: 'VARCHAR(10)',
    confidence: 'high',
    score: 0.91,
    signals: ['name', 'semantic'],
    explanation: 'Almost perfect string match on description and close alias matching.',
    transformationCode: 'def transform(row):\n    return str(row["VSBED"]).strip()'
  },
  {
    id: 'c9',
    sourceField: 'INCO1',
    sourceDesc: 'Incoterms code',
    sourceType: 'VARCHAR(10)',
    targetField: 'incoterm_code',
    targetDesc: 'Incoterms code',
    targetType: 'VARCHAR(10)',
    confidence: 'high',
    score: 0.95,
    signals: ['name', 'semantic', 'correction'],
    explanation: 'Correction rule maps INCO1 directly to incoterm_code.',
    transformationCode: 'def transform(row):\n    return str(row["INCO1"]).upper()'
  },
  {
    id: 'c10',
    sourceField: 'INCO2',
    sourceDesc: 'Incoterms location',
    sourceType: 'VARCHAR(80)',
    targetField: 'incoterm_location',
    targetDesc: 'Incoterms location',
    targetType: 'VARCHAR(80)',
    confidence: 'high',
    score: 0.93,
    signals: ['name', 'semantic'],
    explanation: 'Direct text matching on Incoterms location.',
    transformationCode: 'def transform(row):\n    return str(row["INCO2"]).strip()'
  },
  {
    id: 'c11',
    sourceField: 'WAERS',
    sourceDesc: 'Document currency code',
    sourceType: 'VARCHAR(5)',
    targetField: 'document_currency_code',
    targetDesc: 'Document currency code',
    targetType: 'VARCHAR(5)',
    confidence: 'high',
    score: 0.88,
    signals: ['name', 'semantic', 'knowledge'],
    explanation: 'Technical field WAERS maps globally to document_currency_code in Semantra ERP Glossary.',
    transformationCode: 'def transform(row):\n    return str(row["WAERS"]).upper()'
  },
  {
    id: 'c12',
    sourceField: 'ZTERM',
    sourceDesc: 'Payment terms key',
    sourceType: 'VARCHAR(10)',
    targetField: 'payment_terms_id',
    targetDesc: 'Payment terms identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'high',
    score: 0.86,
    signals: ['semantic', 'knowledge'],
    explanation: 'ZTERM payment key recognized under Payment Terms.',
    transformationCode: 'def transform(row):\n    return str(row["ZTERM"]).strip()'
  },
  {
    id: 'c13',
    sourceField: 'KALKS',
    sourceDesc: 'Customer pricing procedure code',
    sourceType: 'VARCHAR(10)',
    targetField: 'customer_pricing_procedure_code',
    targetDesc: 'Customer pricing procedure code',
    targetType: 'VARCHAR(10)',
    confidence: 'high',
    score: 0.98,
    signals: ['name', 'semantic'],
    explanation: 'Perfect name matching for customer pricing procedure code.',
    transformationCode: 'def transform(row):\n    return str(row["KALKS"]).strip()'
  },
  {
    id: 'c14',
    sourceField: 'PLTYP',
    sourceDesc: 'Price list type',
    sourceType: 'VARCHAR(10)',
    targetField: 'price_list_type_id',
    targetDesc: 'Price list type identifier',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.74,
    signals: ['semantic'],
    explanation: 'Sub-threshold match on price list mapping. Requires manual verification.',
    transformationCode: 'def transform(row):\n    return str(row["PLTYP"]).strip()'
  }
];

export const SAP_MATERIAL_MASTER_MAPPINGS: MappingRow[] = [
  {
    id: 'm1',
    sourceField: 'MATNR',
    sourceDesc: 'SAP material number (unique item identifier)',
    sourceType: 'VARCHAR(18)',
    targetField: 'material_id',
    targetDesc: 'Canonical material number',
    targetType: 'VARCHAR(20)',
    confidence: 'high',
    score: 0.95,
    signals: ['name', 'semantic', 'canonical'],
    explanation: 'Technical standard MATNR maps to material_id.',
    transformationCode: 'def transform(row):\n    return str(row["MATNR"]).strip().lstrip("0")'
  },
  {
    id: 'm2',
    sourceField: 'MAKTX',
    sourceDesc: 'Material description / short text',
    sourceType: 'VARCHAR(40)',
    targetField: 'material_description',
    targetDesc: 'Normalized description text',
    targetType: 'VARCHAR(255)',
    confidence: 'high',
    score: 0.92,
    signals: ['name', 'semantic'],
    explanation: 'MAKTX maps to description standard.',
    transformationCode: 'def transform(row):\n    return str(row["MAKTX"]).strip()'
  },
  {
    id: 'm3',
    sourceField: 'MEINS',
    sourceDesc: 'Base unit of measure',
    sourceType: 'VARCHAR(3)',
    targetField: 'base_uom_code',
    targetDesc: 'Standard ISO UOM',
    targetType: 'VARCHAR(3)',
    confidence: 'high',
    score: 0.89,
    signals: ['semantic', 'knowledge'],
    explanation: 'MEINS standard maps to base unit of measure.',
    transformationCode: 'def transform(row):\n    return str(row["MEINS"]).upper()'
  },
  {
    id: 'm4',
    sourceField: 'MATKL',
    sourceDesc: 'Material group / category code',
    sourceType: 'VARCHAR(9)',
    targetField: 'material_group_id',
    targetDesc: 'Normalized catalog group ID',
    targetType: 'VARCHAR(10)',
    confidence: 'medium',
    score: 0.79,
    signals: ['name', 'semantic'],
    explanation: 'Material group (MATKL) correlates to product categories.',
    transformationCode: 'def transform(row):\n    return str(row["MATKL"]).strip()'
  }
];

export const SAP_SUPPLIER_MASTER_MAPPINGS: MappingRow[] = [
  {
    id: 's1',
    sourceField: 'LIFNR',
    sourceDesc: 'Vendor / supplier account number',
    sourceType: 'VARCHAR(10)',
    targetField: 'supplier_id',
    targetDesc: 'Canonical supplier unique key',
    targetType: 'VARCHAR(20)',
    confidence: 'high',
    score: 0.94,
    signals: ['name', 'semantic', 'knowledge'],
    explanation: 'LIFNR is globally known as vendor ID in standard SAP ERP overlays.',
    transformationCode: 'def transform(row):\n    return str(row["LIFNR"]).strip().zfill(10)'
  },
  {
    id: 's2',
    sourceField: 'NAME1',
    sourceDesc: 'Name 1 of supplier general master',
    sourceType: 'VARCHAR(35)',
    targetField: 'supplier_name',
    targetDesc: 'Supplier business trading name',
    targetType: 'VARCHAR(100)',
    confidence: 'high',
    score: 0.91,
    signals: ['name', 'semantic'],
    explanation: 'Direct lookup of name match on general master.',
    transformationCode: 'def transform(row):\n    return str(row["NAME1"]).strip()'
  },
  {
    id: 's3',
    sourceField: 'LAND1',
    sourceDesc: 'Country key of supplier',
    sourceType: 'VARCHAR(3)',
    targetField: 'country_iso_code',
    targetDesc: 'ISO standard country code',
    targetType: 'VARCHAR(3)',
    confidence: 'medium',
    score: 0.83,
    signals: ['semantic', 'knowledge'],
    explanation: 'LAND1 corresponds to country key metadata mapping.',
    transformationCode: 'def transform(row):\n    return str(row["LAND1"]).upper()'
  }
];

export const GENERIC_ACCOUNT_MASTER_MAPPINGS: MappingRow[] = [
  {
    id: 'g1',
    sourceField: 'col_1',
    sourceDesc: 'Unique numeric customer account ID in the source system.',
    sourceType: 'INTEGER',
    targetField: 'col_1',
    targetDesc: 'Target account identifier with prefix semantics.',
    targetType: 'VARCHAR(20)',
    confidence: 'high',
    score: 0.96,
    signals: ['semantic', 'canonical', 'companion'],
    explanation: '🤖 [AI Spec Analysis]: Companion metadata resolved generic col_1 as Customer Account ID in source mapping to Target Account Identifier in target domain.',
    llmNotes: 'Companion spec enriched account ID semantics. Prefix rule applied ("C-" + id).',
    transformationCode: 'def transform(row):\n    return "C-" + str(row["col_1"]).strip()',
    transformation: 'Prefix "C-" addition to Account ID',
    conceptName: 'Customer_Identifier'
  },
  {
    id: 'g2',
    sourceField: 'col_2',
    sourceDesc: 'Customer or company name as stored in the source.',
    sourceType: 'VARCHAR(100)',
    targetField: 'col_2',
    targetDesc: 'Official customer or company name.',
    targetType: 'VARCHAR(100)',
    confidence: 'high',
    score: 0.94,
    signals: ['semantic', 'name', 'companion'],
    explanation: '🤖 [AI Spec Analysis]: Direct semantic equivalence between source customer name and official target company name.',
    llmNotes: 'Whitespace trimmed and string standardized.',
    transformationCode: 'def transform(row):\n    return str(row["col_2"]).strip()',
    transformation: 'String Clean & Trim',
    conceptName: 'Customer_Name'
  },
  {
    id: 'g3',
    sourceField: 'col_3',
    sourceDesc: 'Two-letter country code for the customer billing or operating region.',
    sourceType: 'VARCHAR(2)',
    targetField: 'col_3',
    targetDesc: 'Customer country code used for reporting and market segmentation.',
    targetType: 'VARCHAR(2)',
    confidence: 'high',
    score: 0.95,
    signals: ['semantic', 'knowledge', 'companion'],
    explanation: '🤖 [AI Spec Analysis]: Identified ISO 3166-1 alpha-2 country code alignment between billing region and target market segmentation.',
    llmNotes: 'Converted to uppercase ISO format.',
    transformationCode: 'def transform(row):\n    return str(row["col_3"]).strip().upper()',
    transformation: 'Uppercase ISO Country Code',
    conceptName: 'Country_Code'
  },
  {
    id: 'g4',
    sourceField: 'col_5',
    sourceDesc: 'Annual revenue, committed spend, or total account value in local currency.',
    sourceType: 'DECIMAL(15,2)',
    targetField: 'col_4',
    targetDesc: 'Account tier or customer service level.',
    targetType: 'VARCHAR(20)',
    confidence: 'high',
    score: 0.91,
    signals: ['semantic', 'rule', 'companion'],
    explanation: '🤖 [AI Spec Analysis]: Inferred business tiering logic mapping source annual revenue / account spend into target customer service level tiers (Enterprise, Premium, Midmarket, Standard).',
    llmNotes: 'Resolved cross-column domain shift (col_5 -> col_4) via AI Spec Analysis companion prompt.',
    transformationCode: 'def transform(row):\n    val = float(row["col_5"] or 0)\n    if val >= 200000: return "Enterprise"\n    if val >= 100000: return "Premium"\n    if val >= 75000: return "Midmarket"\n    return "Standard"',
    transformation: '3-Category Revenue Tiering Rule',
    conceptName: 'Customer_Service_Level_Tier'
  },
  {
    id: 'g5',
    sourceField: 'col_4',
    sourceDesc: 'Account start or activation date.',
    sourceType: 'DATE',
    targetField: 'col_5',
    targetDesc: 'Contract or go-live date of the target customer record.',
    targetType: 'DATE',
    confidence: 'high',
    score: 0.92,
    signals: ['semantic', 'canonical', 'companion'],
    explanation: '🤖 [AI Spec Analysis]: AI Companion matched source activation/start date (col_4) to target contract/go-live date (col_5).',
    llmNotes: 'Resolved cross-column swap (col_4 -> col_5) using companion metadata context.',
    transformationCode: 'def transform(row):\n    return str(row["col_4"]).strip()',
    transformation: 'Standardize ISO Date Cast',
    conceptName: 'Activation_Date'
  }
];

export const DECISION_PROPOSALS: DecisionProposal[] = [
  {
    id: 'p_1',
    sourceField: 'VKORG',
    suggestedTargetField: 'sales_organization_id',
    confidence: 'high',
    reason: 'Centralized SAP knowledge maps technical field VKORG directly to sales_organization_id with active metadata validation.',
    isSafe: true,
    status: 'pending'
  },
  {
    id: 'p_2',
    sourceField: 'VTWEG',
    suggestedTargetField: 'distribution_channel_id',
    confidence: 'high',
    reason: 'Semantic analysis confirms VTWEG aligns with distribution_channel_id based on historical catalog reuse fit.',
    isSafe: true,
    status: 'pending'
  },
  {
    id: 'p_3',
    sourceField: 'PLTYP',
    suggestedTargetField: 'price_list_type_id',
    confidence: 'medium',
    reason: 'Sub-threshold mapping proposal. Applying this maps price list identifiers directly but carries moderate type drift warnings.',
    isSafe: false,
    status: 'pending'
  }
];

export const CATALOG_ENTRIES: CatalogEntry[] = [
  {
    id: 'cat_1',
    name: 'Showcase Customer Sales Area Mapping',
    description: 'Gold-standard blueprint for customer sales area master data integration, matching SAP SD schemas to regional data lakes.',
    owner: 'Master Data Steward',
    status: 'approved',
    fieldsMapped: 14,
    sourceSystem: 'SAP ECC / S4HANA',
    targetSystem: 'Azure SQL / Databricks CDM',
    reuseFitScore: 96,
    reuseExplanation: '96% schema match with 0 field name conflicts. Overlap on VKORG, VTWEG, and SPART is a perfect fit.',
    mappings: [
      { source: 'KUNNR', target: 'customer_id' },
      { source: 'NAME1', target: 'customer_name' },
      { source: 'VKORG', target: 'sales_organization_id' },
      { source: 'VTWEG', target: 'distribution_channel_id' }
    ],
    tags: ['Customer', 'Sales', 'SAP', 'SD', 'Approved']
  },
  {
    id: 'cat_2',
    name: 'QAD & CMS Production Master Sync',
    description: 'Canonical mapping of division QAD manufacturing and CMS item master records, aligned for global supply chain telemetry.',
    owner: 'Operations Architect',
    status: 'approved',
    fieldsMapped: 18,
    sourceSystem: 'QAD / CMS ERP',
    targetSystem: 'Azure SQL Server (DWH)',
    reuseFitScore: 42,
    reuseExplanation: 'Only 18% schema overlap found. Current source file has customer dimensions while this catalog asset focuses on materials.',
    mappings: [
      { source: 'MATNR', target: 'material_id' },
      { source: 'MAKTX', target: 'material_description' }
    ],
    tags: ['Material', 'Operations', 'QAD', 'Supply Chain', 'ERP']
  },
  {
    id: 'cat_3',
    name: 'Workday HR Employee Ingest',
    description: 'Workday employee master profiles to secure central directory services, including localized addresses and organizational keys.',
    owner: 'HR Systems Lead',
    status: 'approved',
    fieldsMapped: 32,
    sourceSystem: 'Workday Core HR',
    targetSystem: 'Azure SQL (Active Directory Sync)',
    reuseFitScore: 5,
    reuseExplanation: 'Highly incompatible: HR profile dimensions have no structural correlation to Sales Area datasets.',
    mappings: [
      { source: 'WID', target: 'employee_id' },
      { source: 'Legal_Name', target: 'full_name' }
    ],
    tags: ['HR', 'Employee', 'Workday', 'Active Directory']
  },
  {
    id: 'cat_4',
    name: 'OneStream Financial Consolidation Ledger',
    description: 'Extracts ledger summaries from ERP divisions and stages them in Azure DWH / Microsoft Fabric for OneStream consolidation.',
    owner: 'Finance Director',
    status: 'approved',
    fieldsMapped: 24,
    sourceSystem: 'SAP ECC & Trans4M',
    targetSystem: 'OneStream Finance Cube',
    reuseFitScore: 88,
    reuseExplanation: 'High correlation with regional G/L ledgers. Ideal for multi-division consolidation and PowerBI financial reporting.',
    mappings: [
      { source: 'BUKRS', target: 'company_code' },
      { source: 'BELNR', target: 'document_number' },
      { source: 'GJAHR', target: 'fiscal_year' }
    ],
    tags: ['Finance', 'Ledger', 'SAP', 'OneStream', 'Reporting']
  },
  {
    id: 'cat_5',
    name: 'Salesforce CRM Account Pipeline Sync',
    description: 'B2B CRM opportunity tracking and key customer account profiles mapped to Snowflake analytical warehouses.',
    owner: 'CRM Ops Specialist',
    status: 'approved',
    fieldsMapped: 20,
    sourceSystem: 'Salesforce CRM',
    targetSystem: 'Snowflake CDM',
    reuseFitScore: 72,
    reuseExplanation: 'Good structural overlap with customer contact databases and company hierarchy profiles.',
    mappings: [
      { source: 'AccountId', target: 'customer_id' },
      { source: 'Account_Name', target: 'customer_name' }
    ],
    tags: ['Customer', 'CRM', 'Salesforce', 'Sales']
  },
  {
    id: 'cat_6',
    name: 'Oracle Netsuite Inventory Ledger',
    description: 'Quarterly supply inventory master and balance sheet items synchronized with ERP database standards.',
    owner: 'Financial Auditor',
    status: 'approved',
    fieldsMapped: 15,
    sourceSystem: 'Oracle Netsuite ERP',
    targetSystem: 'PostgreSQL Server',
    reuseFitScore: 35,
    reuseExplanation: 'Low relevance. Financial balance sheets have negligible overlap with general sales operations.',
    mappings: [
      { source: 'INV_ITEM_ID', target: 'item_id' },
      { source: 'QTY_ON_HAND', target: 'quantity' }
    ],
    tags: ['Finance', 'Inventory', 'Netsuite', 'ERP']
  }
];

export const BENCHMARK_DATASETS: BenchmarkDataset[] = [
  {
    id: 'bench_1',
    name: 'SAP SD Sales Area Pilot Regression Set',
    description: 'Comprehensive subset of 24 realistic SAP sales area master datasets used to verify mapping precision.',
    rowCount: 240,
    baselineScore: 78.4,
    currentScore: 94.2,
    lastRunDate: '2026-07-12'
  },
  {
    id: 'bench_2',
    name: 'Material Master Showcase Benchmark',
    description: 'Manufacturing inventory records with heavy naming deviations to test semantic embedding extraction quality.',
    rowCount: 180,
    baselineScore: 81.2,
    currentScore: 84.5,
    lastRunDate: '2026-07-10'
  },
  {
    id: 'bench_3',
    name: 'Vendor Purchasing Records Gold Set',
    description: 'Purchasing Info Records (PIR) validation set, evaluating high-precision technical mapping signals.',
    rowCount: 95,
    baselineScore: 68.9,
    currentScore: 89.1,
    lastRunDate: '2026-07-11'
  }
];

export const STEWARDSHIP_ITEMS: StewardshipItem[] = [
  {
    id: 'stew_1',
    conceptName: 'sales_organization_id',
    proposedAlias: 'VKORG_ECC',
    sourceContext: 'SAP Sales general table (KNVV) mapped in active session',
    status: 'ready_for_approval',
    dateAdded: '2026-07-13',
    reviewNote: 'Analyst requested mapping promotion: VKORG_ECC represents standard ECC sales org'
  },
  {
    id: 'stew_2',
    conceptName: 'incoterm_code',
    proposedAlias: 'INCO_TERMS_KEY',
    sourceContext: 'Sales order item header spec',
    status: 'ready_for_approval',
    dateAdded: '2026-07-12',
    reviewNote: 'Matches standard Incoterms 3-character abbreviations.'
  },
  {
    id: 'stew_3',
    conceptName: 'customer_name',
    proposedAlias: 'CUST_NM_VAL',
    sourceContext: 'Legacy QuickBooks custom customer import mapping',
    status: 'approved',
    dateAdded: '2026-07-08',
    reviewNote: 'Approved by Lead Steward. Promoted into canonical glossary.'
  }
];

export const CANONICAL_CONCEPTS: CanonicalConcept[] = realCanonicalConcepts as CanonicalConcept[];
export const KNOWLEDGE_CONCEPTS: KnowledgeConcept[] = realKnowledgeConcepts as KnowledgeConcept[];

export const CORRECTION_RULES: CorrectionRule[] = [
  {
    id: 'rule_1',
    sourcePattern: 'INCO1 -> incoterm_code',
    targetPattern: 'Convert directly to UPPERCASE and check against ISO Incoterms definitions.',
    isApproved: true,
    accuracyImpact: '+12.4%',
    matchCount: 84
  },
  {
    id: 'rule_2',
    sourcePattern: 'KUNNR -> customer_id',
    targetPattern: 'Zero-pad KUNNR code to 10 characters to align with SAP sold-to targets.',
    isApproved: true,
    accuracyImpact: '+4.2%',
    matchCount: 112
  },
  {
    id: 'rule_3',
    sourcePattern: 'NAME1 -> supplier_name',
    targetPattern: 'Filter out placeholder values like N/A, NULL, or [PENDING] during ingestion.',
    isApproved: false,
    accuracyImpact: '+1.5% (Advisory)',
    matchCount: 14
  }
];

