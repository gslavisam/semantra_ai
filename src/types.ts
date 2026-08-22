export type MappingMode = 'standard' | 'canonical';

export type Confidence = 'high' | 'medium' | 'low';

export type MappingSignal = 'name' | 'semantic' | 'knowledge' | 'canonical' | 'correction' | 'llm';

export type DecisionStatus = 'accepted' | 'needs_review' | 'rejected';
export type MappingType = 'Direct mapping' | 'Derived value' | 'Fixed value' | 'N/A' | 'Target managed';

export interface MappingRow {
  id: string;
  sourceField: string;
  sourceDesc: string;
  sourceType: string;
  targetField: string;
  targetDesc: string;
  targetType: string;
  confidence: Confidence;
  score: number;
  signals: MappingSignal[];
  explanation: string;
  llmNotes?: string;
  transformation?: string;
  transformationCode?: string;
  isVirtual?: boolean;
  isApproved?: boolean;
  decisionStatus?: DecisionStatus;
  mappingType?: MappingType;
}

export interface DecisionProposal {
  id: string;
  sourceField: string;
  suggestedTargetField: string;
  confidence: Confidence;
  reason: string;
  isSafe: boolean;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  fieldsMapped: number;
  sourceSystem: string;
  targetSystem: string;
  reuseFitScore: number;
  reuseExplanation: string;
  mappings: { source: string; target: string }[];
  tags?: string[];
}

export interface BenchmarkDataset {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  baselineScore: number;
  currentScore: number;
  lastRunDate: string;
}

export interface StewardshipItem {
  id: string;
  conceptName: string;
  proposedAlias: string;
  sourceContext: string;
  status: 'ready_for_approval' | 'approved' | 'rejected' | 'ignored';
  dateAdded: string;
  reviewNote?: string;
}

export interface KnowledgeConcept {
  id: string;
  concept_id: string;
  canonical_name: string;
  domain: string;
  source: string;
  editable: 'yes' | 'no';
  linked_pii: 'yes' | 'no';
  linked_gdpr_special: 'yes' | 'no';
  linked_pii_tags: string;
  linked_data_subjects: string;
  alias_count: number;
  field_context_count: number;
  linked_canonical_concept_count: number;
  source_systems: string;
  linked_canonical_concepts: string;
}

export interface CanonicalConcept {
  id: string;
  concept_id: string;
  display_name: string;
  entity: string;
  attribute: string;
  data_type: string;
  source: string;
  usage_count: number;
  field_context_count: number;
  active_overlay_entry_count: number;
  source_systems: string;
  business_domains: string;
  base_aliases: string;
  hasOverlay?: boolean;
  hasContext?: boolean;
  isPII?: boolean;
  isGDPR?: boolean;
  name?: string;
  description?: string;
  aliases?: string[];
  fieldContexts?: string[];
  activeOverlay?: string;
}

export interface CorrectionRule {
  id: string;
  sourcePattern: string;
  targetPattern: string;
  isApproved: boolean;
  accuracyImpact: string;
  matchCount: number;
}

export type AIProvider = 'gemini' | 'openai' | 'lmstudio' | 'ollama' | 'custom';

export interface AIModelConfig {
  provider: AIProvider;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  topP: number;
  enableGuardrails: boolean;
  promptPacking: 'dynamic' | 'standard';
  systemInstruction: string;
  isCustomModel: boolean;
}

export interface SignalWeights {
  lexical: number;
  semantic: number;
  knowledge: number;
  canonical: number;
  pattern: number;
  llm: number;
}

export interface OpenAPIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  requestBodySample?: object;
  responseSample: object;
}

