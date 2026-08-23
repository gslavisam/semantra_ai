import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Code, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  GitCommit, 
  FileCode, 
  HelpCircle,
  Share2,
  Printer,
  RefreshCw,
  GitBranch,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Info,
  FileDown
} from 'lucide-react';
import { MappingRow, AIModelConfig } from '../types';
import { generateFieldReasoning } from '../lib/reasoning';

interface WorkspaceBAReportProps {
  mappings: MappingRow[];
  selectedPreset: string;
  aiConfig?: AIModelConfig;
}

export const WorkspaceBAReport: React.FC<WorkspaceBAReportProps> = ({ 
  mappings, 
  selectedPreset,
  aiConfig 
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // SVG Mini Progress Ring / Gauge for Confidence Score
  const ConfidenceRing = ({ score }: { score: number }) => {
    const percentage = Math.round(score * 100);
    const radius = 12;
    const stroke = 2.5;
    const normalizedRadius = radius - stroke * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981'; // emerald-500
    let textColor = 'text-emerald-700';
    if (score < 0.50) {
      strokeColor = '#f43f5e'; // rose-500
      textColor = 'text-rose-700';
    } else if (score < 0.85) {
      strokeColor = '#f59e0b'; // amber-500
      textColor = 'text-amber-700';
    }

    return (
      <div className="relative inline-flex items-center justify-center shrink-0" title={`Confidence score: ${percentage}%`}>
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="#e2e8f0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className={`absolute text-[8px] font-mono font-bold ${textColor}`}>
          {percentage}
        </span>
      </div>
    );
  };
  const [codeLanguage, setCodeLanguage] = useState<'dbt' | 'pandas' | 'pyspark'>('dbt');
  const [showMermaidCode, setShowMermaidCode] = useState(false);
  const [expandedHighlights, setExpandedHighlights] = useState<Record<string, boolean>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showDriftOnly, setShowDriftOnly] = useState(false);

  // Compute live stats from active workspace mappings
  const displayMappings = showDriftOnly 
    ? mappings.filter(m => m.score < 0.85 || m.decisionStatus === 'needs_review')
    : mappings;

  // Compute live stats from active workspace mappings
  const totalFields = mappings.length;
  const acceptedMappings = mappings.filter(m => m.confidence === 'high' || m.score >= 0.85);
  const reviewMappings = mappings.filter(m => m.confidence === 'medium' || (m.score >= 0.5 && m.score < 0.85));
  const rejectedMappings = mappings.filter(m => m.confidence === 'low' || m.score < 0.5);

  const acceptedCount = acceptedMappings.length;
  const reviewCount = reviewMappings.length;
  const rejectedCount = rejectedMappings.length;
  
  const coveragePercent = totalFields > 0 ? Math.round((acceptedCount / totalFields) * 100) : 0;

  // Preset source/target display metadata
  const getPresetInfo = () => {
    switch (selectedPreset) {
      case 'material_master':
        return {
          source: 'showcase_material_source.csv',
          target: 'showcase_material_target',
          object: 'Material Master Data (MARA/MAKT)',
          targetProfile: 'showcase_material_target.csv'
        };
      case 'supplier_master':
        return {
          source: 'sap_lfa1_lfb1_export.json',
          target: 'canonical_supplier_master',
          object: 'Supplier Master Data (LFA1/LFB1)',
          targetProfile: 'canonical_supplier_master.csv'
        };
      case 'generic_account_master':
        return {
          source: 'legacy_account_master.csv (col_1..col_5)',
          target: 'canonical_account_profile',
          object: 'Legacy Account Master Data (AI Companion Spec Analysis)',
          targetProfile: 'canonical_account_profile.csv'
        };
      case 'custom_upload':
        return {
          source: 'custom_uploaded_source_schema',
          target: 'custom_target_schema',
          object: 'Custom Uploaded Data Model',
          targetProfile: 'custom_target_profile.csv'
        };
      default:
        return {
          source: 'sap_ecc_knvv_sales_area.csv',
          target: 'canonical_customer_sales_area',
          object: 'Customer Sales Area (KNVV)',
          targetProfile: 'canonical_customer_sales_area.csv'
        };
    }
  };

  const presetInfo = getPresetInfo();

  // Field-specific evidence generation helpers
  const getSignalScores = (m: MappingRow) => {
    const score = m.score || 0.85;
    const hasCanonical = m.signals?.includes('canonical');
    const hasName = m.signals?.includes('name');
    const hasKnowledge = m.signals?.includes('knowledge');
    const hasSemantic = m.signals?.includes('semantic');

    const canonical = (hasCanonical ? Math.min(1.0, score * 1.02) : score * 0.82).toFixed(2);
    const pattern = (hasName ? Math.min(1.0, score * 0.96) : score * 0.78).toFixed(2);
    const knowledge = (hasKnowledge ? Math.min(1.0, score * 1.0) : score * 0.85).toFixed(2);
    const semantic = (hasSemantic ? Math.min(1.0, score * 0.98) : score * 0.80).toFixed(2);

    return { canonical, pattern, knowledge, semantic };
  };

  const getFieldEvidence = (m: MappingRow) => {
    return generateFieldReasoning(m);
  };

  // Helper to deduce meaningful Canonical Concept info from source & target descriptions and rules
  const getCanonicalConceptInfo = (m: MappingRow) => {
    const sf = (m.sourceField || '').toLowerCase().trim();
    const sd = (m.sourceDesc || '').toLowerCase();
    const tf = (m.targetField || '').toLowerCase().trim();
    const td = (m.targetDesc || '').toLowerCase();
    const exp = (m.explanation || '').toLowerCase();
    const tr = (m.transformation || '').toLowerCase();

    // Helper to format field name to Clean Business Concept (Title_Case_With_Underscores)
    const formatConcept = (str: string): string => {
      if (!str) return 'Attribute';
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .split('_')
        .filter(Boolean)
        .map(w => {
          const lower = w.toLowerCase();
          if (lower === 'id') return 'Identifier';
          if (lower === 'uom') return 'UOM';
          if (lower === 'iso') return 'ISO';
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join('_');
    };

    // Dictionary of known SAP & Legacy technical field names to Canonical Concepts
    const SAP_CONCEPT_MAP: Record<string, string> = {
      matnr: 'Material_Identifier',
      maktx: 'Material_Description',
      meins: 'Unit_Of_Measure',
      matkl: 'Material_Group',
      werks: 'Plant_Location',
      lgort: 'Storage_Location',
      lifnr: 'Supplier_Identifier',
      name1: 'Supplier_Name',
      land1: 'Country_Code',
      kunnr: 'Customer_Identifier',
      kunnr_name: 'Customer_Name',
      erdat: 'Activation_Date',
      netwr: 'Annual_Revenue_Amount',
      vkorg: 'Sales_Organization',
      vtweg: 'Distribution_Channel',
      spart: 'Sales_Area_Division_Code',
      inco1: 'Incoterms_Code',
    };

    // 1. Source Canonical Concept Deduction
    let sourceConcept = '';
    if (SAP_CONCEPT_MAP[sf]) {
      sourceConcept = SAP_CONCEPT_MAP[sf];
    } else if (sf.includes('land1') || sf.includes('country') || sd.includes('country') || td.includes('country')) {
      sourceConcept = 'Country_Code';
    } else if (sf === 'name1' || sf.includes('supplier_name') || sf.includes('vendor_name')) {
      sourceConcept = 'Supplier_Name';
    } else if (sf.includes('lifnr') || sf.includes('supplier_id') || sf.includes('vendor_id')) {
      sourceConcept = 'Supplier_Identifier';
    } else if (sf.includes('matnr') || sf.includes('material_id')) {
      sourceConcept = 'Material_Identifier';
    } else if (sf.includes('maktx') || sf.includes('material_desc')) {
      sourceConcept = 'Material_Description';
    } else if (sf.includes('meins') || sf.includes('base_uom')) {
      sourceConcept = 'Unit_Of_Measure';
    } else if (sf.includes('matkl') || sf.includes('material_group')) {
      sourceConcept = 'Material_Group';
    } else if (sf.includes('kunnr_name') || (sf.includes('customer') && sf.includes('name'))) {
      sourceConcept = 'Customer_Name';
    } else if (sf.includes('kunnr') || sf.includes('customer_id') || sf.includes('cust_id')) {
      sourceConcept = 'Customer_Identifier';
    } else if (sd.includes('unique numeric customer') || sd.includes('customer account id') || sf === 'col_1') {
      sourceConcept = 'Customer_Identifier';
    } else if (sd.includes('customer or company name') || sd.includes('company name') || sf === 'col_2') {
      sourceConcept = 'Customer_Name';
    } else if (sd.includes('two-letter country code') || sd.includes('country code') || sf === 'col_3') {
      sourceConcept = 'Country_Code';
    } else if (sd.includes('account start') || sd.includes('activation date') || sd.includes('start date') || sf.includes('erdat') || sf === 'col_4') {
      sourceConcept = 'Activation_Date';
    } else if (sd.includes('annual revenue') || sd.includes('committed spend') || sd.includes('total account value') || sd.includes('turnover') || sf.includes('netwr') || sf.includes('revenue') || sf === 'col_5') {
      sourceConcept = 'Annual_Revenue_Amount';
    } else if (sd.includes('vendor') || sd.includes('supplier') || sf.includes('supplier') || sf.includes('vendor')) {
      if (sf.includes('name') || sd.includes('name')) {
        sourceConcept = 'Supplier_Name';
      } else {
        sourceConcept = 'Supplier_Identifier';
      }
    } else if (m.conceptName && !m.conceptName.startsWith('col_')) {
      sourceConcept = formatConcept(m.conceptName);
    } else if (tf) {
      sourceConcept = formatConcept(tf);
    } else {
      sourceConcept = formatConcept(sf);
    }

    // 2. Target Canonical Concept Deduction
    let targetConcept = sourceConcept;
    if (SAP_CONCEPT_MAP[tf]) {
      targetConcept = SAP_CONCEPT_MAP[tf];
    } else if (tf.includes('material_id') || tf.includes('matnr')) {
      targetConcept = 'Material_Identifier';
    } else if (tf.includes('material_description') || tf.includes('maktx')) {
      targetConcept = 'Material_Description';
    } else if (tf.includes('base_uom') || tf.includes('meins') || tf.includes('unit_of_measure')) {
      targetConcept = 'Unit_Of_Measure';
    } else if (tf.includes('material_group') || tf.includes('matkl')) {
      targetConcept = 'Material_Group';
    } else if (tf.includes('country') || tf.includes('land1') || td.includes('country')) {
      targetConcept = 'Country_Code';
    } else if (tf.includes('supplier_name') || tf.includes('vendor_name') || td.includes('supplier name') || td.includes('vendor name')) {
      targetConcept = 'Supplier_Name';
    } else if (tf.includes('supplier_id') || tf.includes('vendor_id') || td.includes('supplier id') || td.includes('vendor id') || td.includes('supplier identifier') || tf.includes('lifnr')) {
      targetConcept = 'Supplier_Identifier';
    } else if (td.includes('tier') || td.includes('service level') || tf === 'col_4' || tr.includes('tier') || tr.includes('select') || exp.includes('tier') || exp.includes('service level')) {
      targetConcept = 'Customer_Service_Level_Tier';
    } else if (td.includes('unique key') || td.includes('customer account') || tf === 'col_1' || tf.includes('customer_id')) {
      targetConcept = 'Customer_Identifier';
    } else if (td.includes('registered legal name') || td.includes('legal name') || tf === 'col_2' || (tf.includes('name') && !tf.includes('product') && !tf.includes('supplier'))) {
      targetConcept = 'Customer_Name';
    } else if (td.includes('creation/start date') || td.includes('start date') || tf === 'col_5' || tf.includes('date')) {
      targetConcept = 'Activation_Date';
    } else if (tf) {
      targetConcept = formatConcept(tf);
    }

    // 3. Transformation & Rule Deduction
    let ruleName = 'Direct Identity Mapping';
    let ruleDesc = 'Direct field transfer without modification';

    if ((sourceConcept === 'Annual_Revenue_Amount' || sf === 'col_5') && (targetConcept === 'Customer_Service_Level_Tier' || tf === 'col_4' || tr.includes('tier') || tr.includes('select'))) {
      ruleName = '3-Category Revenue Rule';
      ruleDesc = 'Tier 1 Gold (>= 1M), Tier 2 Silver (>= 250K), Tier 3 Bronze (< 250K)';
    } else if (tr.includes('strip') || tr.includes('trim')) {
      ruleName = 'Trim Whitespace';
      ruleDesc = 'String whitespace stripping & clean';
    } else if (tr.includes('upper')) {
      ruleName = 'Uppercase Format';
      ruleDesc = 'Converted text to uppercase string';
    } else if (tr.includes('lower')) {
      ruleName = 'Lowercase Format';
      ruleDesc = 'Converted text to lowercase string';
    } else if (tr.includes('fillna') || tr.includes('coalesce')) {
      ruleName = 'Null Imputation';
      ruleDesc = 'Impute missing null values with fallback';
    } else if (sourceConcept === 'Activation_Date' || targetConcept === 'Activation_Date') {
      ruleName = 'Standardize ISO Date';
      ruleDesc = 'Cast timestamp to YYYY-MM-DD ISO date format';
    } else if (sourceConcept === 'Country_Code' || targetConcept === 'Country_Code') {
      ruleName = 'ISO Country Code';
      ruleDesc = 'ISO 3166-1 alpha-2 uppercase country code';
    } else if (sourceConcept === 'Customer_Name' || targetConcept === 'Customer_Name') {
      ruleName = 'String Clean & Trim';
      ruleDesc = 'Remove leading/trailing spaces and special characters';
    } else if (tr) {
      ruleName = 'Custom Rule Applied';
      ruleDesc = tr;
    }

    const conceptDisplay = sourceConcept === targetConcept 
      ? sourceConcept 
      : `${sourceConcept} → ${targetConcept}`;

    return {
      sourceConcept,
      targetConcept,
      conceptDisplay,
      ruleName,
      ruleDesc
    };
  };

  const getTransformationExpression = (m: MappingRow, format: 'dbt' | 'pyspark') => {
    const sf = m.sourceField;
    const tf = m.targetField;
    const tr = (m.transformation || '').toLowerCase();

    if (tr.includes('np.select') || tr.includes('tier_1_gold') || tf === 'col_4' || tr.includes('tier') || tr.includes('service level')) {
      if (format === 'dbt') {
        return `CASE \n            WHEN CAST(${sf} AS NUMERIC) >= 1000000 THEN 'Tier_1_Gold'\n            WHEN CAST(${sf} AS NUMERIC) >= 250000 THEN 'Tier_2_Silver'\n            ELSE 'Tier_3_Bronze'\n        END AS ${tf}`;
      }
      if (format === 'pyspark') {
        return `F.when(F.col("${sf}").cast("double") >= 1000000, "Tier_1_Gold")\\
         .when(F.col("${sf}").cast("double") >= 250000, "Tier_2_Silver")\\
         .otherwise("Tier_3_Bronze").alias("${tf}")`;
      }
    }

    if (tr.includes('strip')) {
      if (format === 'dbt') return `TRIM(${sf}) AS ${tf}`;
      if (format === 'pyspark') return `F.trim(F.col("${sf}")).alias("${tf}")`;
    }

    if (tr.includes('upper')) {
      if (format === 'dbt') return `UPPER(${sf}) AS ${tf}`;
      if (format === 'pyspark') return `F.upper(F.col("${sf}")).alias("${tf}")`;
    }

    if (tr.includes('lower')) {
      if (format === 'dbt') return `LOWER(${sf}) AS ${tf}`;
      if (format === 'pyspark') return `F.lower(F.col("${sf}")).alias("${tf}")`;
    }

    if (tr.includes('fillna') || tr.includes('null')) {
      if (format === 'dbt') return `COALESCE(${sf}, 'N/A') AS ${tf}`;
      if (format === 'pyspark') return `F.coalesce(F.col("${sf}"), F.lit("N/A")).alias("${tf}")`;
    }

    if (tr.includes('to_numeric') || tr.includes('replace')) {
      if (format === 'dbt') return `CAST(REGEXP_REPLACE(${sf}, '[^0-9.]', '') AS NUMERIC) AS ${tf}`;
      if (format === 'pyspark') return `F.regexp_replace(F.col("${sf}"), "[^0-9.]", "").cast("double").alias("${tf}")`;
    }

    if (m.transformation) {
      if (format === 'dbt') return `${sf} AS ${tf} /* Custom: ${m.transformation} */`;
      if (format === 'pyspark') return `F.expr("${m.transformation}").alias("${tf}")`;
    }

    if (format === 'dbt') return `${sf} AS ${tf}`;
    return `F.col("${sf}").alias("${tf}")`;
  };

  // Code artifact generators
  const generateDbtCode = () => {
    return `{# Semantra Generated dbt SQL Model - ${presetInfo.object} #}

with source as (
    select * from {{ source('raw_sap', '${presetInfo.source.replace('.csv', '')}') }}
),

mapped as (
    select
${mappings.map((m, idx) => `        ${getTransformationExpression(m, 'dbt')}${idx < mappings.length - 1 ? ',' : ''}`).join('\n')}
    from source
)

select * from mapped;`;
  };

  const generatePandasCode = () => {
    return `import pandas as pd
import numpy as np

# Semantra Generated Transformation Pipeline
# Target Grain: ${presetInfo.object}

def run_transformation(source_file_path: str) -> pd.DataFrame:
    df_source = pd.read_csv(source_file_path, dtype=str)
    df_target = pd.DataFrame()

${mappings.map(m => {
  if (m.transformation) {
    return `    # Transformation [${m.mappingType || 'Custom'}]: ${m.sourceField} -> ${m.targetField}\n    df_target['${m.targetField}'] = ${m.transformation}`;
  }
  return `    df_target['${m.targetField}'] = df_source['${m.sourceField}']`;
}).join('\n')}

    return df_target`;
  };

  const generatePySparkCode = () => {
    return `from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder.appName("Semantra_${selectedPreset}").getOrCreate()

def run_pyspark_job(input_path: str):
    df_raw = spark.read.option("header", "true").csv(input_path)
    return df_raw.select(
${mappings.map((m, idx) => `        ${getTransformationExpression(m, 'pyspark')}${idx < mappings.length - 1 ? ',' : ''}`).join('\n')}
    )`;
  };

  const getCurrentCode = () => {
    if (codeLanguage === 'pandas') return generatePandasCode();
    if (codeLanguage === 'pyspark') return generatePySparkCode();
    return generateDbtCode();
  };

  // Mermaid graph definition
  const generateMermaidGraph = () => {
    return `flowchart LR
  subgraph Source Attributes
    direction TB
${mappings.map((m, idx) => `    src_${idx}["${m.sourceField}"]`).join('\n')}
  end

  subgraph Source Concepts
    direction TB
${mappings.map((m, idx) => `    src_concept_${idx}["${getCanonicalConceptInfo(m).sourceConcept}"]`).join('\n')}
  end

  subgraph Transformation Rules
    direction TB
${mappings.map((m, idx) => `    rule_${idx}["${getCanonicalConceptInfo(m).ruleName}"]`).join('\n')}
  end

  subgraph Target Concepts
    direction TB
${mappings.map((m, idx) => `    tgt_concept_${idx}["${getCanonicalConceptInfo(m).targetConcept}"]`).join('\n')}
  end

  subgraph Target Attributes
    direction TB
${mappings.map((m, idx) => `    target_${idx}["${m.targetField}"]`).join('\n')}
  end

${mappings.map((_, idx) => `  src_${idx} --> src_concept_${idx}
  src_concept_${idx} --> rule_${idx}
  rule_${idx} --> tgt_concept_${idx}
  tgt_concept_${idx} --> target_${idx}`).join('\n')}`;
  };

  const handleCopyReport = () => {
    const reportMarkdown = `# BA Mapping Report - Semantra Workbench
Date: ${new Date().toLocaleDateString()}
Target Object: ${presetInfo.target}
Coverage: ${coveragePercent}% (${acceptedCount}/${totalFields} mapped)

## Executive Summary
- Target object: ${presetInfo.target}
- Target context: Uploaded target dataset (${presetInfo.targetProfile}) | Projection: dataset-to-dataset
- Active decisions: ${totalFields}
- Coverage: mapped=${acceptedCount}, unresolved=${reviewCount}, rejected=${rejectedCount}, target_managed=0

## Key Decisions and Rationale
${mappings.map(m => {
  const sigs = getSignalScores(m);
  const status = m.decisionStatus || (m.isApproved ? 'accepted' : 'needs_review');
  const type = m.mappingType || 'Direct mapping';
  const tf = m.transformation ? ` | transform: ${m.transformation}` : '';
  return `- ${m.sourceField} -> ${m.targetField} (${status}; ${type}${tf}) [signals: canonical=${sigs.canonical}, pattern=${sigs.pattern}, knowledge=${sigs.knowledge}]`;
}).join('\n')}

## Approval and Governance Readiness
- Decision closure is complete for the current active mapping set.
- Primary approval path remains Governance > Stewardship.
`;
    navigator.clipboard.writeText(reportMarkdown);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const toggleHighlight = (id: string) => {
    setExpandedHighlights(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate clean standalone PDF document using jsPDF + html2canvas
  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('ba-report-document-content');
    if (!element) {
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - (margin * 2));

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - (margin * 2));
      }

      pdf.save(`BA_Mapping_Report_${presetInfo.target}.pdf`);
    } catch (err) {
      console.error('Direct PDF export error, opening clean print window fallback:', err);
      handleOpenCleanPrintWindow();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Clean standalone print window fallback (strips web UI menus & sidebars)
  const handleOpenCleanPrintWindow = () => {
    const reportElement = document.getElementById('ba-report-document-content');
    if (!reportElement) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>BA Mapping Report - ${presetInfo.target}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; background: #ffffff; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; font-family: monospace; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            pre, code { font-family: monospace; background: #0f172a; color: #34d399; padding: 12px; border-radius: 6px; }
            h1 { font-size: 24px; margin-bottom: 6px; }
            h2 { font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; color: #1e1b4b; }
            ul { font-size: 12px; font-family: monospace; line-height: 1.6; }
            .no-print, button, nav, aside { display: none !important; }
            @page { margin: 12mm; size: A4 portrait; }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase;">Semantra Integration Workbench • Business Analyst Report</span>
          </div>
          ${reportElement.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Top Banner Control Navigation (Excluded during PDF print) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm text-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white font-bold px-2.5 py-1 rounded">BA Mapping Report</span>
            <span className="text-slate-400">Report-first overview of the current workspace result. Synthesizes signals and outcomes across Setup, Review, Decisions, Output, and the concept model into one exportable narrative artifact.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const csvHeader = 'Source Field,Source Concept,Target Field,Target Concept,Confidence Score,Decision Status,Mapping Type,Canonical Concept Display,Transformation Rule\n';
                const csvRows = mappings.map(m => {
                  const status = m.decisionStatus || (m.isApproved ? 'Accepted' : 'Needs Review');
                  const type = m.mappingType || 'Direct mapping';
                  const info = getCanonicalConceptInfo(m);
                  const transform = m.transformation ? `"${m.transformation.replace(/"/g, '""')}"` : `"${info.ruleName}"`;
                  return `"${m.sourceField}","${info.sourceConcept}","${m.targetField}","${info.targetConcept}","${(m.score * 100).toFixed(0)}%","${status}","${type}","${info.conceptDisplay}",${transform}`;
                }).join('\n');
                const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Semantra_BA_Mapping_Spec_${presetInfo.target}.csv`;
                a.click();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Download mapping spec as CSV Data Dictionary"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Copied Brief' : 'Copy Brief'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Creates a clean, standalone PDF document without web application menus"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-200" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Create PDF Document'}</span>
            </button>
            <button
              onClick={handleOpenCleanPrintWindow}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Opens a clean document print preview window without web menus"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Clean Print</span>
            </button>
          </div>
        </div>

        {/* Real-time Workspace Sync Status & Functional Filters */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-md text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Workspace Sync (Auto-Updated)
            </span>
            <span className="text-slate-400 text-[11px]">Report dynamically updates on every workspace change</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                // Auto-apply model hints for high-confidence decisions (>85%)
                mappings.forEach(m => {
                  if (m.score >= 0.85 && !m.isApproved) {
                    m.isApproved = true;
                    m.decisionStatus = 'accepted';
                  }
                });
                alert('Applied canonical model hints: High-confidence suggestions (>85%) approved!');
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
              title="Auto-approve high confidence (>85%) suggestions based on model hints"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Apply model hints</span>
            </button>

            <button 
              onClick={() => {
                setShowDriftOnly(!showDriftOnly);
              }}
              className={`px-3 py-1 rounded border font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-[11px] ${
                showDriftOnly 
                  ? 'bg-amber-950 text-amber-300 border-amber-600' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Toggle highlighting fields with low confidence or pending review"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDriftOnly ? 'Showing Drift & Gaps' : 'Show Drift'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main BA Mapping Report Body - Targeted for PDF generation */}
      <div id="ba-report-document-content" className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-8 font-sans">

        
        {/* Title Header */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BA Mapping Report</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Report-first overview of the current workspace result. It synthesizes signals and outcomes across Setup, Review, Decisions, Output, and the concept model into one exportable narrative artifact.
          </p>
        </div>

        {/* 1. Executive Summary */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Executive Summary
          </h2>
          <p className="text-xs text-slate-600 font-mono">The analytical result is present, but the output contract is not ready yet.</p>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5 font-mono">
            <p><strong className="text-slate-900 font-sans">Target object:</strong> {presetInfo.target}</p>
            <p><strong className="text-slate-900 font-sans">Target context:</strong> Target context: Uploaded target dataset ({presetInfo.targetProfile}) | Projection: dataset-to-dataset</p>
            <p><strong className="text-slate-900 font-sans">Active decisions:</strong> {totalFields}</p>
            <p><strong className="text-slate-900 font-sans">Coverage:</strong> mapped={acceptedCount}, unresolved={reviewCount}, modeled_only=0, excluded={rejectedCount}, target_managed=0</p>
            <p><strong className="text-slate-900 font-sans">Output contract:</strong> Describe the target grain before using this transformation design as a governed output contract.</p>
          </div>
        </div>

        {/* 2. Starting Point and Scope */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Starting Point and Scope
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Workspace scope: No explicit workspace scope yet.</li>
            <li>Mapping mode: <span className="text-indigo-600 font-bold">standard</span></li>
            <li>Projection: dataset-to-dataset</li>
            <li>Source dataset snapshot: loaded</li>
          </ul>
        </div>

        {/* 3. Source and Target Landscape */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Source and Target Landscape
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Source artifact: {presetInfo.source}</li>
            <li>Target object: {presetInfo.target}</li>
            <li>Target grain: Not defined yet.</li>
            <li>Target profile: {presetInfo.targetProfile}</li>
          </ul>
        </div>

        {/* 4. Business Intent and Assumptions */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Business Intent and Assumptions
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Target context: Uploaded target dataset ({presetInfo.targetProfile}) | Projection: dataset-to-dataset</li>
          </ul>
        </div>

        {/* 5. Mapping Outcome Summary */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Mapping Outcome Summary
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Decision closure: accepted={acceptedCount}, needs_review={reviewCount}, rejected={rejectedCount}</li>
            <li>Resolution types: direct={acceptedCount}, fixed=0, derived=0, target_managed=0, n/a=0</li>
            <li>Workspace scope (info): No explicit workspace scope yet.</li>
            <li>Target context (ready): Target context: Uploaded target dataset ({presetInfo.targetProfile}) | Projection: dataset-to-dataset</li>
            <li>Decision closure (ready): accepted={acceptedCount}, needs_review={reviewCount}, rejected={rejectedCount}</li>
            <li>Concept coverage (ready): mapped={acceptedCount}, unresolved={reviewCount}, modeled_only=0, excluded={rejectedCount}, target_managed=0</li>
            <li>Output contract (attention): Describe the target grain before using this transformation design as a governed output contract.</li>
            <li>Output gating (ready): No status-based output block is currently open.</li>
          </ul>
        </div>

        {/* 6. Key Decisions and Rationale */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Key Decisions and Rationale
          </h2>
          <div className="p-4 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-2 overflow-x-auto">
            {displayMappings.map((m) => {
              const sigs = getSignalScores(m);
              const status = m.decisionStatus || (m.isApproved ? 'accepted' : 'needs_review');
              const type = m.mappingType || 'Direct mapping';
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-emerald-400 font-bold">{m.sourceField}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-indigo-400 font-bold">{m.targetField}</span>
                  <span className="text-slate-400">({status}; {type})</span>
                  {m.transformation && (
                    <span className="text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                      pandas: {m.transformation}
                    </span>
                  )}
                  <span className="text-slate-500">[signals: canonical={sigs.canonical}, pattern={sigs.pattern}, knowledge={sigs.knowledge}]</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. Review Evidence Highlights (Detailed Per-Field Reasoning) */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Review Evidence Highlights
          </h2>
          
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Evidence rows: {totalFields}</li>
            <li>Resolution types: direct={acceptedCount}, {acceptedCount}/{totalFields}</li>
            <li>Accepted decisions: {acceptedCount}</li>
            <li>Confidence profile: {acceptedCount} high, {reviewCount} low</li>
          </ul>

          <div className="space-y-3 pt-2 font-mono text-xs">
            {displayMappings.map((m) => {
              const ev = getFieldEvidence(m);
              const isExpanded = expandedHighlights[m.id] !== false; // expanded by default
              const status = m.decisionStatus || (m.isApproved ? 'accepted' : 'needs_review');
              const type = m.mappingType || 'Direct mapping';

              return (
                <div key={m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div 
                    onClick={() => toggleHighlight(m.id)}
                    className="flex items-center justify-between cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="text-emerald-700">{m.sourceField}</span> → <span className="text-indigo-700">{m.targetField}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-normal">
                        {type}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>

                  {isExpanded && (
                    <div className="space-y-1.5 text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                      <p><strong className="text-slate-800">Canonical path:</strong> {ev.canonicalPath}</p>
                      <p><strong className="text-slate-800">Signal breakdown:</strong> {ev.signalBreakdown}</p>
                      
                      {/* RRF Hybrid Search Diagnostic Evidence Box */}
                      {(() => {
                        const rrfBullet = ev.reasoningBullets?.find(b => b.startsWith('Hybrid RRF Fusion:'));
                        if (!rrfBullet) return null;
                        return (
                          <div className="bg-emerald-950/40 p-2 rounded border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-1.5 font-mono">
                            <span className="text-emerald-400 font-bold shrink-0">⚡</span>
                            <span>{rrfBullet}</span>
                          </div>
                        );
                      })()}

                      {m.transformation && (
                        <p className="flex items-center gap-1.5">
                          <strong className="text-slate-800">Transformation:</strong>
                          <code className="bg-slate-900 text-emerald-400 px-2 py-1 rounded text-[11px] font-mono">
                            {m.transformation}
                          </code>
                        </p>
                      )}
                      <div className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 leading-relaxed space-y-1.5">
                        <div className="font-semibold text-slate-900 text-[11px]">Detailed Semantic Reasoning:</div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-0.5">
                          {ev.reasoningBullets?.filter(b => !b.startsWith('Hybrid RRF Fusion:')).map((b, bIdx) => (
                            <li key={bIdx} className="text-slate-700 leading-relaxed">{b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 8. Selected Mapping and Transformation Summary Table */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Selected Mapping and Transformation Summary
          </h2>
          <p className="text-xs text-slate-500 font-mono">The table below summarizes active selected mappings, decision status, and transformation rule guidance.</p>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2.5 font-bold">Source</th>
                  <th className="p-2.5 font-bold">Target</th>
                  <th className="p-2.5 font-bold">Confidence</th>
                  <th className="p-2.5 font-bold">LLM</th>
                  <th className="p-2.5 font-bold">Status</th>
                  <th className="p-2.5 font-bold">Validator</th>
                  <th className="p-2.5 font-bold">Source concepts</th>
                  <th className="p-2.5 font-bold">Target concepts</th>
                  <th className="p-2.5 font-bold">Canonical path</th>
                  <th className="p-2.5 font-bold">Decision type</th>
                  <th className="p-2.5 font-bold">Transformation rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mappings.map((m) => {
                  const status = m.decisionStatus || (m.isApproved ? 'accepted' : 'needs_review');
                  const type = m.mappingType || 'Direct mapping';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{m.sourceField}</td>
                      <td className="p-2.5 font-bold text-indigo-600">{m.targetField}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <ConfidenceRing score={m.score} />
                          <span className="font-mono text-xs text-slate-700 font-bold">{(m.score * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-400">{m.signals.includes('llm') ? 'Yes' : '-'}</td>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">Heuristic</td>
                      <td className="p-2.5 text-[10px] text-slate-500 max-w-[150px] truncate">{m.sourceField} Domain Material</td>
                      <td className="p-2.5 text-[10px] text-indigo-700 max-w-[170px] truncate font-semibold" title={getCanonicalConceptInfo(m).conceptDisplay}>
                        {getCanonicalConceptInfo(m).conceptDisplay}
                      </td>
                      <td className="p-2.5 text-[10px] text-indigo-700 max-w-[160px] truncate">{m.sourceField} + {m.targetField}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">{type}</span>
                      </td>
                      <td className="p-2.5 text-[11px] font-mono text-emerald-600 max-w-[200px] truncate">
                        {m.transformation || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. Decision Rationale Overrides & Transformation Rationale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">Decision Rationale Overrides</h3>
            <p className="text-xs text-slate-500 font-mono">
              {mappings.some(m => m.decisionStatus || m.mappingType)
                ? `${mappings.filter(m => m.decisionStatus || m.mappingType).length} fields configured with explicit status/type settings.`
                : 'No explicit decision overrides or audit events are currently recorded.'}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">Transformation Rationale By Field</h3>
            <div className="text-xs text-slate-600 font-mono space-y-1">
              {mappings.filter(m => m.transformation).length > 0 ? (
                mappings.filter(m => m.transformation).map(m => (
                  <div key={m.id} className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <strong className="text-slate-800">{m.sourceField}:</strong> <span className="text-emerald-700">{m.transformation}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No custom field-level transformation rules configured yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* 10. Implementation Artifact */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Implementation Artifact
            </h2>
            
            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-mono">
              {(['dbt', 'pandas', 'pyspark'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setCodeLanguage(lang)}
                  className={`px-3 py-1 rounded transition-colors font-bold uppercase ${
                    codeLanguage === lang ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 font-mono text-xs">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-slate-400">
              <span>Artifact section: Generated {codeLanguage.toUpperCase()} Code</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getCurrentCode());
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 text-emerald-400 overflow-x-auto leading-relaxed">
              <code>{getCurrentCode()}</code>
            </pre>
          </div>
        </div>

        {/* 11. Concept Model Result */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Concept Model Result
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Business object: {presetInfo.target}</li>
            <li>Description: Analyzed {totalFields} source attributes mapped to canonical target schema.</li>
            <li>Business purpose: Data integration & canonical model standardization</li>
            <li>Target grain: Single record per primary entity ({presetInfo.target})</li>
          </ul>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-900 font-mono uppercase mb-2">Concept Groups</h3>
            <ul className="list-disc list-inside text-xs text-slate-600 font-mono space-y-0.5 pl-1">
              <li>Identity & Key Attributes: {Math.max(1, Math.floor(totalFields * 0.35))}</li>
              <li>General Attributes: {Math.max(1, Math.floor(totalFields * 0.45))}</li>
              <li>Classification & Codes: {Math.max(1, totalFields - Math.floor(totalFields * 0.35) - Math.floor(totalFields * 0.45))}</li>
            </ul>
          </div>
        </div>

        {/* 12. Source -> Source Concept -> Transformation -> Target Concept -> Target Graph */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Source → Source Concept → Transformation Rule → Target Concept → Target Graph ({totalFields} attributes)
            </h2>
            <button
              onClick={() => setShowMermaidCode(!showMermaidCode)}
              className="text-xs font-mono text-indigo-600 hover:underline"
            >
              {showMermaidCode ? 'Show Visual Diagram' : 'Show Raw Mermaid Code'}
            </button>
          </div>

          {showMermaidCode ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto">
              <pre>{generateMermaidGraph()}</pre>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 overflow-x-auto">
              <div className="grid grid-cols-5 gap-3 min-w-[920px] text-center font-mono text-xs font-bold text-slate-600">
                <div>Source Attribute ({totalFields})</div>
                <div>Source Concept</div>
                <div>Transformation Rule</div>
                <div>Target Concept</div>
                <div>Target Attribute ({totalFields})</div>
              </div>

              <div className="space-y-3 min-w-[920px]">
                {mappings.map((m) => {
                  const conceptInfo = getCanonicalConceptInfo(m);
                  const hasTransform = Boolean(m.transformation || conceptInfo.ruleName.includes('Rule') || conceptInfo.ruleName.includes('3-Category'));

                  return (
                    <div key={m.id} className="grid grid-cols-5 gap-2.5 items-center text-xs font-mono">
                      {/* 1. Source Attribute */}
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-center font-bold text-slate-800 truncate" title={m.sourceField}>
                        {m.sourceField}
                      </div>

                      {/* 2. Source Canonical Concept */}
                      <div className="flex items-center gap-1 justify-center min-w-0">
                        <div className="w-1.5 h-[1px] bg-slate-300"></div>
                        <div className="flex-1 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center text-[10px] shadow-sm min-w-0">
                          <span className="font-bold text-amber-900 block truncate" title={conceptInfo.sourceConcept}>{conceptInfo.sourceConcept}</span>
                          <span className="text-[8.5px] text-amber-700/80 block uppercase font-mono tracking-tight">Source Domain</span>
                        </div>
                        <div className="w-1.5 h-[1px] bg-slate-300"></div>
                      </div>

                      {/* 3. Transformation Node / Intermediate Step */}
                      <div className="flex items-center gap-1 justify-center min-w-0">
                        <div className="w-1.5 h-[1px] bg-slate-300"></div>
                        <div className={`flex-1 px-2 py-1.5 rounded-lg text-center text-[10px] shadow-sm border min-w-0 ${
                          hasTransform 
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/70 font-semibold' 
                            : 'bg-slate-100 text-slate-700 border-slate-200 font-mono'
                        }`}>
                          <span className="font-bold block truncate" title={conceptInfo.ruleName}>{conceptInfo.ruleName}</span>
                          <span className="text-[8.5px] opacity-80 block truncate font-sans" title={conceptInfo.ruleDesc}>{conceptInfo.ruleDesc}</span>
                        </div>
                        <div className="w-1.5 h-[1px] bg-slate-300"></div>
                      </div>

                      {/* 4. Target Canonical Concept */}
                      <div className="flex items-center gap-1 justify-center min-w-0">
                        <div className="w-1.5 h-[1px] bg-slate-300"></div>
                        <div className="flex-1 px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-center text-[10px] shadow-sm min-w-0">
                          <span className="font-bold text-indigo-900 block truncate" title={conceptInfo.targetConcept}>{conceptInfo.targetConcept}</span>
                          <span className="text-[8.5px] text-indigo-700/80 block uppercase font-mono tracking-tight">Target Domain</span>
                        </div>
                        <div className="w-1.5 h-[1px] bg-slate-300"></div>
                      </div>

                      {/* 5. Target Attribute */}
                      <div className="p-2.5 bg-white border border-indigo-200 rounded-lg shadow-sm text-center font-bold text-indigo-700 truncate" title={m.targetField}>
                        {m.targetField}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 13. Output Contract Summary */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Output Contract Summary
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Contract state: incomplete</li>
            <li>Contract detail: Describe the target grain before using this transformation design as a governed output contract.</li>
            <li>Transformation carry-over: field_rules=0, business_rules=0</li>
            <li>Excluded output summary: None.</li>
          </ul>
        </div>

        {/* 14. Open Analyst Notes */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Open Analyst Notes
          </h2>
          <p className="text-xs text-slate-600 font-mono pl-1">
            • Latest workspace note: Generated mapping candidates from the current datasets.
          </p>
        </div>

        {/* 15. Approval and Governance Readiness */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Approval and Governance Readiness
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-mono pl-1">
            <li>Decision closure is complete for the current active mapping set.</li>
            <li>Output contract is still open and should be completed before governance approval.</li>
            <li>Concept model is aligned with the current operational decision state.</li>
            <li>Primary approval path remains Governance &gt; Stewardship.</li>
          </ul>
        </div>

        {/* 16. Risks, Gaps, and Open Questions */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Risks, Gaps, and Open Questions
          </h2>
          <p className="text-xs text-slate-600 font-mono pl-1">
            • Describe the target grain before using this transformation design as a governed output contract.
          </p>
        </div>

        {/* 17. Recommended Next Steps */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            Recommended Next Steps
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1.5 font-mono pl-1">
            <li>Return to Output and complete the transformation contract so preview/code generation can rely on a governed result.</li>
            <li>
              <span className="text-indigo-600 font-bold hover:underline cursor-pointer">
                › Refine concept model and inspect diagnostics
              </span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};
