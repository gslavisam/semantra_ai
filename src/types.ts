export type MappingMode = 'standard' | 'canonical';

export type Confidence = 'high' | 'medium' | 'low';

export type SearchMode = 'hybrid' | 'lexical' | 'semantic';

export interface RRFBreakdown {
  rrfScore: number;
  lexicalRank: number;
  semanticRank: number;
  lexicalContrib: number;
  semanticContrib: number;
  k: number;
}

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

// Phase 2: AI Security & Circuit Breaker Types
export type PIIType = 'email' | 'phone' | 'tax_id' | 'iban' | 'national_id' | 'credit_card' | 'name' | 'address' | 'custom';

export interface PIIEntity {
  id: string;
  type: PIIType;
  rawValue: string;
  maskedToken: string;
  location: string;
  confidence: number;
}

export interface PIIMaskingResult {
  sanitizedPayload: any;
  detectedEntities: PIIEntity[];
  count: number;
  isSanitized: boolean;
  mappingDict: Record<string, string>;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureTime?: string;
  lastSuccessTime?: string;
  fallbackActive: boolean;
  lastFallbackReason?: string;
  totalCalls: number;
  failedCalls: number;
  fallbackCalls: number;
  uptimePercent: number;
}

export interface AIExecutionResult<T> {
  data?: T;
  fallbackUsed: boolean;
  fallbackReason?: string;
  circuitBreakerState: CircuitBreakerState;
  piiSanitized: boolean;
  piiEntitiesCount: number;
  latencyMs: number;
}

// ==========================================
// ADVANCED BRANCHING & MERGE CONFLICT TYPES
// ==========================================
export interface BranchOverlayRule {
  id: string;
  source_system: string;
  source_field: string;
  target_canonical_concept: string;
  override_type: 'alias_promotion' | 'domain_override' | 'pii_tag' | 'type_mapping';
  steward: string;
  status: 'active' | 'inactive';
  created_at: string;
  notes: string;
}

export interface BranchDefinition {
  id: string;
  name: string;
  description: string;
  author: string;
  status: 'production' | 'draft_overlay' | 'staging';
  baseBranch: string;
  pendingChangesCount: number;
  benchmarkDeltaPct: number;
  lastUpdated: string;
  commitHash: string;
  stagedRules: BranchOverlayRule[];
  conceptOverrides: Record<string, Partial<CanonicalConcept>>;
}

export interface MergeConflictItem {
  id: string;
  conceptId: string;
  conceptDisplayName: string;
  propertyKey: keyof CanonicalConcept | 'overlay_rule';
  propertyLabel: string;
  mainValue: any;
  incomingValue: any;
  conflictDescription: string;
  resolution: 'keep_main' | 'accept_incoming' | 'custom';
  customValue?: any;
  resolved: boolean;
}

export interface StewardshipAuditRecord {
  id: string;
  timestamp: string;
  stewardName: string;
  actionType: 'branch_created' | 'branch_merged' | 'conflict_resolved' | 'concept_override' | 'overlay_promoted' | 'decision_applied';
  branchName: string;
  targetEntity: string;
  details: string;
  idempotencyKey: string;
  commitHash: string;
  status: 'committed' | 'rolled_back';
}

// ==========================================
// ENHANCED REVERSE ENGINEERING CONTRACT TYPES
// ==========================================
export interface ContractRelationship {
  id: string;
  fromEntity: string;
  fromField: string;
  toEntity: string;
  toField: string;
  cardinality: '1:1' | '1:N' | 'N:M';
  constraintName?: string;
}

export interface ContractConstraint {
  id: string;
  fieldName: string;
  constraintType: 'NOT NULL' | 'UNIQUE' | 'PRIMARY KEY' | 'CHECK' | 'FOREIGN KEY' | 'REGEX' | 'ENUM';
  expression: string;
  severity: 'error' | 'warning';
  assertionCandidate: boolean;
  generatedAssertionRule?: string;
}

export interface ContractParsedEntity {
  name: string;
  displayName: string;
  description?: string;
  fields: {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    defaultValue?: string;
    sampleValues?: string[];
    description?: string;
    semanticCategory?: string;
  }[];
  constraints: ContractConstraint[];
  relationships: ContractRelationship[];
  rawCount?: number;
}

