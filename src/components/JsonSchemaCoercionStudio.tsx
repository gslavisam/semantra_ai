import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileCheck, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  Code2, 
  Zap,
  HelpCircle
} from 'lucide-react';

interface JsonSchemaFieldRule {
  name: string;
  expectedType: 'string' | 'float' | 'integer' | 'iso_date' | 'boolean';
  required: boolean;
  minVal?: number;
  formatDescription: string;
}

interface CoercionDetail {
  field: string;
  originalRawValue: any;
  originalRawType: string;
  coercedValue: any;
  coercedType: string;
  transformationRule: string;
  status: 'COERCED_SAFE' | 'EXACT_MATCH' | 'COERCION_FAILED';
}

interface ValidationReport {
  isValid: boolean;
  totalFieldsEvaluated: number;
  coercedCount: number;
  errorCount: number;
  errors: string[];
  coercionDetails: CoercionDetail[];
  finalCleanPayload: Record<string, any>;
  dbtSqlSnippet: string;
  pysparkSnippet: string;
}

const INVOICE_SCHEMA_CONTRACT: JsonSchemaFieldRule[] = [
  { name: 'invoice_id', expectedType: 'string', required: true, formatDescription: 'Standard string identifier (e.g. INV-2026-8800)' },
  { name: 'vendor_tax_id', expectedType: 'string', required: true, formatDescription: 'National VAT/PIB tax number' },
  { name: 'amount', expectedType: 'float', required: true, minVal: 0.01, formatDescription: 'Numeric positive invoice total. Cast from string if numeric.' },
  { name: 'discount_pct', expectedType: 'float', required: false, minVal: 0, formatDescription: 'Optional percentage discount (0.0 to 1.0)' },
  { name: 'issue_date', expectedType: 'iso_date', required: true, formatDescription: 'Normalized ISO-8601 Timestamp (YYYY-MM-DDTHH:MM:SSZ)' },
  { name: 'is_tax_exempt', expectedType: 'boolean', required: false, formatDescription: 'Boolean flag. Coerced from "Y"/"N", "1"/"0", "true"/"false"' }
];

const PRESET_MESSAGES = [
  {
    name: 'Scenario 1: Legacy ERP String Types (Safe Strict Coercion)',
    description: 'Legacy SAP sending `"14500.75"` as String, `"31.08.2026"` date, and `"Y"` boolean flag.',
    payload: JSON.stringify({
      invoice_id: "INV-2026-8800",
      vendor_tax_id: "RS100223344",
      amount: "14500.75",
      discount_pct: "0.05",
      issue_date: "31.08.2026",
      is_tax_exempt: "Y"
    }, null, 2)
  },
  {
    name: 'Scenario 2: Malformed Payload (Negative Amount & Invalid Date Format)',
    description: 'String amount `"-500.00"` violating positive invariant and corrupt date format.',
    payload: JSON.stringify({
      invoice_id: "INV-2026-8801",
      vendor_tax_id: "RS100223344",
      amount: "-500.00",
      issue_date: "invalid-date-format",
      is_tax_exempt: "UNKNOWN"
    }, null, 2)
  },
  {
    name: 'Scenario 3: 100% Clean Canonical Payload (Strict Match)',
    description: 'Payload already strictly conforming to ISO and native float types.',
    payload: JSON.stringify({
      invoice_id: "INV-2026-8802",
      vendor_tax_id: "RS100223344",
      amount: 14500.75,
      discount_pct: 0.05,
      issue_date: "2026-08-31T00:00:00Z",
      is_tax_exempt: true
    }, null, 2)
  }
];

export const JsonSchemaCoercionStudio: React.FC = () => {
  const [schemaContract] = useState<JsonSchemaFieldRule[]>(INVOICE_SCHEMA_CONTRACT);
  const [rawInput, setRawInput] = useState<string>(PRESET_MESSAGES[0].payload);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'dbt_sql' | 'pyspark' | 'python_engine'>('dbt_sql');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const runValidationAndCoercion = () => {
    try {
      const raw = JSON.parse(rawInput);
      const errors: string[] = [];
      const coercionDetails: CoercionDetail[] = [];
      const cleanPayload: Record<string, any> = {};

      schemaContract.forEach(rule => {
        const hasKey = rule.name in raw && raw[rule.name] !== null && raw[rule.name] !== undefined;

        if (rule.required && !hasKey) {
          errors.push(`Missing required invariant field: '${rule.name}'`);
          return;
        }

        if (!hasKey) return;

        const rawVal = raw[rule.name];
        const rawType = typeof rawVal;

        // Type Coercion logic
        if (rule.expectedType === 'float' || rule.expectedType === 'integer') {
          if (typeof rawVal === 'number') {
            if (rule.minVal !== undefined && rawVal < rule.minVal) {
              errors.push(`Field '${rule.name}' (${rawVal}) is below minimum threshold of ${rule.minVal}`);
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: rawType,
                coercedValue: rawVal,
                coercedType: 'number (invalid)',
                transformationRule: `Violates minVal >= ${rule.minVal}`,
                status: 'COERCION_FAILED'
              });
            } else {
              cleanPayload[rule.name] = rawVal;
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: rawType,
                coercedValue: rawVal,
                coercedType: 'float',
                transformationRule: 'Identity match (native numeric)',
                status: 'EXACT_MATCH'
              });
            }
          } else if (typeof rawVal === 'string') {
            const num = parseFloat(rawVal.replace(/[^0-9.-]/g, ''));
            if (isNaN(num)) {
              errors.push(`Cannot coerce string '${rawVal}' to numeric float for '${rule.name}'`);
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: 'string',
                coercedValue: null,
                coercedType: 'float',
                transformationRule: 'SAFE_CAST(val AS FLOAT64) failed',
                status: 'COERCION_FAILED'
              });
            } else if (rule.minVal !== undefined && num < rule.minVal) {
              errors.push(`Coerced value '${num}' for '${rule.name}' violates minVal of ${rule.minVal}`);
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: 'string',
                coercedValue: num,
                coercedType: 'float',
                transformationRule: `Value ${num} < ${rule.minVal}`,
                status: 'COERCION_FAILED'
              });
            } else {
              cleanPayload[rule.name] = num;
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: 'string',
                coercedValue: num,
                coercedType: 'float',
                transformationRule: 'Strict Coercion: string -> Float64 (IEEE 754)',
                status: 'COERCED_SAFE'
              });
            }
          }
        } else if (rule.expectedType === 'iso_date') {
          const dateStr = String(rawVal);
          // Test common formats (DD.MM.YYYY, YYYY/MM/DD, ISO)
          let coercedIso: string | null = null;

          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) {
            coercedIso = dateStr;
          } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            const [d, m, y] = dateStr.split('.');
            coercedIso = `${y}-${m}-${d}T00:00:00Z`;
          } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('/');
            coercedIso = `${y}-${m}-${d}T00:00:00Z`;
          }

          if (coercedIso) {
            cleanPayload[rule.name] = coercedIso;
            coercionDetails.push({
              field: rule.name,
              originalRawValue: rawVal,
              originalRawType: 'string (localized format)',
              coercedValue: coercedIso,
              coercedType: 'ISO-8601 Timestamp',
              transformationRule: `to_timestamp('${dateStr}', 'DD.MM.YYYY') -> ISO-8601 UTC`,
              status: coercedIso === dateStr ? 'EXACT_MATCH' : 'COERCED_SAFE'
            });
          } else {
            errors.push(`Invalid timestamp format for '${rule.name}': '${dateStr}'`);
            coercionDetails.push({
              field: rule.name,
              originalRawValue: rawVal,
              originalRawType: 'string (unparseable)',
              coercedValue: null,
              coercedType: 'ISO-8601 Timestamp',
              transformationRule: 'Unrecognized date format',
              status: 'COERCION_FAILED'
            });
          }
        } else if (rule.expectedType === 'boolean') {
          if (typeof rawVal === 'boolean') {
            cleanPayload[rule.name] = rawVal;
            coercionDetails.push({
              field: rule.name,
              originalRawValue: rawVal,
              originalRawType: 'boolean',
              coercedValue: rawVal,
              coercedType: 'boolean',
              transformationRule: 'Exact boolean match',
              status: 'EXACT_MATCH'
            });
          } else {
            const s = String(rawVal).toUpperCase().trim();
            const boolVal = ['Y', '1', 'TRUE', 'YES'].includes(s);
            const isKnown = ['Y', 'N', '1', '0', 'TRUE', 'FALSE', 'YES', 'NO'].includes(s);

            if (isKnown) {
              cleanPayload[rule.name] = boolVal;
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: 'string flag',
                coercedValue: boolVal,
                coercedType: 'boolean',
                transformationRule: `CASE WHEN UPPER('${s}') IN ('Y','1','TRUE') THEN TRUE ELSE FALSE END`,
                status: 'COERCED_SAFE'
              });
            } else {
              errors.push(`Cannot coerce '${rawVal}' to boolean for '${rule.name}'`);
              coercionDetails.push({
                field: rule.name,
                originalRawValue: rawVal,
                originalRawType: 'string',
                coercedValue: null,
                coercedType: 'boolean',
                transformationRule: 'Invalid boolean representation',
                status: 'COERCION_FAILED'
              });
            }
          }
        } else {
          // Default string
          cleanPayload[rule.name] = String(rawVal);
          coercionDetails.push({
            field: rule.name,
            originalRawValue: rawVal,
            originalRawType: rawType,
            coercedValue: String(rawVal),
            coercedType: 'string',
            transformationRule: 'CAST(val AS VARCHAR)',
            status: 'EXACT_MATCH'
          });
        }
      });

      // Generate DBT SQL & PySpark Snippets
      const dbtSql = `-- dbt / Snowflake / BigQuery Safe Casting Model
SELECT
    CAST(raw:invoice_id AS VARCHAR) AS invoice_id,
    CAST(raw:vendor_tax_id AS VARCHAR) AS vendor_tax_id,
    TRY_CAST(raw:amount AS FLOAT64) AS amount,
    TRY_CAST(raw:discount_pct AS FLOAT64) AS discount_pct,
    TRY_TO_TIMESTAMP(raw:issue_date, 'DD.MM.YYYY') AS issue_date,
    CASE 
        WHEN UPPER(raw:is_tax_exempt) IN ('Y', '1', 'TRUE') THEN TRUE 
        ELSE FALSE 
    END AS is_tax_exempt
FROM {{ source('raw_erp', 'inbound_invoices') }}
WHERE TRY_CAST(raw:amount AS FLOAT64) > 0;`;

      const pysparkCode = `# PySpark DataFrame Safe Coercion Transformation
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, TimestampType, BooleanType

df_clean = df_raw.select(
    F.col("invoice_id").cast("string"),
    F.col("vendor_tax_id").cast("string"),
    F.col("amount").cast(DoubleType()).alias("amount"),
    F.to_timestamp(F.col("issue_date"), "dd.MM.yyyy").alias("issue_date"),
    F.when(F.upper(F.col("is_tax_exempt")).isin("Y", "1", "TRUE"), True)
     .otherwise(False).cast(BooleanType()).alias("is_tax_exempt")
).filter(F.col("amount") > 0.0)`;

      setReport({
        isValid: errors.length === 0,
        totalFieldsEvaluated: coercionDetails.length,
        coercedCount: coercionDetails.filter(c => c.status === 'COERCED_SAFE').length,
        errorCount: errors.length,
        errors,
        coercionDetails,
        finalCleanPayload: cleanPayload,
        dbtSqlSnippet: dbtSql,
        pysparkSnippet: pysparkCode
      });
    } catch (e: any) {
      setReport({
        isValid: false,
        totalFieldsEvaluated: 0,
        coercedCount: 0,
        errorCount: 1,
        errors: [`JSON Parse Error: ${e.message}`],
        coercionDetails: [],
        finalCleanPayload: {},
        dbtSqlSnippet: '',
        pysparkSnippet: ''
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const pythonValidatorSnippet = `# Semantra Type Coercion Engine (Pydantic V2 @field_validator & Strict Normalization)
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from typing import Dict, Any, Tuple, Optional, List, Union
from datetime import datetime

class InboundInvoiceCoercionContract(BaseModel):
    """
    Pydantic V2 Strict Coercion Contract.
    Automatski kastuje string brojeve, normalizuje lokalizovane datume u ISO-8601 UTC
    i standardizuje boolean flegove pre nego što stignu do Mapera ili ERP-a.
    """
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    invoice_id: str = Field(..., description="Jedinstveni string ID fakture")
    vendor_tax_id: str = Field(..., description="Poreski identifikacioni broj (PIB/VAT)")
    amount: float = Field(..., gt=0.0, description="Iznos mora biti strogo pozitivan numerički float")
    discount_pct: Optional[float] = Field(default=0.0, ge=0.0, le=1.0, description="Procentualni popust 0.0-1.0")
    issue_date: str = Field(..., description="Normalizovani ISO-8601 UTC timestamp")
    is_tax_exempt: bool = Field(default=False, description="Strogi boolean fleg")

    # 1. Pydantic V2 Field Validator za numeričke stringove (npr. "14500.75" -> 14500.75)
    @field_validator('amount', 'discount_pct', mode='before')
    @classmethod
    def coerce_numeric_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            # Čišćenje valutnih simbola i zareza: "$ 14,500.75" -> "14500.75"
            cleaned = v.replace('$', '').replace('€', '').replace(',', '').strip()
            try:
                return float(cleaned)
            except ValueError:
                raise ValueError(f"Neuspešno konvertovanje stringa '{v}' u Float64.")
        return v

    # 2. Pydantic V2 Field Validator za lokalizovane datume (npr. "31.08.2026" -> ISO-8601)
    @field_validator('issue_date', mode='before')
    @classmethod
    def coerce_to_iso_date(cls, v: Any) -> str:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%dT%H:%M:%SZ")
        if isinstance(v, str):
            formats = ("%Y-%m-%dT%H:%M:%SZ", "%d.%m.%Y", "%Y/%m/%d", "%Y-%m-%d", "%m/%d/%Y")
            for fmt in formats:
                try:
                    dt = datetime.strptime(v.strip(), fmt)
                    return dt.strftime("%Y-%m-%dT00:00:00Z")
                except ValueError:
                    continue
            raise ValueError(f"Neprepoznat format datuma: '{v}'. Očekivan ISO, DD.MM.YYYY ili YYYY/MM/DD.")
        raise ValueError(f"Datum mora biti string ili datetime, primljeno: {type(v)}")

    # 3. Pydantic V2 Field Validator za boolean flegove (npr. "Y", "1", "TRUE" -> True)
    @field_validator('is_tax_exempt', mode='before')
    @classmethod
    def coerce_boolean_flags(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v == 1)
        if isinstance(v, str):
            s = v.strip().upper()
            if s in ('Y', 'YES', '1', 'TRUE', 'T'):
                return True
            if s in ('N', 'NO', '0', 'FALSE', 'F'):
                return False
        raise ValueError(f"Nemoguće kastovati vrednost '{v}' u validan Boolean.")

class SemantraTypeCoercionEngine:
    @staticmethod
    def ingest_and_coerce(raw_json: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str]]:
        """
        Ingestuje sirovu poruku i primenjuje Pydantic V2 Coercion Pipeline.
        """
        try:
            model = InboundInvoiceCoercionContract.model_validate(raw_json)
            print(f"[COERCION SUCCESS] Poruka uspešno validirana i kastovana u stroge tipove.")
            return True, model.model_dump(), []
        except ValidationError as err:
            errors = [f"Polje '{e['loc'][0]}': {e['msg']}" for e in err.errors()]
            print(f"[COERCION FAILED] Validacija nije prošla: {errors}")
            return False, {}, errors

# --- RUNTIME SIMULACIJA ---
if __name__ == "__main__":
    # Sirov legacy ERP payload sa string brojevima, '31.08.2026' datumom i 'Y' flegom
    legacy_payload = {
        "invoice_id": "INV-2026-8800",
        "vendor_tax_id": "RS100234889",
        "amount": "14500.75",             # String umesto Float64
        "discount_pct": "0.05",            # String umesto Float64
        "issue_date": "31.08.2026",        # Evropski DD.MM.YYYY format
        "is_tax_exempt": "Y"               # String flag umesto Boolean
    }

    success, clean_data, errors = SemantraTypeCoercionEngine.ingest_and_coerce(legacy_payload)
    print("Rezultat obrade:")
    print(clean_data)`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                P0 Data Quality &amp; Casting
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                ISO-8601 &amp; Strict IEEE-754
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Execution Target: dbt (Snowflake) / PySpark (Databricks)
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-blue-400" />
              JSON Schema Validation &amp; Dynamic Type Coercion
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              <strong>Control Plane Sandbox:</strong> Eliminates runtime pipeline crashes from legacy ERP data formats (e.g. numeric strings, localized dates, flags). Semantra models type invariants and compiles standard dbt SQL, PySpark, and Pydantic V2 modules that execute directly in your existing lakehouse or warehouse.
            </p>
          </div>

          <button
            onClick={runValidationAndCoercion}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Validate &amp; Coerce Types</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_MESSAGES.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setRawInput(preset.payload);
              setReport(null);
            }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              rawInput === preset.payload
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">{preset.name.split(':')[0]}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                idx === 0 ? 'bg-blue-100 text-blue-800' : idx === 1 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {idx === 0 ? 'String Casting' : idx === 1 ? 'Malformed' : 'Clean'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{preset.description}</p>
          </button>
        ))}
      </div>

      {/* Schema Contract vs Raw Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Contract Definitions (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Strict Schema Contract Invariants
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{schemaContract.length} rules</span>
          </div>

          <div className="space-y-2">
            {schemaContract.map(rule => (
              <div key={rule.name} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="font-bold text-slate-800">{rule.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                    {rule.expectedType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-tight">{rule.formatDescription}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Ingestion Payload (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Raw Inbound Ingestion JSON</h3>
            <span className="text-xs font-mono text-slate-500">Unsanitized legacy payload</span>
          </div>

          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={10}
            className="w-full font-mono text-xs p-3.5 rounded-lg bg-slate-900 text-blue-300 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none shadow-inner"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">Test invalid numbers or arbitrary date formats.</span>
            <button
              onClick={runValidationAndCoercion}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Execute Coercion Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation & Coercion Report */}
      {report && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            report.isValid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-start gap-3">
              {report.isValid ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded uppercase tracking-wider bg-white/90 border border-slate-200 shadow-2xs">
                    {report.isValid ? 'SCHEMA VALIDATED & COERCED' : 'VALIDATION REJECTED'}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {report.coercedCount} Field(s) Auto-Coerced to Strict Types
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed font-sans">
                  {report.isValid 
                    ? 'All payload attributes verified against schema contract and successfully converted to native target datatypes.' 
                    : `Payload failed strict contract invariants (${report.errors.length} errors). Rejected before mapper stage.`}
                </p>
              </div>
            </div>
          </div>

          {/* Coercion Transformation Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
              Field Coercion Audit Breakdown
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-slate-600">
                  <tr>
                    <th className="p-2.5">Field</th>
                    <th className="p-2.5">Raw Inbound Value</th>
                    <th className="p-2.5">Raw Type</th>
                    <th className="p-2.5">Coerced Value</th>
                    <th className="p-2.5">Target Type</th>
                    <th className="p-2.5">Transformation Rule</th>
                    <th className="p-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {report.coercionDetails.map(c => (
                    <tr key={c.field} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-bold text-slate-900">{c.field}</td>
                      <td className="p-2.5 text-slate-600 bg-slate-50/50">{JSON.stringify(c.originalRawValue)}</td>
                      <td className="p-2.5 text-slate-400">{c.originalRawType}</td>
                      <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">{JSON.stringify(c.coercedValue)}</td>
                      <td className="p-2.5 text-slate-700">{c.coercedType}</td>
                      <td className="p-2.5 text-[11px] font-sans text-slate-500">{c.transformationRule}</td>
                      <td className="p-2.5">
                        {c.status === 'COERCED_SAFE' ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                            COERCED
                          </span>
                        ) : c.status === 'EXACT_MATCH' ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                            EXACT
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                            FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clean Output JSON and DBT / PySpark Codegen */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveCodeTab('dbt_sql')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeCodeTab === 'dbt_sql' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Generated dbt / SQL Safe Cast Model
                </button>
                <button
                  onClick={() => setActiveCodeTab('pyspark')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeCodeTab === 'pyspark' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Generated PySpark Casting Pipeline
                </button>
                <button
                  onClick={() => setActiveCodeTab('python_engine')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeCodeTab === 'python_engine' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Python Architecture Module
                </button>
              </div>

              <button
                onClick={() => copyCode(
                  activeCodeTab === 'dbt_sql' 
                    ? report.dbtSqlSnippet 
                    : activeCodeTab === 'pyspark' 
                    ? report.pysparkSnippet 
                    : pythonValidatorSnippet
                )}
                className="px-2.5 py-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900 text-blue-300 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
              {activeCodeTab === 'dbt_sql' && report.dbtSqlSnippet}
              {activeCodeTab === 'pyspark' && report.pysparkSnippet}
              {activeCodeTab === 'python_engine' && pythonValidatorSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
