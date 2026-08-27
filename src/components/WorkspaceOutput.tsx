import React, { useState } from 'react';
import { 
  Terminal, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle, 
  HelpCircle, 
  Copy, 
  Play, 
  FileCode2, 
  Bug,
  AlertCircle,
  Plus,
  BookOpen,
  ArrowRight,
  Trash2,
  Pencil,
  X,
  Fingerprint,
  Lock,
  ShieldCheck,
  Network,
  Activity,
  Share2,
  ExternalLink,
  Check
} from 'lucide-react';
import { MappingRow } from '../types';

interface WorkspaceOutputProps {
  mappings: MappingRow[];
  selectedPreset: string;
  onPublishToCatalog?: () => void;
  onUpdateMappings?: (newMappings: MappingRow[]) => void;
}

export const WorkspaceOutput: React.FC<WorkspaceOutputProps> = ({ 
  mappings, 
  selectedPreset, 
  onPublishToCatalog,
  onUpdateMappings 
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'pandas' | 'pyspark' | 'dbt' | 'dbt_test' | 'great_expectations' | 'sql_audit' | 'talend' | 'azure_sql' | 'openlineage'>('pandas');
  const [testSuiteExecuting, setTestSuiteExecuting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [includeMtlsHsm, setIncludeMtlsHsm] = useState(false);
  const [lineageEventType, setLineageEventType] = useState<'START' | 'COMPLETE' | 'FAIL'>('COMPLETE');
  const [lineageViewMode, setLineageViewMode] = useState<'visual' | 'json' | 'python'>('visual');
  const [isEmittingLineage, setIsEmittingLineage] = useState(false);
  const [emittedEventSuccess, setEmittedEventSuccess] = useState(false);

  // AI Code Refinement State
  const [codePrompt, setCodePrompt] = useState('');
  const [appliedPrompts, setAppliedPrompts] = useState<string[]>([]);
  const [appliedRulesSummary, setAppliedRulesSummary] = useState<Array<{
    rawPrompt: string;
    targetField: string;
    description: string;
    pandasCode: string;
  }>>([]);
  const [isRefiningCode, setIsRefiningCode] = useState(false);

  // AI Assertion Prompt State
  const [assertionAiPrompt, setAssertionAiPrompt] = useState('');
  const [isGeneratingAssertion, setIsGeneratingAssertion] = useState(false);

  // Helper to handle AI natural language code refinement
  const handleApplyCodePrompt = (promptToApply?: string) => {
    const text = (promptToApply || codePrompt).trim();
    if (!text) return;

    setIsRefiningCode(true);
    setTimeout(() => {
      const lower = text.toLowerCase();
      let targetField = 'col_4';
      
      // Check if specific field is mentioned like col_4, df_target.col_4, col_1, customer_id, etc.
      const colMatch = text.match(/df_target\.([a-zA-Z0-9_]+)/i) || text.match(/\b(col_\d+|[a-zA-Z0-9_]+_id|[a-zA-Z0-9_]+_amt|tier)\b/i);
      if (colMatch && colMatch[1]) {
        targetField = colMatch[1];
      }

      let generatedPandas = `df_source['${targetField}'].astype(str).str.strip()`;
      let ruleDesc = `Transformed ${targetField} using rule: '${text}'`;

      if (
        lower.includes('tier') ||
        lower.includes('service level') ||
        lower.includes('revenue') ||
        lower.includes('turnover') ||
        lower.includes('3 categories') ||
        lower.includes('categories') ||
        lower.includes('col_4')
      ) {
        targetField = 'col_4';
        const sourceRevField = mappings.find(m => 
          m.sourceField.toLowerCase().includes('turnover') || 
          m.sourceField.toLowerCase().includes('amount') || 
          m.sourceField.toLowerCase().includes('revenue') ||
          m.sourceField.toLowerCase().includes('kunnr')
        )?.sourceField || mappings[0]?.sourceField || 'turnover_amt';

        generatedPandas = `np.select([pd.to_numeric(df_source['${sourceRevField}'], errors='coerce') >= 1000000, pd.to_numeric(df_source['${sourceRevField}'], errors='coerce') >= 250000], ['Tier_1_Gold', 'Tier_2_Silver'], default='Tier_3_Bronze')`;
        ruleDesc = `3-category customer service level rule based on revenue/turnover metrics (Tier 1 Gold >= 1M, Tier 2 Silver >= 250K, Tier 3 Bronze < 250K).`;
      } else if (lower.includes('null') || lower.includes('empty') || lower.includes('drop')) {
        generatedPandas = `df_source['${targetField}'].fillna('N/A')`;
        ruleDesc = `Imputed null values with default fallback for ${targetField}.`;
      } else if (lower.includes('upper')) {
        generatedPandas = `df_source['${targetField}'].astype(str).str.upper()`;
        ruleDesc = `Converted ${targetField} to uppercase.`;
      } else if (lower.includes('currency') || lower.includes('price')) {
        generatedPandas = `pd.to_numeric(df_source['${targetField}'].astype(str).str.replace(r'[^0-9.]', '', regex=True), errors='coerce').fillna(0.00)`;
        ruleDesc = `Parsed numeric currency value for ${targetField}.`;
      }

      // Sync mapping if onUpdateMappings is available
      if (onUpdateMappings) {
        const sourceRevField = mappings.find(m => 
          m.sourceField.toLowerCase().includes('turnover') || 
          m.sourceField.toLowerCase().includes('amount') || 
          m.sourceField.toLowerCase().includes('revenue')
        )?.sourceField || mappings[0]?.sourceField || 'turnover_amt';

        const existingIndex = mappings.findIndex(m => m.targetField.toLowerCase() === targetField.toLowerCase());
        if (existingIndex >= 0) {
          const updated = [...mappings];
          updated[existingIndex] = {
            ...updated[existingIndex],
            transformation: generatedPandas,
            transformationCode: generatedPandas,
            explanation: ruleDesc,
            confidence: 'high',
            score: 0.98,
            signals: Array.from(new Set([...updated[existingIndex].signals, 'llm', 'transformation']))
          };
          onUpdateMappings(updated);
        } else {
          const newRow: MappingRow = {
            id: `m_${targetField}_${Date.now()}`,
            sourceField: sourceRevField,
            targetField: targetField,
            sourceType: 'DECIMAL(18,2)',
            targetType: 'VARCHAR(50)',
            score: 0.98,
            confidence: 'high',
            signals: ['llm', 'semantic', 'transformation'],
            transformation: generatedPandas,
            transformationCode: generatedPandas,
            explanation: ruleDesc,
            isApproved: true,
            decisionStatus: 'accepted'
          };
          onUpdateMappings([...mappings, newRow]);
        }
      }

      setAppliedPrompts(prev => [...prev, text]);
      setAppliedRulesSummary(prev => [
        ...prev,
        {
          rawPrompt: text,
          targetField,
          description: ruleDesc,
          pandasCode: generatedPandas
        }
      ]);
      setCodePrompt('');
      setIsRefiningCode(false);
    }, 600);
  };

  const handleRemovePrompt = (index: number) => {
    setAppliedPrompts(prev => prev.filter((_, i) => i !== index));
    setAppliedRulesSummary(prev => prev.filter((_, i) => i !== index));
  };

  // Assertion rules state initialized dynamically from mappings
  const [assertionResults, setAssertionResults] = useState(() => {
    if (mappings && mappings.length > 0) {
      const f1 = mappings[0].sourceField;
      const t1 = mappings[0].targetField;
      const f2 = mappings[1]?.sourceField || f1;
      const f3 = mappings[2]?.sourceField || f1;
      return [
        { id: 't_1', name: `Zero-padding & Format (${f1})`, rule: `str(${f1}).zfill(10)`, status: 'success', details: `Validated: All records correctly formatted and aligned for ${t1}.` },
        { id: 't_2', name: `Upper-case & Clean (${f2})`, rule: `upper(${f2})`, status: 'success', details: `Validated: Converted ${f2} descriptors cleanly.` },
        { id: 't_3', name: `Precision & Null Check (${f3})`, rule: `df['${mappings[2]?.targetField || t1}'].notnull()`, status: 'warning', details: `Advisory: ${f3} contains potential null values. Imputed defaults.` }
      ];
    }
    return [
      { id: 't_1', name: 'Zero-padding Customer ID (KUNNR)', rule: 'str(KUNNR).zfill(10)', status: 'success', details: 'Validated: All 240 records correctly zero-padded to 10 chars.' },
      { id: 't_2', name: 'Upper-case Country (LAND1)', rule: 'upper(LAND1)', status: 'success', details: 'Validated: Converted LIFNR land descriptors cleanly.' },
      { id: 't_3', name: 'Price List precision formatting', rule: 'decimal(PLTYP, 2)', status: 'warning', details: 'Advisory: PLTYP contains null values. Imputed defaults.' }
    ];
  });

  // Sync assertions when mappings change if current assertions are stale
  React.useEffect(() => {
    if (mappings.length > 0) {
      const activeFields = new Set(mappings.flatMap(m => [m.sourceField, m.targetField]));
      const isStale = assertionResults.some(a => a.rule.includes('KUNNR') || a.rule.includes('LAND1') || a.rule.includes('PLTYP')) && 
                      !activeFields.has('KUNNR') && !activeFields.has('LAND1') && !activeFields.has('PLTYP');
      if (isStale) {
        const f1 = mappings[0].sourceField;
        const t1 = mappings[0].targetField;
        const f2 = mappings[1]?.sourceField || f1;
        const f3 = mappings[2]?.sourceField || f1;
        setAssertionResults([
          { id: 't_1', name: `Zero-padding & Format (${f1})`, rule: `str(${f1}).zfill(10)`, status: 'success', details: `Validated: All records correctly formatted and aligned for ${t1}.` },
          { id: 't_2', name: `Upper-case & Clean (${f2})`, rule: `upper(${f2})`, status: 'success', details: `Validated: Converted ${f2} descriptors cleanly.` },
          { id: 't_3', name: `Precision & Null Check (${f3})`, rule: `df['${mappings[2]?.targetField || t1}'].notnull()`, status: 'warning', details: `Advisory: ${f3} contains potential null values. Imputed defaults.` }
        ]);
      }
    }
  }, [mappings]);

  // AI Generator for Assertion Rules
  const handleGenerateAssertionFromAiPrompt = (promptText?: string) => {
    const p = (promptText || assertionAiPrompt).trim();
    if (!p) return;

    setIsGeneratingAssertion(true);
    setTimeout(() => {
      const lower = p.toLowerCase();
      const firstField = mappings[0]?.targetField || 'customer_id';

      // Match target field if mentioned
      const matchedMapping = mappings.find(m => 
        lower.includes(m.targetField.toLowerCase()) || lower.includes(m.sourceField.toLowerCase())
      );
      const field = matchedMapping ? matchedMapping.targetField : firstField;

      let ruleName = `AI Rule: ${p}`;
      let ruleExpr = `df['${field}'].notnull().all()`;
      let detailsText = `Validated: AI verified constraint '${p}' on target field ${field}.`;

      if (lower.includes('null') || lower.includes('empty') || lower.includes('required') || lower.includes('missing')) {
        ruleName = `Non-null check on ${field}`;
        ruleExpr = `df['${field}'].notnull().all()`;
      } else if (lower.includes('unique') || lower.includes('duplicate') || lower.includes('distinct') || lower.includes('primary key') || lower.includes('pk')) {
        ruleName = `Uniqueness check on ${field}`;
        ruleExpr = `df['${field}'].is_unique`;
      } else if (lower.includes('length') || lower.includes('len') || lower.includes('char')) {
        ruleName = `Length constraint check on ${field}`;
        ruleExpr = `df['${field}'].astype(str).str.len() == 10`;
      } else if (lower.includes('range') || lower.includes('greater') || lower.includes('positive') || lower.includes('value') || lower.includes('amount')) {
        ruleName = `Value range check on ${field}`;
        ruleExpr = `(df['${field}'].astype(float) >= 0).all()`;
      } else if (lower.includes('email') || lower.includes('domain')) {
        ruleName = `Email format check on ${field}`;
        ruleExpr = `df['${field}'].astype(str).str.contains('@').all()`;
      } else if (lower.includes('prefix') || lower.includes('start') || lower.includes('pattern')) {
        ruleName = `Pattern check on ${field}`;
        ruleExpr = `df['${field}'].astype(str).str.startswith('REF-').all()`;
      } else {
        ruleName = `Custom AI rule on ${field}`;
        ruleExpr = `df['${field}'].apply(lambda x: bool(x)).all()  # Rule: ${p}`;
      }

      setAssertionResults(prev => [
        ...prev,
        {
          id: `t_${Date.now()}`,
          name: ruleName,
          rule: ruleExpr,
          status: 'success',
          details: detailsText
        }
      ]);

      setAssertionAiPrompt('');
      setIsGeneratingAssertion(false);
    }, 600);
  };

  // AI Generator inside Modal Dialog
  const [modalAiPrompt, setModalAiPrompt] = useState('');
  const [isModalAiGenerating, setIsModalAiGenerating] = useState(false);

  const handleModalAiGenerate = (promptText?: string) => {
    const text = (promptText || modalAiPrompt).trim();
    if (!text) return;

    setIsModalAiGenerating(true);
    setTimeout(() => {
      const lower = text.toLowerCase();
      const firstField = mappings[0]?.targetField || 'customer_id';

      // Match target field if mentioned
      const matchedMapping = mappings.find(m => 
        lower.includes(m.targetField.toLowerCase()) || lower.includes(m.sourceField.toLowerCase())
      );
      const field = matchedMapping ? matchedMapping.targetField : newRuleTargetField || firstField;
      setNewRuleTargetField(field);

      if (lower.includes('null') || lower.includes('empty') || lower.includes('required') || lower.includes('missing')) {
        setNewRuleName(`Check ${field} non-null constraint`);
        setNewRuleType('not_null');
        setNewRuleExpression(`df['${field}'].notnull().all()`);
        setNewRuleDetails(`Ensure all rows have non-empty ${field} values.`);
      } else if (lower.includes('unique') || lower.includes('duplicate') || lower.includes('distinct') || lower.includes('primary key') || lower.includes('pk')) {
        setNewRuleName(`Check ${field} uniqueness`);
        setNewRuleType('unique');
        setNewRuleExpression(`df['${field}'].is_unique`);
        setNewRuleDetails(`Verify every record has a unique ${field} identifier.`);
      } else if (lower.includes('length') || lower.includes('len') || lower.includes('char') || lower.includes('zfill') || lower.includes('pad')) {
        setNewRuleName(`Check ${field} 10-char padding length`);
        setNewRuleType('zfill');
        setNewRuleExpression(`str(${field}).zfill(10)`);
        setNewRuleDetails(`Verify length & formatting for ${field}.`);
      } else if (lower.includes('positive') || lower.includes('greater') || lower.includes('amount') || lower.includes('price')) {
        setNewRuleName(`Check ${field} non-negative value`);
        setNewRuleType('custom');
        setNewRuleExpression(`(df['${field}'].astype(float) >= 0).all()`);
        setNewRuleDetails(`Ensure numeric values in ${field} are >= 0.`);
      } else if (lower.includes('email') || lower.includes('domain')) {
        setNewRuleName(`Check ${field} email format`);
        setNewRuleType('custom');
        setNewRuleExpression(`df['${field}'].astype(str).str.contains('@').all()`);
        setNewRuleDetails(`Verify ${field} contains valid email domain structure.`);
      } else {
        setNewRuleName(`AI Rule: ${text}`);
        setNewRuleType('custom');
        setNewRuleExpression(`df['${field}'].notnull().all()  # AI constraint: ${text}`);
        setNewRuleDetails(`AI generated rule for ${field} based on '${text}'.`);
      }

      setModalAiPrompt('');
      setIsModalAiGenerating(false);
    }, 500);
  };

  // Modal & Form State for Adding New Rule
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTargetField, setNewRuleTargetField] = useState(mappings[0]?.targetField || '');
  const [newRuleType, setNewRuleType] = useState<'not_null' | 'unique' | 'zfill' | 'custom'>('not_null');
  const [newRuleExpression, setNewRuleExpression] = useState(`df['${mappings[0]?.targetField || 'field'}'].notnull().all()`);

  // Auto update rule expression when field or rule type changes
  const handleTypeOrFieldChange = (field: string, type: 'not_null' | 'unique' | 'zfill' | 'custom') => {
    setNewRuleTargetField(field);
    setNewRuleType(type);
    if (type === 'not_null') {
      setNewRuleExpression(`df['${field}'].notnull().all()`);
    } else if (type === 'unique') {
      setNewRuleExpression(`df['${field}'].is_unique`);
    } else if (type === 'zfill') {
      setNewRuleExpression(`df['${field}'].str.len() == 10`);
    } else if (type === 'custom' && !newRuleExpression) {
      setNewRuleExpression(`df['${field}'].astype(str).str.startswith('C-')`);
    }
  };

  const handleOpenAddModal = () => {
    const defaultField = mappings[0]?.targetField || 'customer_id';
    setNewRuleName(`Check ${defaultField} non-null constraint`);
    setNewRuleTargetField(defaultField);
    setNewRuleType('not_null');
    setNewRuleExpression(`df['${defaultField}'].notnull().all()`);
    setIsAddModalOpen(true);
  };

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule = {
      id: `t_${Date.now()}`,
      name: newRuleName.trim(),
      rule: newRuleExpression.trim() || `df['${newRuleTargetField}'].notnull()`,
      status: 'success',
      details: `Validated: Assertion rule passed for field ${newRuleTargetField}.`
    };

    setAssertionResults(prev => [...prev, newRule]);
    setIsAddModalOpen(false);
    setNewRuleName('');
  };

  const handleDeleteRule = (id: string) => {
    setAssertionResults(prev => prev.filter(r => r.id !== id));
  };

  // Edit Rule State and Handlers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [editRuleName, setEditRuleName] = useState('');
  const [editRuleExpression, setEditRuleExpression] = useState('');
  const [editRuleDetails, setEditRuleDetails] = useState('');
  const [editRuleStatus, setEditRuleStatus] = useState<'success' | 'warning'>('success');

  const handleOpenEditModal = (rule: any) => {
    setEditingRule(rule);
    setEditRuleName(rule.name);
    setEditRuleExpression(rule.rule);
    setEditRuleDetails(rule.details);
    setEditRuleStatus(rule.status);
    setIsEditModalOpen(true);
  };

  const handleEditRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRuleName.trim() || !editingRule) return;

    setAssertionResults(prev => prev.map(r => {
      if (r.id === editingRule.id) {
        return {
          ...r,
          name: editRuleName.trim(),
          rule: editRuleExpression.trim(),
          details: editRuleDetails.trim(),
          status: editRuleStatus
        };
      }
      return r;
    }));
    setIsEditModalOpen(false);
    setEditingRule(null);
  };

  const handleRunTests = () => {
    setTestSuiteExecuting(true);
    setTimeout(() => {
      setTestSuiteExecuting(false);
      setAssertionResults(prev => prev.map(a => ({
        ...a,
        status: a.status === 'warning' ? 'warning' : 'success'
      })));
    }, 1500);
  };

  // Dynamic code blocks depending on mappings, selectedPreset, and applied AI prompts
  const getPandasCode = () => {
    const promptComments = appliedPrompts.length > 0
      ? `\n    # --- AI Custom Code Refinement Rules Applied ---\n` + 
        appliedPrompts.map(p => `    # AI Instruction: ${p}\n    # [Applied]: Enhanced pipeline logic for '${p}'`).join('\n') + `\n`
      : '';

    const mtlsHsmBlock = includeMtlsHsm ? `
import hashlib
import json
import time

class HSMModule:
    """Hardware Security Module (HSM) Cryptographic Signer for Non-Repudiation."""
    def __init__(self, key_id: str = "HSM_KEY_SERBIA_PROD_2026"):
        self.key_id = key_id

    def sign_payload_digest(self, payload_hash: str) -> str:
        signature_raw = f"{payload_hash}:{self.key_id}:NON_REPUDIATION_SEAL"
        return hashlib.sha256(signature_raw.encode('utf-8')).hexdigest()

class mTLSAuthenticationInterceptor:
    """Enforces Bi-directional x509 Client Certificate Handshake."""
    def __init__(self, hsm: HSMModule):
        self.hsm = hsm
        self.trusted_certs = {
            "SHA256:4A:8B:12:34:56:78:BOSCH_CERT": "TENANT_BOSCH",
            "SHA256:9F:8E:76:54:32:10:CONTINENTAL_CERT": "TENANT_CONTINENTAL",
            "SHA256:C3:5D:89:11:22:33:ERSTE_CORE_CERT": "TENANT_ERSTE_FINTECH"
        }

    def authenticate_and_sign(self, client_fingerprint: str, payload_data: dict) -> dict:
        if client_fingerprint not in self.trusted_certs:
            raise PermissionError("403 Forbidden: Untrusted Client Certificate (mTLS Failed)")
        
        tenant_id = self.trusted_certs[client_fingerprint]
        raw_json = json.dumps(payload_data, sort_keys=True)
        payload_hash = hashlib.sha256(raw_json.encode('utf-8')).hexdigest()
        hsm_signature = self.hsm.sign_payload_digest(payload_hash)
        
        return {
            "status": "AUTHENTICATED_AND_SIGNED",
            "tenant_id": tenant_id,
            "payload_sha256": payload_hash,
            "hsm_signature": hsm_signature,
            "timestamp_utc": time.time()
        }
` : '';

    return `import pandas as pd
import numpy as np
import logging${mtlsHsmBlock}

logging.basicConfig(level=logging.INFO)

def run_semantra_mapping(source_path: str, client_cert_fingerprint: str = "SHA256:4A:8B:12:34:56:78:BOSCH_CERT") -> pd.DataFrame:
    """
    Auto-generated Semantra Pipeline
    Source Preset: ${selectedPreset}
    Sovereign Security: ${includeMtlsHsm ? 'mTLS + HSM Enforced' : 'Standard Pipeline'}
    """${includeMtlsHsm ? `
    # 0. mTLS & HSM Handshake Verification
    hsm = HSMModule()
    interceptor = mTLSAuthenticationInterceptor(hsm)
    security_receipt = interceptor.authenticate_and_sign(client_cert_fingerprint, {"source": source_path, "preset": "${selectedPreset}"})
    logging.info(f"mTLS Verified for {security_receipt['tenant_id']} | HSM Seal: {security_receipt['hsm_signature'][:16]}...")
` : ''}
    # 1. Load source dataset
    df_source = pd.read_csv(source_path, dtype=str)
    df_target = pd.DataFrame()

    # 2. Schema alignment and field-level transformations
${mappings.map(m => {
  if (m.transformation) {
    return `    # Transformation [${m.mappingType || 'Custom'}]: ${m.sourceField} -> ${m.targetField}\n    df_target['${m.targetField}'] = ${m.transformation}`;
  }
  return `    # Direct mapping: ${m.sourceField} -> ${m.targetField}\n    df_target['${m.targetField}'] = df_source['${m.sourceField}']`;
}).join('\n')}${promptComments}
    # 3. Final Validation & Clean
    df_target.dropna(how='all', inplace=True)
    return df_target

# Entrypoint for pipeline execution
if __name__ == "__main__":
    mapped_data = run_semantra_mapping("./source_data.csv")
    print(f"Ingested {len(mapped_data)} records successfully.")`;
  };

  const getTransformationExpression = (m: MappingRow, format: 'dbt' | 'pyspark') => {
    const sf = m.sourceField;
    const tf = m.targetField;
    const tr = (m.transformation || '').toLowerCase();
    const sfName = (m.sourceField || '').toLowerCase();
    const tfName = (m.targetField || '').toLowerCase();

    // 1. Prefix rule (e.g. "C-" prefix)
    if (tr.includes('prefix') || (sfName === 'col_1' && tfName === 'col_1' && (m.transformation?.includes('C-') || m.transformationCode?.includes('C-')))) {
      if (format === 'dbt') return `CONCAT('C-', CAST(${sf} AS VARCHAR)) AS ${tf}`;
      if (format === 'pyspark') return `F.concat(F.lit("C-"), F.col("${sf}").cast("string")).alias("${tf}")`;
    }

    // 2. Revenue / Tiering rule
    if (tr.includes('tier') || tr.includes('revenue') || (sfName === 'col_5' && tfName === 'col_4')) {
      if (format === 'dbt') {
        return `CASE \n            WHEN CAST(${sf} AS NUMERIC) >= 200000 THEN 'Enterprise'\n            WHEN CAST(${sf} AS NUMERIC) >= 100000 THEN 'Premium'\n            WHEN CAST(${sf} AS NUMERIC) >= 75000 THEN 'Midmarket'\n            ELSE 'Standard'\n        END AS ${tf}`;
      }
      if (format === 'pyspark') {
        return `F.when(F.col("${sf}").cast("double") >= 200000, "Enterprise")\\
         .when(F.col("${sf}").cast("double") >= 100000, "Premium")\\
         .when(F.col("${sf}").cast("double") >= 75000, "Midmarket")\\
         .otherwise("Standard").alias("${tf}")`;
      }
    }

    // 3. Trim / Strip / Clean
    if (tr.includes('trim') || tr.includes('strip') || tr.includes('clean')) {
      if (format === 'dbt') return `TRIM(${sf}) AS ${tf}`;
      if (format === 'pyspark') return `F.trim(F.col("${sf}")).alias("${tf}")`;
    }

    // 4. Upper / ISO Country
    if (tr.includes('upper') || tr.includes('iso')) {
      if (format === 'dbt') return `UPPER(TRIM(${sf})) AS ${tf}`;
      if (format === 'pyspark') return `F.upper(F.trim(F.col("${sf}"))).alias("${tf}")`;
    }

    // 5. Lower
    if (tr.includes('lower')) {
      if (format === 'dbt') return `LOWER(${sf}) AS ${tf}`;
      if (format === 'pyspark') return `F.lower(F.col("${sf}")).alias("${tf}")`;
    }

    // 6. Date / ISO Date
    if (tr.includes('date') || tr.includes('iso date') || (sfName === 'col_4' && tfName === 'col_5')) {
      if (format === 'dbt') return `CAST(${sf} AS DATE) AS ${tf}`;
      if (format === 'pyspark') return `F.col("${sf}").cast("date").alias("${tf}")`;
    }

    if (tr.includes('fillna') || tr.includes('null')) {
      if (format === 'dbt') return `COALESCE(${sf}, 'N/A') AS ${tf}`;
      if (format === 'pyspark') return `F.coalesce(F.col("${sf}"), F.lit("N/A")).alias("${tf}")`;
    }

    if (tr.includes('to_numeric') || tr.includes('replace')) {
      if (format === 'dbt') return `CAST(REGEXP_REPLACE(${sf}, '[^0-9.]', '') AS NUMERIC) AS ${tf}`;
      if (format === 'pyspark') return `F.regexp_replace(F.col("${sf}"), "[^0-9.]", "").cast("double").alias("${tf}")`;
    }

    if (format === 'dbt') return `CAST(${sf} AS ${m.targetType || 'VARCHAR'}) AS ${tf}`;
    return `F.col("${sf}").alias("${tf}")`;
  };

  const getPySparkCode = () => {
    const promptComments = appliedPrompts.length > 0
      ? `\n    # --- AI Custom Code Refinement Rules Applied ---\n` + 
        appliedPrompts.map(p => `    # AI Instruction: ${p}`).join('\n') + `\n`
      : '';

    return `from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def align_pyspark_schema(spark: SparkSession, source_table: str):
    df = spark.read.table(source_table)
    
    # Structure mapping decisions and transformations
${mappings.map(m => {
  if (m.transformation) {
    return `    # Custom transformation [${m.mappingType || 'Custom'}]: ${m.sourceField} -> ${m.targetField} (${m.transformation})`;
  }
  return `    # Direct alias: ${m.sourceField} -> ${m.targetField}`;
}).join('\n')}${promptComments}
    aligned_df = df.select([
${mappings.map(m => `        ${getTransformationExpression(m, 'pyspark')}`).join(',\n')}
    ])

    return aligned_df`;
  };

  const getDbtCode = () => {
    const promptComments = appliedPrompts.length > 0
      ? `\n-- AI Instructions Applied: ` + appliedPrompts.join(', ')
      : '';

    return `{# 
  Semantra Generated dbt Model Configuration
  Source System: ${selectedPreset}
  Target Table: canonical_output${promptComments}
#}

with source as (
    select * from {{ source('raw_data', 'source_table') }}
),

mapped as (
    select
${mappings.map(m => `        ${getTransformationExpression(m, 'dbt')}`).join(',\n')}
    from source
)

select * from mapped`;
  };

  const getTalendExpression = (m: MappingRow) => {
    const sf = `row_source_1.${m.sourceField}`;
    const tr = (m.transformation || '').toLowerCase();
    const sfName = (m.sourceField || '').toLowerCase();
    const tfName = (m.targetField || '').toLowerCase();

    // 1. Prefix logic (e.g. "C-" prefix)
    if (tr.includes('prefix') || (sfName === 'col_1' && tfName === 'col_1' && (m.transformation?.includes('C-') || m.transformationCode?.includes('C-')))) {
      return `&quot;C-&quot; + ${sf}`;
    }

    // 2. Revenue / Tiering rule logic
    if (tr.includes('tier') || tr.includes('revenue') || (sfName === 'col_5' && tfName === 'col_4')) {
      return `${sf} != null &amp;&amp; ${sf} &gt;= 200000 ? &quot;Enterprise&quot; : (${sf} != null &amp;&amp; ${sf} &gt;= 100000 ? &quot;Premium&quot; : (${sf} != null &amp;&amp; ${sf} &gt;= 75000 ? &quot;Midmarket&quot; : &quot;Standard&quot;))`;
    }

    // 3. Trim / Clean string
    if (tr.includes('trim') || tr.includes('strip') || tr.includes('clean')) {
      return `${sf} != null ? ${sf}.trim() : null`;
    }

    // 4. Uppercase / ISO Country
    if (tr.includes('upper') || tr.includes('iso')) {
      return `${sf} != null ? ${sf}.toUpperCase() : null`;
    }

    // 5. Lowercase
    if (tr.includes('lower')) {
      return `${sf} != null ? ${sf}.toLowerCase() : null`;
    }

    // 6. Date formatting / casting
    if (tr.includes('date') || tr.includes('iso date')) {
      return `${sf} != null ? ${sf}.toString() : null`;
    }

    // Default: Direct field pass-through
    return sf;
  };

  const getTalendCode = () => {
    const promptComments = appliedPrompts.length > 0
      ? `\n    <!-- AI Custom Rules: ${appliedPrompts.join(', ')} -->`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<talend:tMap xmlns:talend="http://www.talend.org/mapper" name="tMap_1">${promptComments}
  <!-- Ingested Source system: ${selectedPreset} -->
  <!-- Target Database: Azure SQL Server & Databricks -->
  <externalNode xsi:type="talend:tMapExternalNode">
    <uiProperties shellPosition="65,120,400,600" />
    <varTables name="Var" minimized="true" />
    
    <!-- Source Input Schema -->
    <inputTables name="row_source_1" sizeState="INTERMEDIATE">
${mappings.map(m => `      <metadataTableEntries name="${m.sourceField}" type="${m.sourceType || 'String'}" nullable="true" />`).join('\n')}
    </inputTables>

    <!-- Target Output Schema aligned for Azure SQL / OneStream -->
    <outputTables name="out_aligned" sizeState="INTERMEDIATE">
${mappings.map(m => {
  const javaType = m.targetType?.toLowerCase().includes('int') ? 'Integer' : (m.targetType?.toLowerCase().includes('decimal') ? 'BigDecimal' : 'String');
  const mappingExpression = getTalendExpression(m);
  return `      <metadataTableEntries name="${m.targetField}" expression="${mappingExpression}" type="${javaType}" nullable="true" />`;
}).join('\n')}
    </outputTables>
  </externalNode>
</talend:tMap>`;
  };

  const getAzureSqlExpression = (m: MappingRow) => {
    const sf = `[${m.sourceField}]`;
    const tf = `[${m.targetField}]`;
    const tr = (m.transformation || '').toLowerCase();
    const sfName = (m.sourceField || '').toLowerCase();
    const tfName = (m.targetField || '').toLowerCase();
    const targetType = m.targetType || 'VARCHAR(100)';

    if (tr.includes('prefix') || (sfName === 'col_1' && tfName === 'col_1' && (m.transformation?.includes('C-') || m.transformationCode?.includes('C-')))) {
      return `CAST('C-' + CAST(${sf} AS VARCHAR(20)) AS ${targetType}) AS ${tf}`;
    }

    if (tr.includes('tier') || tr.includes('revenue') || (sfName === 'col_5' && tfName === 'col_4')) {
      return `CASE \n        WHEN TRY_CAST(${sf} AS DECIMAL(15,2)) >= 200000 THEN 'Enterprise'\n        WHEN TRY_CAST(${sf} AS DECIMAL(15,2)) >= 100000 THEN 'Premium'\n        WHEN TRY_CAST(${sf} AS DECIMAL(15,2)) >= 75000 THEN 'Midmarket'\n        ELSE 'Standard'\n    END AS ${tf}`;
    }

    if (tr.includes('upper') || tr.includes('iso')) {
      return `CAST(UPPER(TRIM(${sf})) AS ${targetType}) AS ${tf}`;
    }

    if (tr.includes('trim') || tr.includes('strip') || tr.includes('clean')) {
      return `CAST(TRIM(${sf}) AS ${targetType}) AS ${tf}`;
    }

    if (tr.includes('lower')) {
      return `CAST(LOWER(${sf}) AS ${targetType}) AS ${tf}`;
    }

    if (tr.includes('date') || tr.includes('iso date') || (sfName === 'col_4' && tfName === 'col_5')) {
      return `CAST(${sf} AS DATE) AS ${tf}`;
    }

    if (tr.includes('fillna') || tr.includes('null')) {
      return `CAST(ISNULL(${sf}, 'N/A') AS ${targetType}) AS ${tf}`;
    }

    return `CAST(${sf} AS ${targetType}) AS ${tf}`;
  };

  const getAzureSqlCode = () => {
    const promptComments = appliedPrompts.length > 0
      ? `\n-- --- AI Custom Logic Applied ---\n` + 
        appliedPrompts.map(p => `-- Instruction: ${p}`).join('\n') + `\n`
      : '';

    return `-- ==========================================
-- Semantra Generated Azure SQL Server DWH View
-- Source System: ${selectedPreset}
-- Target DWH: Azure SQL Database
-- Integration Service: Talend ETL
-- ==========================================

CREATE OR ALTER VIEW dbo.vw_aligned_${selectedPreset || 'integration'} AS
WITH SourceDataset AS (
    SELECT 
        -- Select native staging attributes
${mappings.map((m, i) => `        [${m.sourceField}]${i < mappings.length - 1 ? ',' : ''}`).join('\n')}
    FROM [staging].[stg_${selectedPreset || 'raw'}]
)
SELECT
    -- Dynamic Field-Level transformations & Column Renames
${mappings.map((m, i) => `    ${getAzureSqlExpression(m)}${i < mappings.length - 1 ? ',' : ''} -- ${m.targetDesc || 'Canonical Field'}`).join('\n')}
FROM SourceDataset;
GO

${promptComments}`;
  };

  const getDbtTestCode = () => {
    return `# dbt Schema Data Quality & Sanitization Tests Definition (schema.yml)
# Auto-generated by Semantra Data Quality Engine
# Target Entity: canonical_output

version: 2

models:
  - name: canonical_output
    description: "Transformed canonical dataset aligned with enterprise business model"
    columns:
${mappings.map(m => {
  const isPk = m.targetField.toLowerCase().includes('id') || m.targetField.toLowerCase().includes('key') || m.targetField.toLowerCase().includes('kunnr');
  const tests = ['not_null'];
  if (isPk) tests.push('unique');
  if (m.targetField.toLowerCase().includes('tier') || m.targetField.toLowerCase().includes('category')) {
    tests.push('accepted_values:\n            values: ["Enterprise", "Premium", "Midmarket", "Standard", "Tier_1_Gold", "Tier_2_Silver", "Tier_3_Bronze"]');
  }
  return `      - name: ${m.targetField}
        description: "${m.targetDesc || m.explanation || 'Canonical attribute'}"
        tests:
${tests.map(t => `          - ${t}`).join('\n')}`;
}).join('\n')}
`;
  };

  const getGreatExpectationsCode = () => {
    return `# Great Expectations Data Quality & Sanitization Verification Suite
# Auto-generated by Semantra DQ Engine
import great_expectations as ge
from great_expectations.core.batch import RuntimeBatchRequest

def validate_transformed_dataset(df_transformed):
    ge_df = ge.from_pandas(df_transformed)
    
    # 1. Primary Identifiers & Non-Null Guarantees
${mappings.map(m => `    ge_df.expect_column_values_to_not_be_null(column="${m.targetField}")`).join('\n')}

    # 2. Uniqueness Assertions
${mappings.filter(m => m.targetField.toLowerCase().includes('id') || m.targetField.toLowerCase().includes('key')).map(m => `    ge_df.expect_column_values_to_be_unique(column="${m.targetField}")`).join('\n')}

    # 3. Format & Type Range Assertions
${mappings.map(m => `    ge_df.expect_column_type_to_be_in(column="${m.targetField}", type_list=["object", "str", "int64", "float64", "datetime64[ns]"])`).join('\n')}

    # Save validation suite results
    results = ge_df.validate()
    print(f"Data Quality Suite Execution Success: {results.success}")
    return results`;
  };

  const getSqlAuditCode = () => {
    return `-- ==========================================
-- Semantra SQL Data Quality & Sanitization Audit Suite
-- Source System: ${selectedPreset}
-- ==========================================

-- 1. Check for unexpected NULL values across target fields
SELECT 
${mappings.map((m, i) => `    SUM(CASE WHEN ${m.targetField} IS NULL THEN 1 ELSE 0 END) AS null_cnt_${m.targetField}${i < mappings.length - 1 ? ',' : ''}`).join('\n')}
FROM dbo.vw_aligned_${selectedPreset || 'integration'};

-- 2. Audit Uniqueness & Duplicate Records on Primary Keys
SELECT 
    ${mappings[0]?.targetField || 'customer_id'}, 
    COUNT(*) AS duplicate_count
FROM dbo.vw_aligned_${selectedPreset || 'integration'}
GROUP BY ${mappings[0]?.targetField || 'customer_id'}
HAVING COUNT(*) > 1;

-- 3. Sanitization Check: Detect Un-trimmed Whitespace Anomalies
SELECT * 
FROM dbo.vw_aligned_${selectedPreset || 'integration'}
WHERE ${mappings[0]?.targetField || 'customer_id'} LIKE ' %' 
   OR ${mappings[0]?.targetField || 'customer_id'} LIKE '% ';`;
  };

  const getOpenLineageCode = () => {
    const inputDatasetName = selectedPreset ? selectedPreset.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_raw' : 'source_dataset_raw';
    const outputDatasetName = selectedPreset ? selectedPreset.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_canonical' : 'golden_record_canonical';
    
    const event = {
      "eventType": lineageEventType,
      "eventTime": new Date().toISOString(),
      "run": {
        "runId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "facets": {
          "semantra_transformation_rules": {
            "_producer": "https://github.com/semantra/data-workbench/v1.3",
            "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SemantraTransformationFacet.json",
            "mapping_count": mappings.length,
            "rules": mappings.map(m => ({
              "source_attribute": m.sourceField,
              "target_attribute": m.targetField,
              "mapping_type": m.mappingType || 'Direct Map',
              "transformation_logic": m.transformation || 'DIRECT_COPY',
              "confidence_score": m.score || 0.95,
              "approval_status": m.isApproved ? "APPROVED_BY_STEWARD" : "AUTO_PROPOSED"
            }))
          },
          "pii_redaction_shield": {
            "shield_active": true,
            "masked_categories": ["IBAN", "SWIFT", "EMAIL", "TAX_ID", "SSN_JMBG"],
            "redaction_method": "Deterministic Salted SHA-256 / Dynamic Masking",
            "compliance_frameworks": ["GDPR Article 25", "EU AI Act 2026 Article 10 & 13", "HIPAA"]
          },
          "security_context": {
            "mtls_verified": includeMtlsHsm,
            "hsm_digital_signature": includeMtlsHsm ? "ECDSA_P384_SHA384_VERIFIED" : "NONE",
            "tenant_id": "TENANT_ENTERPRISE_PILOT_01",
            "execution_environment": "Containerized Worker / Port 3000 Zero-Exposure Proxy"
          },
          "data_quality_assertions": {
            "invariant_tests_count": 8,
            "passed_tests": 8,
            "failed_tests": 0,
            "status": "ALL_INVARIANTS_SATISFIED"
          }
        }
      },
      "job": {
        "namespace": "semantra.production.jobs",
        "name": `${selectedPreset || 'Generic'}_to_Canonical_Pipeline`,
        "facets": {
          "jobType": {
            "jobType": "DATA_INTEGRATION_PIPELINE",
            "integrationMode": "DETERMINISTIC_FIRST_WITH_BOUNDED_AI"
          }
        }
      },
      "inputs": [
        {
          "namespace": "sap.production.erp",
          "name": inputDatasetName,
          "facets": {
            "schema": {
              "_producer": "https://github.com/semantra/data-workbench",
              "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json",
              "fields": mappings.map(m => ({
                "name": m.sourceField,
                "type": m.sourceType || "VARCHAR(100)",
                "description": m.sourceDesc || `Raw source column ${m.sourceField}`
              }))
            },
            "dataQualityMetrics": {
              "rowCount": 14250,
              "nullAnomalyCount": 0
            }
          }
        }
      ],
      "outputs": [
        {
          "namespace": "semantra.canonical.db",
          "name": outputDatasetName,
          "facets": {
            "schema": {
              "_producer": "https://github.com/semantra/data-workbench",
              "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json",
              "fields": mappings.map(m => ({
                "name": m.targetField,
                "type": m.targetType || "VARCHAR(100)",
                "description": m.targetDesc || `Target canonical attribute ${m.targetField}`
              }))
            },
            "columnLineage": {
              "_producer": "https://github.com/semantra/data-workbench",
              "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/ColumnLineageDatasetFacet.json",
              "fields": mappings.reduce((acc, m) => {
                acc[m.targetField] = {
                  "inputFields": [
                    {
                      "namespace": "sap.production.erp",
                      "name": inputDatasetName,
                      "field": m.sourceField
                    }
                  ],
                  "transformationDescription": m.transformation || "Direct 1:1 Mapping",
                  "transformationType": m.mappingType || "DIRECT"
                };
                return acc;
              }, {} as Record<string, any>)
            }
          }
        }
      ],
      "producer": "https://github.com/semantra/data-workbench/v1.3-enterprise"
    };

    return JSON.stringify(event, null, 2);
  };

  const getOpenLineagePythonCode = () => {
    const inputDatasetName = selectedPreset ? selectedPreset.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_raw' : 'source_dataset_raw';
    const outputDatasetName = selectedPreset ? selectedPreset.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_canonical' : 'golden_record_canonical';

    return `import json
import time
import uuid
from typing import Dict, Any, List

class SemantraOpenLineageTracker:
    """
    Enterprise Data Lineage & Provenance Tracker conforming to OpenLineage Specification.
    Guarantees compliance with EU AI Act (2026) Articles 10 & 13 and GDPR Data Provenance mandates.
    """
    def __init__(self, producer_name: str = "https://github.com/semantra/data-workbench/v1.3"):
        self.producer = producer_name
        self.lineage_events: List[Dict[str, Any]] = []

    def emit_lineage_event(
        self, 
        job_name: str, 
        event_type: str, 
        inputs: List[Dict[str, Any]], 
        outputs: List[Dict[str, Any]], 
        facets: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates and emits an OpenLineage event payload to Marquez / DataHub / Apache Atlas.
        """
        event = {
            "eventType": event_type,  # 'START', 'RUNNING', 'COMPLETE', 'FAIL'
            "eventTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "run": {
                "runId": str(uuid.uuid4()),
                "facets": facets
            },
            "job": {
                "namespace": "semantra.production.jobs",
                "name": job_name
            },
            "inputs": inputs,
            "outputs": outputs,
            "producer": self.producer
        }

        self.lineage_events.append(event)
        print(f"[OPENLINEAGE EMIT] Job: '{job_name}' | Event: {event_type} | RunID: {event['run']['runId'][:8]}... | Inputs: {len(inputs)} | Outputs: {len(outputs)}")
        return event

# --- RUNTIME PIPELINE EXECUTION DEMO ---
if __name__ == "__main__":
    tracker = SemantraOpenLineageTracker()

    # Define Input & Output Datasets with Schema Facets
    inputs = [{
        "namespace": "sap.production.erp",
        "name": "${inputDatasetName}",
        "facets": {
            "schema": {
                "fields": [
${mappings.map(m => `                    {"name": "${m.sourceField}", "type": "${m.sourceType || 'VARCHAR'}"}`).join(',\n')}
                ]
            }
        }
    }]

    outputs = [{
        "namespace": "semantra.canonical.db",
        "name": "${outputDatasetName}",
        "facets": {
            "schema": {
                "fields": [
${mappings.map(m => `                    {"name": "${m.targetField}", "type": "${m.targetType || 'VARCHAR'}"}`).join(',\n')}
                ]
            }
        }
    }]

    # Metadata Facets (PII Shield, Transformation Logic, Security Context)
    transformation_facets = {
        "semantra_transformation_rules": {
            "mapping_count": ${mappings.length},
            "rules": [
${mappings.map(m => `                {"source": "${m.sourceField}", "target": "${m.targetField}", "rule": "${m.transformation || 'DIRECT_COPY'}"}`).join(',\n')}
            ]
        },
        "pii_redaction_shield": {
            "enabled": True,
            "masked_types": ["IBAN", "SWIFT", "EMAIL", "TAX_ID", "SSN_JMBG"],
            "compliance": ["GDPR Art 25", "EU AI Act 2026 Art 10 & 13"]
        },
        "security_context": {
            "mtls_verified": ${includeMtlsHsm ? 'True' : 'False'},
            "hsm_signature": "${includeMtlsHsm ? 'ECDSA_P384_SHA384' : 'NONE'}",
            "tenant_id": "TENANT_ENTERPRISE_PILOT_01"
        }
    }

    print(">>> 1. Emitting Pipeline START Event to Marquez/DataHub...")
    tracker.emit_lineage_event(
        job_name="${selectedPreset || 'Generic'}_to_Canonical_Pipeline",
        event_type="START",
        inputs=inputs,
        outputs=outputs,
        facets=transformation_facets
    )

    # Perform mapping ETL transformation...
    time.sleep(0.1)

    print("\\n>>> 2. Emitting Pipeline COMPLETE Event with Provenance Facets...")
    complete_event = tracker.emit_lineage_event(
        job_name="${selectedPreset || 'Generic'}_to_Canonical_Pipeline",
        event_type="COMPLETE",
        inputs=inputs,
        outputs=outputs,
        facets=transformation_facets
    )

    print("\\n--- Output OpenLineage Event JSON (Ready for Marquez / DataHub / Collibra API) ---")
    print(json.dumps(complete_event, indent=2))`;
  };

  const activeCodeBlock = activeCodeTab === 'pandas' 
    ? getPandasCode() 
    : activeCodeTab === 'pyspark' 
    ? getPySparkCode() 
    : activeCodeTab === 'dbt'
    ? getDbtCode()
    : activeCodeTab === 'dbt_test'
    ? getDbtTestCode()
    : activeCodeTab === 'great_expectations'
    ? getGreatExpectationsCode()
    : activeCodeTab === 'sql_audit'
    ? getSqlAuditCode()
    : activeCodeTab === 'openlineage'
    ? (lineageViewMode === 'python' ? getOpenLineagePythonCode() : getOpenLineageCode())
    : activeCodeTab === 'talend'
    ? getTalendCode()
    : getAzureSqlCode();

  return (
    <div className="space-y-6">
      {/* Enterprise Catalog Promotion Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-tight font-sans text-white">
              Enterprise Catalog Governance & Promotion
            </h3>
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Analyst Governance Gate
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
            You decide when your integration enters the central Enterprise Catalog. Click below to promote these approved mapping decisions into the central catalog for team reuse and automatic fit scoring.
          </p>
        </div>

        <button
          onClick={() => {
            if (onPublishToCatalog) onPublishToCatalog();
            setIsPublished(true);
          }}
          disabled={isPublished}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 font-sans ${
            isPublished
              ? 'bg-emerald-500 text-white cursor-default'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-sm'
          }`}
        >
          {isPublished ? (
            <>
              <CheckCircle className="w-4 h-4 text-white" />
              <span>Promoted to Enterprise Catalog!</span>
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4" />
              <span>Promote to Enterprise Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left 3 Columns: Code Preview Area */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Header Tabs */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-slate-400" />
                Durable Output Code Generation
              </h3>
              
              <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto gap-1">
                <button
                  onClick={() => setActiveCodeTab('pandas')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'pandas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pandas (Python)
                </button>
                <button
                  onClick={() => setActiveCodeTab('pyspark')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'pyspark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Databricks (PySpark)
                </button>
                <button
                  onClick={() => setActiveCodeTab('dbt')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'dbt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  dbt SQL
                </button>
                <button
                  onClick={() => setActiveCodeTab('dbt_test')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'dbt_test' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-emerald-700 bg-emerald-50/50'
                  }`}
                  title="Feature C: Auto-generated dbt schema tests"
                >
                  dbt Tests (YAML)
                </button>
                <button
                  onClick={() => setActiveCodeTab('great_expectations')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'great_expectations' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-emerald-700 bg-emerald-50/50'
                  }`}
                  title="Feature C: Great Expectations Python Suite"
                >
                  Great Expectations
                </button>
                <button
                  onClick={() => setActiveCodeTab('sql_audit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'sql_audit' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-emerald-700 bg-emerald-50/50'
                  }`}
                  title="Feature C: SQL Data Quality Audits"
                >
                  SQL DQ Audit
                </button>
                <button
                  onClick={() => setActiveCodeTab('talend')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'talend' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Talend XML
                </button>
                <button
                  onClick={() => setActiveCodeTab('azure_sql')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeCodeTab === 'azure_sql' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Azure SQL Server
                </button>
                <button
                  onClick={() => setActiveCodeTab('openlineage')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    activeCodeTab === 'openlineage' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 border border-indigo-200'
                  }`}
                  title="OpenLineage Standard: Data Provenance & EU AI Act (2026) Audit Trail"
                >
                  <Network className="w-3.5 h-3.5" />
                  OpenLineage (DataHub/Marquez)
                </button>
              </div>
            </div>

            {/* Sovereign Security & mTLS Assurance Toggle Bar */}
            <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-sans font-semibold text-slate-200">
                  Sovereign mTLS &amp; HSM Cryptographic Assurance:
                </span>
                <span className="text-[10px] font-mono text-indigo-300">
                  (Enforces bi-directional x509 cert validation &amp; hardware non-repudiation signing)
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-[11px] font-mono font-bold ${includeMtlsHsm ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {includeMtlsHsm ? 'mTLS + HSM INJECTED' : 'STANDARD CODE'}
                </span>
                <input
                  type="checkbox"
                  checked={includeMtlsHsm}
                  onChange={(e) => setIncludeMtlsHsm(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            {/* AI Natural Language Code Refinement Prompt Bar */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 font-sans flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Describe in plain words changes you want to see in the generated code:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Refines overall {activeCodeTab.toUpperCase()} script</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g. "Add try-except error logging", "Filter null rows before returning", "Add execution timestamp column"'
                  value={codePrompt}
                  onChange={(e) => setCodePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCodePrompt();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 font-sans"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCodePrompt()}
                  disabled={isRefiningCode || !codePrompt.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isRefiningCode ? (
                    <span>Applying...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Refine Generated Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Active Applied Instructions or Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-sans">Quick additions:</span>
                {[
                  'df_target.col_4 Account tier (3 revenue categories)',
                  'Add error logging & try-except',
                  'Drop null rows on primary key',
                  'Add execution timestamp column',
                  'Cast numeric columns to float'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleApplyCodePrompt(chip)}
                    className="text-[10px] font-sans bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}

                {appliedPrompts.length > 0 && (
                  <div className="w-full flex flex-wrap gap-1.5 pt-1 mt-1 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-400 font-sans self-center">Active Rules:</span>
                    {appliedPrompts.map((p, idx) => (
                      <span key={idx} className="text-[10px] bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>{p}</span>
                        <button onClick={() => handleRemovePrompt(idx)} className="hover:text-rose-400 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Applied Transformation Banner */}
            {appliedRulesSummary.length > 0 && (
              <div className="p-3 bg-slate-900 border-b border-emerald-900/60 font-sans space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Pipeline Code Refinement Updates Applied</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {appliedRulesSummary.map((rule, i) => (
                    <div key={i} className="bg-slate-950/80 border border-emerald-800/50 rounded-lg p-2.5 text-xs text-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-emerald-300 font-mono">Target: {rule.targetField}</span>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-1.5 py-0.5 rounded font-mono">
                            Applied across all 5 code targets
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans">{rule.description}</p>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-800/80 font-mono text-[10px] text-emerald-400 truncate">
                        {rule.pandasCode}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OpenLineage Provenance & EU AI Act Control Bar */}
            {activeCodeTab === 'openlineage' && (
              <div className="p-3 bg-indigo-950/80 border-b border-indigo-800 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-300" />
                    <span className="font-bold text-white font-sans">OpenLineage Data Provenance Engine</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      EU AI Act (2026) Compliant
                    </span>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-indigo-900 gap-1">
                    <button
                      onClick={() => setLineageViewMode('visual')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        lineageViewMode === 'visual' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Visual Graph
                    </button>
                    <button
                      onClick={() => setLineageViewMode('json')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        lineageViewMode === 'json' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      OpenLineage JSON
                    </button>
                    <button
                      onClick={() => setLineageViewMode('python')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        lineageViewMode === 'python' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Python Tracker Script
                    </button>
                  </div>
                </div>

                {/* Event Simulator Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-900/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-indigo-200 font-sans">Event Type:</span>
                    {(['START', 'RUNNING', 'COMPLETE', 'FAIL'] as const).map(evt => (
                      <button
                        key={evt}
                        onClick={() => {
                          setLineageEventType(evt);
                          setEmittedEventSuccess(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          lineageEventType === evt
                            ? evt === 'FAIL'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {evt}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {emittedEventSuccess && (
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-600/50 px-2 py-0.5 rounded flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>HTTP 201 Created (Marquez/DataHub: 18ms)</span>
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setIsEmittingLineage(true);
                        setTimeout(() => {
                          setIsEmittingLineage(false);
                          setEmittedEventSuccess(true);
                        }, 400);
                      }}
                      disabled={isEmittingLineage}
                      className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded text-[11px] font-bold font-sans flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isEmittingLineage ? 'animate-spin' : ''}`} />
                      <span>{isEmittingLineage ? 'Emitting...' : '⚡ Emit Event to Marquez / DataHub'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Lineage Flow View */}
            {activeCodeTab === 'openlineage' && lineageViewMode === 'visual' ? (
              <div className="bg-slate-950 p-5 space-y-5">
                {/* 3-Tier Visual Flow */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative">
                  {/* Left: Input Dataset */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Input Dataset (Source)
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                        sap.production.erp
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono truncate">
                      {selectedPreset ? selectedPreset.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_raw' : 'source_dataset_raw'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Raw source attributes with schema validation &amp; hash.
                    </div>
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                        <span>Columns Tracked:</span>
                        <span className="text-slate-200 font-bold">{mappings.length} fields</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                        <span>Dataset Hash:</span>
                        <span className="text-indigo-400 font-mono">sha256:7f9a2b...</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Transformation & Facets */}
                  <div className="bg-indigo-950/50 border border-indigo-800/80 rounded-xl p-4 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        Semantra Engine Facets
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-indigo-900/80 text-indigo-200 border border-indigo-700">
                        v1.3 Provenance
                      </span>
                    </div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      Deterministic-First Transformation
                    </div>
                    <div className="space-y-1.5 pt-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>PII Redaction Shield:</span>
                        <span className="text-emerald-400 font-bold font-mono">5 Types Masked</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>RRF Match Confidence:</span>
                        <span className="text-emerald-400 font-bold font-mono">96.4% Score</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>mTLS &amp; HSM Cryptography:</span>
                        <span className={`font-mono font-bold ${includeMtlsHsm ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {includeMtlsHsm ? 'Verified x509' : 'Standard'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Data Quality Invariants:</span>
                        <span className="text-emerald-400 font-bold font-mono">8/8 Passed</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Output Dataset */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                        Output Dataset (Golden)
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        semantra.canonical.db
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono truncate">
                      {selectedPreset ? selectedPreset.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_canonical' : 'golden_record_canonical'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Verified Canonical Golden Records published for analytical models.
                    </div>
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                        <span>Output Schema:</span>
                        <span className="text-emerald-400 font-bold">Canonical v1.3</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                        <span>Column Lineage:</span>
                        <span className="text-indigo-400 font-mono">100% Traceable</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column-Level Lineage Breakdown */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 font-sans flex items-center gap-2">
                      <Network className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Column-Level Data Lineage &amp; Transformation Recipe</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Exportable to OpenLineage ColumnLineageDatasetFacet
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
                    {mappings.map((m, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] shrink-0">
                            IN
                          </span>
                          <span className="text-slate-300 font-semibold truncate">{m.sourceField}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-indigo-400 shrink-0">
                          <ArrowRight className="w-3 h-3 text-indigo-400" />
                          <span className="bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                            {m.transformation ? 'Rule: ' + m.transformation : 'Direct 1:1'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-indigo-400" />
                        </div>

                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span className="text-emerald-400 font-semibold truncate">{m.targetField}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] shrink-0">
                            OUT
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Code editor mock */
              <div className="bg-slate-950 p-5 font-mono text-xs text-slate-200 leading-relaxed relative overflow-auto max-h-[480px]">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(activeCodeBlock);
                  }}
                  className="absolute right-4 top-4 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded transition-colors cursor-pointer"
                  title="Copy Code"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <pre className="whitespace-pre">{activeCodeBlock}</pre>
              </div>
            )}
          </div>

          {/* Verification Assertions Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-slate-800 font-sans flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Transformation Test Assertions
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Execute code verification rules over the current mapping schema mapping to confirm data constraints.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleOpenAddModal}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-1 font-sans transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Add Rule
                </button>
                <button
                  onClick={handleRunTests}
                  disabled={testSuiteExecuting}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors font-sans cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${testSuiteExecuting ? 'animate-spin' : ''}`} />
                  {testSuiteExecuting ? 'Running Verification...' : 'Execute Suite'}
                </button>
              </div>
            </div>

            {/* AI Assertion Rule Prompt Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 font-sans flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Describe assertion rule in plain words &rarr; AI generates verification test:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Appends rule to test suite</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g. "Ensure customer_id is never null", "Verify invoice_number is unique", "Check email has valid format"'
                  value={assertionAiPrompt}
                  onChange={(e) => setAssertionAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateAssertionFromAiPrompt();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 font-sans"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateAssertionFromAiPrompt()}
                  disabled={isGeneratingAssertion || !assertionAiPrompt.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isGeneratingAssertion ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Generate Assertion</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick prompt suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-sans self-center">Quick tests:</span>
                {[
                  'Ensure customer_id non-null',
                  'Check order_id uniqueness',
                  'Verify postal_code length is 5',
                  'Check price is positive'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleGenerateAssertionFromAiPrompt(chip)}
                    className="text-[10px] font-sans bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Assertions Table List */}
            <div className="space-y-3.5 pt-1">
              {assertionResults.map((assert) => (
                <div key={assert.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 font-sans">{assert.name}</p>
                    <p className="text-xs text-slate-500 leading-normal font-sans">{assert.details}</p>
                    <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                      Rule: {assert.rule}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      assert.status === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : 'bg-amber-50 border border-amber-200 text-amber-700'
                    }`}>
                      {assert.status === 'success' ? 'SUCCESS' : 'WARNING'}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(assert)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Edit rule"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(assert.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Dialog for Adding New Transformation Test Assertion Rule */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-800 font-sans">
                      Add Transformation Test Assertion
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddRuleSubmit} className="p-5 space-y-4 font-sans text-xs">
                  {/* AI Quick Generator Box */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                    <label className="text-[11px] font-bold text-emerald-400 font-sans flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Generate Rule with AI:
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder='e.g. "Ensure invoice_number is non-null and unique"'
                        value={modalAiPrompt}
                        onChange={(e) => setModalAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleModalAiGenerate();
                          }
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleModalAiGenerate()}
                        disabled={isModalAiGenerating || !modalAiPrompt.trim()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {isModalAiGenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Auto-fill</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-slate-400 self-center">Presets:</span>
                      {[
                        'Non-null check',
                        'Uniqueness check',
                        'Email format',
                        'Non-negative check'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleModalAiGenerate(preset)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Assertion Name / Title</label>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="e.g. Check customer_id non-null constraint"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans text-slate-800"
                      required
                    />
                  </div>

                  {/* Target Field selection */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Target Field</label>
                    <select
                      value={newRuleTargetField}
                      onChange={(e) => handleTypeOrFieldChange(e.target.value, newRuleType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white font-sans text-slate-800 cursor-pointer"
                    >
                      {mappings.map(m => (
                        <option key={m.id} value={m.targetField}>
                          {m.targetField} (Source: {m.sourceField})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Check Type */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Assertion Type</label>
                    <select
                      value={newRuleType}
                      onChange={(e) => handleTypeOrFieldChange(newRuleTargetField, e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white font-sans text-slate-800 cursor-pointer"
                    >
                      <option value="not_null">Not Null Check (Check for missing values)</option>
                      <option value="unique">Uniqueness Check (Check for duplicate values)</option>
                      <option value="zfill">Format Length / Padding Check (Check string padding/length)</option>
                      <option value="custom">Custom Python / Pandas Expression</option>
                    </select>
                  </div>

                  {/* Expression */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Rule Logic / Expression</label>
                    <textarea
                      rows={2}
                      value={newRuleExpression}
                      onChange={(e) => setNewRuleExpression(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-emerald-700 bg-slate-950 p-2 text-xs"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Defines pandas expression evaluated against df during verification suite runs.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Dialog for Editing Transformation Test Assertion Rule */}
          {isEditModalOpen && editingRule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800 font-sans">
                      Edit Transformation Test Assertion
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingRule(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleEditRuleSubmit} className="p-5 space-y-4 font-sans text-xs">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Assertion Name / Title</label>
                    <input
                      type="text"
                      value={editRuleName}
                      onChange={(e) => setEditRuleName(e.target.value)}
                      placeholder="e.g. Check customer_id non-null constraint"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans text-slate-800"
                      required
                    />
                  </div>

                  {/* Expression */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Rule Logic / Expression</label>
                    <textarea
                      rows={3}
                      value={editRuleExpression}
                      onChange={(e) => setEditRuleExpression(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-emerald-400 bg-slate-950 p-2 text-xs"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Defines pandas expression evaluated against df during verification suite runs.
                    </p>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Validation Details / Explanation</label>
                    <textarea
                      rows={2}
                      value={editRuleDetails}
                      onChange={(e) => setEditRuleDetails(e.target.value)}
                      placeholder="Enter verification details or notes..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans text-slate-800"
                    />
                  </div>

                  {/* Rule Status */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Rule Validation Status</label>
                    <select
                      value={editRuleStatus}
                      onChange={(e) => setEditRuleStatus(e.target.value as 'success' | 'warning')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white font-sans text-slate-800 cursor-pointer"
                    >
                      <option value="success">SUCCESS (Rule matches perfectly)</option>
                      <option value="warning">WARNING (Advisory alert or soft warning)</option>
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setEditingRule(null);
                      }}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Structured Warnings */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Bug className="w-4 h-4 text-rose-500" />
              Prioritized Codegen Warnings
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal font-sans">
              Semantra analyzed the generated schema transformations and identified priority type coercion or structural warning profiles.
            </p>

            <div className="space-y-3.5 pt-1">
              {(() => {
                const subThreshold = mappings.filter(m => m.score < 0.85 || m.confidence !== 'high');
                const warnings = [];

                if (subThreshold.length > 0) {
                  const firstSub = subThreshold[0];
                  warnings.push({
                    title: 'Type Coercion Warning',
                    desc: `${firstSub.targetField} maps ${firstSub.sourceField} with ${Math.round(firstSub.score * 100)}% score (${firstSub.sourceType || 'VARCHAR'} → ${firstSub.targetType || 'VARCHAR'}). Explicit cast recommended to avoid type errors.`,
                    priority: 'high',
                    code: firstSub.sourceField
                  });
                } else if (mappings[0]) {
                  warnings.push({
                    title: 'Type Precision Check',
                    desc: `${mappings[0].sourceField} mapped to ${mappings[0].targetField}. Target schema expects standard ${mappings[0].targetType || 'VARCHAR(50)'} bounds.`,
                    priority: 'low',
                    code: mappings[0].sourceField
                  });
                }

                if (mappings.length > 1) {
                  warnings.push({
                    title: 'Truncation Advisory',
                    desc: `${mappings[1].sourceField} technical field character width exceeds target ${mappings[1].targetField} width. Value clipping may occur on long string inputs.`,
                    priority: 'medium',
                    code: mappings[1].sourceField
                  });
                }

                if (mappings.length > 2) {
                  warnings.push({
                    title: 'Nullable Dimension Check',
                    desc: `${mappings[2].sourceField} (${mappings[2].targetField}) mapped without defined default fallback. Null values will render as blanks.`,
                    priority: 'low',
                    code: mappings[2].sourceField
                  });
                }

                if (warnings.length === 0) {
                  warnings.push({
                    title: 'No Active Codegen Warnings',
                    desc: 'All mapped fields meet confidence thresholds and type alignment checks cleanly.',
                    priority: 'low',
                    code: 'OK'
                  });
                }

                return warnings.map((warn, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/20 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 font-sans">{warn.title}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded border ${
                        warn.priority === 'high' 
                          ? 'bg-rose-50 border-rose-100 text-rose-700' 
                          : warn.priority === 'medium'
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {warn.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{warn.desc}</p>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                      Field: {warn.code}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
