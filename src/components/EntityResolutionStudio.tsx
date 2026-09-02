import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Copy, 
  Check, 
  Play, 
  RotateCcw, 
  Filter, 
  ShieldCheck, 
  Users, 
  Merge, 
  UserPlus, 
  Eye, 
  FileText,
  Search
} from 'lucide-react';

interface GoldenRecord {
  canonical_id: string;
  name: string;
  tax_id: string;
  city: string;
  country: string;
  status: 'ACTIVE' | 'MERGED';
  aliases: string[];
}

interface ResolutionEvaluation {
  incoming: { name: string; tax_id: string; city: string; source: string };
  bestMatch: GoldenRecord | null;
  jaroWinklerScore: number;
  levenshteinScore: number;
  taxIdMatch: boolean;
  combinedScore: number;
  decision: 'AUTO_MERGE' | 'MANUAL_REVIEW' | 'CREATE_NEW';
  reason: string;
}

const BASELINE_GOLDEN_RECORDS: GoldenRecord[] = [
  {
    canonical_id: 'VND-GR-001',
    name: 'Robert Bosch d.o.o. Beograd',
    tax_id: 'RS100223344',
    city: 'Beograd',
    country: 'Serbia',
    status: 'ACTIVE',
    aliases: ['Bosch DOO', 'BOSCH BEOGRAD', 'Bosch Srbija']
  },
  {
    canonical_id: 'VND-GR-002',
    name: 'Siemens Energy AG Branch',
    tax_id: 'DE811122334',
    city: 'Munich',
    country: 'Germany',
    status: 'ACTIVE',
    aliases: ['Siemens AG', 'Siemens Energy']
  },
  {
    canonical_id: 'VND-GR-003',
    name: 'Schneider Electric Industries SAS',
    tax_id: 'FR998877665',
    city: 'Paris',
    country: 'France',
    status: 'ACTIVE',
    aliases: ['Schneider Electric', 'Schneider SAS']
  }
];

const PRESET_INCOMING_ENTITIES = [
  {
    label: 'Scenario 1: Salesforce Partner Variant (Score 0.94 -> Auto-Merge to Bosch)',
    data: {
      name: 'BOSCH DOO BEOGRAD',
      tax_id: 'RS100223344',
      city: 'Belgrade',
      source: 'Salesforce_CRM_Prod'
    }
  },
  {
    label: 'Scenario 2: Oracle Typo/Abbreviation (Score 0.82 -> Data Steward Review)',
    data: {
      name: 'R. Bosch Serbia Headquarter',
      tax_id: '100223344',
      city: 'Belgrade',
      source: 'Oracle_EBS_Central'
    }
  },
  {
    label: 'Scenario 3: NetSuite Fresh Vendor (Score 0.41 -> Create New Unique Golden Record)',
    data: {
      name: 'ABB Power Grids Switzerland AG',
      tax_id: 'CH554433221',
      city: 'Zurich',
      source: 'NetSuite_Global'
    }
  }
];

// Simplified Jaro-Winkler & Token Similarity Calculator
function calculateSimilarity(s1: string, s2: string): { jaro: number; lev: number; combined: number } {
  const clean1 = s1.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const clean2 = s2.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  if (clean1 === clean2) return { jaro: 1.0, lev: 1.0, combined: 1.0 };

  const words1 = new Set(clean1.split(' '));
  const words2 = new Set(clean2.split(' '));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const jaccard = union.size > 0 ? intersection.size / union.size : 0;
  
  // Prefix bonus (Jaro-Winkler characteristic)
  let prefix = 0;
  for (let i = 0; i < Math.min(clean1.length, clean2.length, 4); i++) {
    if (clean1[i] === clean2[i]) prefix++;
    else break;
  }

  const jaro = Math.min(1.0, jaccard * 0.7 + (prefix * 0.075) + 0.2);
  const lev = Math.max(0.2, 1 - Math.abs(clean1.length - clean2.length) / Math.max(clean1.length, clean2.length));
  const combined = Number((jaro * 0.7 + lev * 0.3).toFixed(3));

  return { jaro: Number(jaro.toFixed(3)), lev: Number(lev.toFixed(3)), combined };
}

export const EntityResolutionStudio: React.FC = () => {
  const [goldenRecords, setGoldenRecords] = useState<GoldenRecord[]>(BASELINE_GOLDEN_RECORDS);
  const [autoMergeThreshold, setAutoMergeThreshold] = useState<number>(0.90);
  const [reviewThreshold, setReviewThreshold] = useState<number>(0.75);

  const [inputName, setInputName] = useState<string>(PRESET_INCOMING_ENTITIES[0].data.name);
  const [inputTaxId, setInputTaxId] = useState<string>(PRESET_INCOMING_ENTITIES[0].data.tax_id);
  const [inputCity, setInputCity] = useState<string>(PRESET_INCOMING_ENTITIES[0].data.city);
  const [inputSource, setInputSource] = useState<string>(PRESET_INCOMING_ENTITIES[0].data.source);

  const [evaluation, setEvaluation] = useState<ResolutionEvaluation | null>(null);
  const [activeTab, setActiveTab] = useState<'decision' | 'golden_registry' | 'python_code'>('decision');
  const [copied, setCopied] = useState<boolean>(false);

  const evaluateEntity = () => {
    let bestMatch: GoldenRecord | null = null;
    let highestScore = 0;
    let bestJaro = 0;
    let bestLev = 0;

    goldenRecords.forEach(rec => {
      const { jaro, lev, combined } = calculateSimilarity(inputName, rec.name);
      
      // Also check alias list
      let aliasMax = combined;
      rec.aliases.forEach(alias => {
        const aliasSim = calculateSimilarity(inputName, alias);
        if (aliasSim.combined > aliasMax) aliasMax = aliasSim.combined;
      });

      // Tax ID exact match provides heavy boost
      const cleanTax1 = inputTaxId.replace(/[^0-9]/g, '');
      const cleanTax2 = rec.tax_id.replace(/[^0-9]/g, '');
      const taxExact = cleanTax1.length >= 6 && cleanTax1 === cleanTax2;

      const finalScore = taxExact ? Math.min(1.0, aliasMax * 0.4 + 0.6) : aliasMax;

      if (finalScore > highestScore) {
        highestScore = finalScore;
        bestMatch = rec;
        bestJaro = jaro;
        bestLev = lev;
      }
    });

    const taxMatched = bestMatch ? inputTaxId.replace(/[^0-9]/g, '') === bestMatch.tax_id.replace(/[^0-9]/g, '') : false;

    let decision: 'AUTO_MERGE' | 'MANUAL_REVIEW' | 'CREATE_NEW' = 'CREATE_NEW';
    let reason = '';

    if (highestScore >= autoMergeThreshold) {
      decision = 'AUTO_MERGE';
      reason = `High-confidence fuzzy & tax match (Score: ${(highestScore * 100).toFixed(1)}%). Automatically merged into Golden Record ${bestMatch?.canonical_id} without duplicate generation.`;
    } else if (highestScore >= reviewThreshold) {
      decision = 'MANUAL_REVIEW';
      reason = `Moderate similarity detected (Score: ${(highestScore * 100).toFixed(1)}%). Routed to Data Steward Review Inbox for manual verification.`;
    } else {
      decision = 'CREATE_NEW';
      reason = `Similarity score ${(highestScore * 100).toFixed(1)}% is below threshold (${(reviewThreshold * 100).toFixed(0)}%). Creating new distinct Master Entity.`;
    }

    setEvaluation({
      incoming: { name: inputName, tax_id: inputTaxId, city: inputCity, source: inputSource },
      bestMatch,
      jaroWinklerScore: bestJaro,
      levenshteinScore: bestLev,
      taxIdMatch: taxMatched,
      combinedScore: highestScore,
      decision,
      reason
    });
  };

  const handleApplyResolution = () => {
    if (!evaluation) return;

    if (evaluation.decision === 'AUTO_MERGE' && evaluation.bestMatch) {
      setGoldenRecords(prev => prev.map(rec => {
        if (rec.canonical_id === evaluation.bestMatch?.canonical_id) {
          const updatedAliases = Array.from(new Set([...rec.aliases, evaluation.incoming.name]));
          return { ...rec, aliases: updatedAliases };
        }
        return rec;
      }));
      alert(`Merged '${evaluation.incoming.name}' into Golden Record ${evaluation.bestMatch.canonical_id}. Added to alias dictionary.`);
    } else if (evaluation.decision === 'CREATE_NEW') {
      const newId = `VND-GR-00${goldenRecords.length + 1}`;
      const newRec: GoldenRecord = {
        canonical_id: newId,
        name: evaluation.incoming.name,
        tax_id: evaluation.incoming.tax_id,
        city: evaluation.incoming.city,
        country: 'Auto-Resolved',
        status: 'ACTIVE',
        aliases: []
      };
      setGoldenRecords(prev => [...prev, newRec]);
      alert(`Created new Golden Record ${newId} for '${evaluation.incoming.name}'.`);
    }
  };

  const pythonSnippet = `# Semantra Entity Resolution Engine (Pydantic V2 Master Record & Fuzzy Matcher)
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Dict, Any, List, Tuple, Optional
import re

class MasterEntityRecord(BaseModel):
    """
    Pydantic V2 Master Data Entity Record.
    Automatski čisti nazive pravnih lica i standardizuje poreske identifikatore.
    """
    model_config = ConfigDict(str_strip_whitespace=True)

    canonical_id: str = Field(..., description="Golden Record identifikator (npr. VND-GR-001)")
    name: str = Field(..., min_length=2, description="Zvanični naziv kompanije")
    tax_id: str = Field(..., description="Poreski broj (PIB/VAT)")
    city: Optional[str] = Field(default=None)
    aliases: List[str] = Field(default_factory=list, description="Prepoznati sinonimi i varijacije")

    @field_validator('name')
    @classmethod
    def clean_legal_suffixes(cls, v: str) -> str:
        # Standardizacija pravnih formi
        return re.sub(r'\\b(d\\.o\\.o\\.?|doo|gmbh|inc\\.?|llc|corp\\.?)\\b', '', v, flags=re.IGNORECASE).strip()

class EntityResolutionEngine:
    def __init__(self, auto_merge_threshold: float = 0.90, review_threshold: float = 0.75):
        self.auto_merge_threshold = auto_merge_threshold
        self.review_threshold = review_threshold
        self.golden_records: List[MasterEntityRecord] = [
            MasterEntityRecord(
                canonical_id="VND-GR-001",
                name="Robert Bosch",
                tax_id="RS100223344",
                city="Beograd",
                aliases=["Bosch d.o.o. Beograd", "BOSCH SERBIA"]
            )
        ]

    def _calculate_similarity(self, s1: str, s2: str) -> float:
        w1, w2 = set(s1.lower().split()), set(s2.lower().split())
        return len(w1 & w2) / len(w1 | w2) if (w1 | w2) else 0.0

    def resolve_entity(self, incoming_data: Dict[str, Any]) -> Tuple[str, float, str]:
        """
        Validira ulazni zapis i poredi sa Golden Records bazom.
        """
        cleaned_name = re.sub(r'\\b(d\\.o\\.o\\.?|doo|gmbh|inc\\.?)\\b', '', incoming_data.get("name", ""), flags=re.IGNORECASE).strip()
        incoming_tax = incoming_data.get("tax_id", "").replace(" ", "").replace("-", "")

        best_score = 0.0
        best_match: Optional[MasterEntityRecord] = None

        for rec in self.golden_records:
            # 1. Tačan PIB/VAT match -> instant 100%
            if rec.tax_id.replace(" ", "").replace("-", "") == incoming_tax:
                return rec.canonical_id, 1.0, "AUTO_MERGE_EXACT_TAX_MATCH"

            # 2. Fuzzy name similarity
            sim = self._calculate_similarity(cleaned_name, rec.name)
            if sim > best_score:
                best_score = sim
                best_match = rec

        if best_score >= self.auto_merge_threshold and best_match:
            return best_match.canonical_id, best_score, "AUTO_MERGE_HIGH_CONFIDENCE"
        elif best_score >= self.review_threshold and best_match:
            return best_match.canonical_id, best_score, "PENDING_STEWARD_REVIEW"

        return f"VND-GR-00{len(self.golden_records)+1}", best_score, "CREATE_NEW_GOLDEN_RECORD"`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                P1 MDM Master Data Management
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Blocking &amp; Jaro-Winkler Heuristics
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Execution Target: Databricks / Snowflake / Python MDM
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-400" />
              Entity Resolution &amp; Fuzzy Matching (Golden Records)
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              <strong>Control Plane Sandbox:</strong> Deduplicates vendor and customer records across disparate ERPs. Semantra tunes match thresholds and compiles deterministic + fuzzy deduplication scripts that run directly on your Databricks, Snowflake, or Python worker clusters.
            </p>
          </div>
          <button
            onClick={evaluateEntity}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resolve Incoming Entity</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Loaders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_INCOMING_ENTITIES.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputName(preset.data.name);
              setInputTaxId(preset.data.tax_id);
              setInputCity(preset.data.city);
              setInputSource(preset.data.source);
              setEvaluation(null);
            }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              inputName === preset.data.name
                ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">{preset.label.split(':')[0]}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                idx === 0 ? 'bg-emerald-100 text-emerald-800' : idx === 1 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {idx === 0 ? 'Auto-Merge' : idx === 1 ? 'Review' : 'New Record'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight truncate">{preset.data.name} ({preset.data.source})</p>
          </button>
        ))}
      </div>

      {/* Configuration & Input Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Entity Details (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-teal-600" />
              Incoming B2B Entity Record
            </h3>
            <span className="text-xs font-mono text-slate-500">Source: {inputSource}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Entity / Vendor Name</label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax ID / PIB / VAT Number</label>
              <input
                type="text"
                value={inputTaxId}
                onChange={(e) => setInputTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City / Location</label>
              <input
                type="text"
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source System Tag</label>
              <input
                type="text"
                value={inputSource}
                onChange={(e) => setInputSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={evaluateEntity}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Compute Match Metrics</span>
            </button>
          </div>
        </div>

        {/* Threshold Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              Resolution Confidence Thresholds
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Auto-Merge Threshold (Golden Record)</span>
                <span className="font-mono font-bold text-emerald-600">{(autoMergeThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={autoMergeThreshold}
                onChange={(e) => setAutoMergeThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400">Score &ge; {(autoMergeThreshold * 100).toFixed(0)}% merges automatically without human intervention.</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Data Steward Review Threshold</span>
                <span className="font-mono font-bold text-amber-600">{(reviewThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.85"
                step="0.01"
                value={reviewThreshold}
                onChange={(e) => setReviewThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-600"
              />
              <span className="text-[10px] text-slate-400">Score between {(reviewThreshold * 100).toFixed(0)}% and {(autoMergeThreshold * 100).toFixed(0)}% prompts Steward confirmation.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Evaluation Result Card */}
      {evaluation && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in">
          {/* Decision Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            evaluation.decision === 'AUTO_MERGE'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : evaluation.decision === 'MANUAL_REVIEW'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
          }`}>
            <div className="flex items-start gap-3">
              {evaluation.decision === 'AUTO_MERGE' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : evaluation.decision === 'MANUAL_REVIEW' ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <UserPlus className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded uppercase tracking-wider bg-white/90 border border-slate-200 shadow-2xs">
                    {evaluation.decision}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    Match Confidence: {(evaluation.combinedScore * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed font-sans">{evaluation.reason}</p>
              </div>
            </div>

            <button
              onClick={handleApplyResolution}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                evaluation.decision === 'AUTO_MERGE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : evaluation.decision === 'MANUAL_REVIEW'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {evaluation.decision === 'AUTO_MERGE' ? (
                <>
                  <Merge className="w-3.5 h-3.5" />
                  <span>Execute Auto-Merge</span>
                </>
              ) : evaluation.decision === 'MANUAL_REVIEW' ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Approve Match &amp; Merge</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Canonical Entity</span>
                </>
              )}
            </button>
          </div>

          {/* Detailed Match Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Closest Golden Record</span>
              <p className="text-xs font-bold text-slate-900 mt-1">{evaluation.bestMatch?.canonical_id || 'None'}</p>
              <p className="text-[11px] text-slate-500 truncate">{evaluation.bestMatch?.name || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Jaro-Winkler Metric</span>
              <p className="text-xs font-bold font-mono text-slate-900 mt-1">{(evaluation.jaroWinklerScore * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500">Prefix-weighted token similarity</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Tax ID Alignment</span>
              <p className={`text-xs font-bold font-mono mt-1 ${evaluation.taxIdMatch ? 'text-emerald-600' : 'text-slate-500'}`}>
                {evaluation.taxIdMatch ? 'EXACT TAX ID MATCH' : 'DIFF TAX / UNMATCHED'}
              </p>
              <p className="text-[11px] text-slate-500">Strict legal entity identifier</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Action Plan</span>
              <p className="text-xs font-bold text-slate-900 mt-1">
                {evaluation.decision === 'AUTO_MERGE' ? '0 Duplicate Risk' : evaluation.decision === 'MANUAL_REVIEW' ? 'Pending Steward' : 'New Golden ID'}
              </p>
              <p className="text-[11px] text-slate-500">Master Data Quality Rule</p>
            </div>
          </div>
        </div>
      )}

      {/* Golden Records Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Master Golden Records Registry ({goldenRecords.length} Entities)</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Real-time Canonical Truth Store</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                <th className="p-2.5">Canonical ID</th>
                <th className="p-2.5">Master Entity Name</th>
                <th className="p-2.5">Tax ID / VAT</th>
                <th className="p-2.5">City / Country</th>
                <th className="p-2.5">Known Aliases</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {goldenRecords.map(rec => (
                <tr key={rec.canonical_id} className="hover:bg-slate-50/60">
                  <td className="p-2.5 font-mono font-bold text-slate-900">{rec.canonical_id}</td>
                  <td className="p-2.5 font-semibold text-slate-800">{rec.name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{rec.tax_id}</td>
                  <td className="p-2.5 text-slate-600">{rec.city}, {rec.country}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {rec.aliases.map((alias, i) => (
                        <span key={i} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
