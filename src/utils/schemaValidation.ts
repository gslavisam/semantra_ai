// Schema definitions, types, and row-level validation utilities for Semantra data ingestion

export interface ValidationIssue {
  rowNumber: number;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  value?: any;
}

export interface SchemaFieldSpec {
  name: string;
  aliases: string[];
  required: boolean;
  type: 'string' | 'enum' | 'boolean' | 'list' | 'identifier';
  allowedValues?: string[];
  description: string;
  example: string;
}

export interface ModelSchemaSpec {
  modelName: string;
  title: string;
  description: string;
  supportedFormats: ('csv' | 'json')[];
  fields: SchemaFieldSpec[];
  sampleJson: Record<string, any>[];
  sampleCsv: string;
}

// 1. CANONICAL GLOSSARY SCHEMA SPECIFICATION
export const CANONICAL_SCHEMA: ModelSchemaSpec = {
  modelName: 'canonical',
  title: 'Canonical Glossary Specification',
  description: 'Governed core data dictionary. Each entry defines a single atomic concept in entity.attribute format.',
  supportedFormats: ['csv', 'json'],
  fields: [
    {
      name: 'concept_id',
      aliases: ['id', 'concept_identifier', 'canonical_id'],
      required: true,
      type: 'identifier',
      description: 'Unique dotted identifier in entity.attribute format (lowercase letters, numbers, underscores).',
      example: 'financial.cost_center'
    },
    {
      name: 'entity',
      aliases: ['domain_entity', 'entity_name'],
      required: true,
      type: 'string',
      description: 'Logical entity group (e.g. customer, vendor, financial, material).',
      example: 'financial'
    },
    {
      name: 'attribute',
      aliases: ['field', 'attribute_name', 'field_name'],
      required: true,
      type: 'string',
      description: 'Specific attribute name within the entity.',
      example: 'cost_center'
    },
    {
      name: 'display_name',
      aliases: ['name', 'title', 'naziv'],
      required: true,
      type: 'string',
      description: 'Human-friendly business title for the concept.',
      example: 'Cost Center Code'
    },
    {
      name: 'data_type',
      aliases: ['type', 'datatype', 'tip'],
      required: true,
      type: 'enum',
      allowedValues: ['string', 'decimal', 'integer', 'timestamp', 'date', 'boolean', 'code_list'],
      description: 'Canonical physical/logical data type.',
      example: 'string'
    },
    {
      name: 'description',
      aliases: ['desc', 'opis', 'definition'],
      required: false,
      type: 'string',
      description: 'Business semantic definition and stewardship notes.',
      example: 'Unique operational department code for cost accounting.'
    },
    {
      name: 'aliases',
      aliases: ['base_aliases', 'synonyms', 'skracenice'],
      required: false,
      type: 'list',
      description: 'Known physical column names across source systems (comma or semicolon separated).',
      example: 'KOSTL, CC_ID, CostCtr, CostCenter'
    },
    {
      name: 'business_domains',
      aliases: ['domain', 'domains', 'kategorija_domen'],
      required: false,
      type: 'string',
      description: 'Governed domain taxonomy classification.',
      example: 'Finance & General Ledger'
    },
    {
      name: 'source_systems',
      aliases: ['systems', 'source_system'],
      required: false,
      type: 'string',
      description: 'Systems where this concept is actively present.',
      example: 'SAP ECC, OneStream, QuickBooks'
    },
    {
      name: 'is_pii',
      aliases: ['pii', 'linked_pii'],
      required: false,
      type: 'boolean',
      allowedValues: ['true', 'false', 'yes', 'no', '1', '0'],
      description: 'Privacy flag indicating Personally Identifiable Information.',
      example: 'false'
    },
    {
      name: 'is_gdpr',
      aliases: ['gdpr', 'is_gdpr_special_category', 'linked_gdpr_special'],
      required: false,
      type: 'boolean',
      allowedValues: ['true', 'false', 'yes', 'no', '1', '0'],
      description: 'Regulatory flag for sensitive GDPR special category data.',
      example: 'false'
    }
  ],
  sampleJson: [
    {
      concept_id: "financial.cost_center",
      entity: "financial",
      attribute: "cost_center",
      display_name: "Cost Center Code",
      data_type: "string",
      description: "Unique operational department code for cost accounting.",
      aliases: "KOSTL, CC_ID, CostCtr",
      business_domains: "Finance & General Ledger",
      source_systems: "SAP ECC, OneStream",
      is_pii: false,
      is_gdpr: false
    },
    {
      concept_id: "customer.tax_id",
      entity: "customer",
      attribute: "tax_id",
      display_name: "Customer Tax ID",
      data_type: "string",
      description: "National tax identification number or VAT registration.",
      aliases: "STCEG, VAT_NUM, TaxId",
      business_domains: "Customer Master",
      source_systems: "SAP S/4HANA, Salesforce",
      is_pii: true,
      is_gdpr: false
    }
  ],
  sampleCsv: `concept_id,entity,attribute,display_name,data_type,description,aliases,business_domains,source_systems,is_pii,is_gdpr
financial.cost_center,financial,cost_center,Cost Center Code,string,Unique operational department code for cost accounting.,KOSTL; CC_ID; CostCtr,Finance & General Ledger,SAP ECC; OneStream,false,false
customer.tax_id,customer,tax_id,Customer Tax ID,string,National tax identification number or VAT registration.,STCEG; VAT_NUM; TaxId,Customer Master,SAP S/4HANA; Salesforce,true,false
hr.employee_ssn,hr,employee_ssn,Social Security Number,string,Government personal identifier.,SSN; SOC_SEC_NUM,Ljudski Resursi,Workday HR,true,true`
};

// 2. KNOWLEDGE CONCEPT SCHEMA SPECIFICATION
export const KNOWLEDGE_SCHEMA: ModelSchemaSpec = {
  modelName: 'knowledge',
  title: 'Knowledge Concept Specification',
  description: 'Enterprise semantic layer linking physical source schemas to canonical standards and compliance policies.',
  supportedFormats: ['csv', 'json'],
  fields: [
    {
      name: 'concept_id',
      aliases: ['id', 'concept_identifier', 'name'],
      required: true,
      type: 'identifier',
      description: 'Unique knowledge concept key (e.g. hr.tax_withholding_code).',
      example: 'hr.job_profile_level'
    },
    {
      name: 'canonical_name',
      aliases: ['display_name', 'title', 'naziv'],
      required: true,
      type: 'string',
      description: 'Human-readable title of the semantic knowledge concept.',
      example: 'Job Profile Level'
    },
    {
      name: 'domain',
      aliases: ['business_domain', 'category'],
      required: true,
      type: 'string',
      description: 'Business domain classification.',
      example: 'Ljudski Resursi'
    },
    {
      name: 'source',
      aliases: ['source_type', 'registry_source'],
      required: false,
      type: 'enum',
      allowedValues: ['derived_runtime', 'base', 'expert_curated', 'client_extension', 'overlay_only'],
      description: 'Origin tier in the knowledge registry.',
      example: 'expert_curated'
    },
    {
      name: 'editable',
      aliases: ['is_editable'],
      required: false,
      type: 'enum',
      allowedValues: ['yes', 'no'],
      description: 'Whether stewards can edit this entry in the web UI.',
      example: 'yes'
    },
    {
      name: 'source_systems',
      aliases: ['systems', 'system'],
      required: false,
      type: 'string',
      description: 'Physical source applications providing this concept.',
      example: 'Workday HR, SAP ECC'
    },
    {
      name: 'linked_canonical_concepts',
      aliases: ['canonical_concepts', 'canonical_links', 'targets'],
      required: false,
      type: 'list',
      description: 'Canonical concept IDs mapped to this knowledge concept (semicolon or comma separated).',
      example: 'job_level.code, position.grade'
    },
    {
      name: 'linked_pii',
      aliases: ['pii', 'is_pii'],
      required: false,
      type: 'enum',
      allowedValues: ['yes', 'no', 'true', 'false'],
      description: 'Whether this concept handles PII.',
      example: 'no'
    },
    {
      name: 'linked_gdpr_special',
      aliases: ['gdpr', 'is_gdpr'],
      required: false,
      type: 'enum',
      allowedValues: ['yes', 'no', 'true', 'false'],
      description: 'GDPR Article 9 special categories (health, biometric, religious).',
      example: 'no'
    },
    {
      name: 'linked_pii_tags',
      aliases: ['pii_tags', 'tags'],
      required: false,
      type: 'string',
      description: 'Taxonomy tags (e.g. ssn, compensation, confidential).',
      example: 'compensation, employee_record'
    },
    {
      name: 'linked_data_subjects',
      aliases: ['data_subjects', 'subjects'],
      required: false,
      type: 'string',
      description: 'Data subjects affected (e.g. Employee, Candidate, Customer).',
      example: 'Employee'
    }
  ],
  sampleJson: [
    {
      concept_id: "hr.job_profile_level",
      canonical_name: "Job Profile Level",
      domain: "Ljudski Resursi",
      source: "expert_curated",
      editable: "yes",
      source_systems: "Workday HR",
      linked_canonical_concepts: "job_level.code",
      linked_pii: "no",
      linked_gdpr_special: "no",
      linked_data_subjects: "Employee"
    },
    {
      concept_id: "fin.cost_center_dimension",
      canonical_name: "Cost Center Dimension",
      domain: "Finance & General Ledger",
      source: "base",
      editable: "yes",
      source_systems: "OneStream, SAP S/4HANA",
      linked_canonical_concepts: "cost_center.id",
      linked_pii: "no",
      linked_gdpr_special: "no"
    }
  ],
  sampleCsv: `concept_id,canonical_name,domain,source,editable,source_systems,linked_canonical_concepts,linked_pii,linked_gdpr_special,linked_pii_tags,linked_data_subjects
hr.job_profile_level,Job Profile Level,Ljudski Resursi,expert_curated,yes,Workday HR,job_level.code,no,no,,Employee
fin.cost_center_dimension,Cost Center Dimension,Finance & General Ledger,base,yes,OneStream; SAP S/4HANA,cost_center.id,no,no,,Department
sales.sales_territory_code,Sales Territory Code,Customer Master,expert_curated,yes,SAP ECC; Salesforce,sales_territory_id,no,no,,Customer`
};

// 3. OVERLAY RULES SCHEMA SPECIFICATION
export const OVERLAY_SCHEMA: ModelSchemaSpec = {
  modelName: 'overlay',
  title: 'Deterministic Overlay Rules Specification',
  description: 'Deterministic rules stacked over the base engine. High-precedence matching without altering core base definitions.',
  supportedFormats: ['csv', 'json'],
  fields: [
    {
      name: 'source_field',
      aliases: ['field', 'alias', 'source_column', 'column'],
      required: true,
      type: 'string',
      description: 'Physical source column or token in the incoming dataset (e.g. KOSTL, UD1_CostCenter).',
      example: 'UD1_CostCenter'
    },
    {
      name: 'target_canonical_concept',
      aliases: ['canonical_concept_id', 'canonical_concept', 'target', 'concept_id'],
      required: true,
      type: 'string',
      description: 'Target canonical concept ID from the active catalog.',
      example: 'financial.cost_center'
    },
    {
      name: 'override_type',
      aliases: ['type', 'entry_type', 'rule_type'],
      required: true,
      type: 'enum',
      allowedValues: ['alias_promotion', 'domain_override', 'pii_tag', 'type_mapping'],
      description: 'Deterministic override behavior mode.',
      example: 'alias_promotion'
    },
    {
      name: 'source_system',
      aliases: ['system', 'app', 'application'],
      required: false,
      type: 'string',
      description: 'Originating enterprise system for scoped application.',
      example: 'OneStream XF'
    },
    {
      name: 'steward',
      aliases: ['author', 'created_by', 'owner'],
      required: false,
      type: 'string',
      description: 'Data steward attributing and taking governance ownership.',
      example: 'Financial Consolidation Lead'
    },
    {
      name: 'notes',
      aliases: ['description', 'reason', 'note', 'komentar'],
      required: false,
      type: 'string',
      description: 'Business rationale for this deterministic override.',
      example: 'Direct mapping for user dimension 1 cost center consolidation.'
    },
    {
      name: 'id',
      aliases: ['rule_id'],
      required: false,
      type: 'string',
      description: 'Optional explicit rule ID. If omitted, generated automatically.',
      example: 'ov_onestream_01'
    }
  ],
  sampleJson: [
    {
      source_field: "UD1_CostCenter",
      target_canonical_concept: "financial.cost_center",
      override_type: "alias_promotion",
      source_system: "OneStream XF",
      steward: "Financial Consolidation Lead",
      notes: "Direct mapping for user dimension 1 cost center."
    },
    {
      source_field: "KUNNR",
      target_canonical_concept: "customer.id",
      override_type: "alias_promotion",
      source_system: "SAP ECC",
      steward: "Enterprise Data Lead",
      notes: "SAP standard customer number mapping."
    }
  ],
  sampleCsv: `source_field,target_canonical_concept,override_type,source_system,steward,notes
UD1_CostCenter,financial.cost_center,alias_promotion,OneStream XF,Financial Consolidation Lead,Direct mapping for user dimension 1 cost center.
KUNNR,customer.id,alias_promotion,SAP ECC,Enterprise Data Lead,SAP standard customer number mapping.
EMP_EMAIL,employee.email,pii_tag,Workday HR,Compliance Steward,Tags field as confidential personal email.`
};

// Validation Helper Functions
export const validateDataRow = (
  row: Record<string, any>,
  rowNumber: number,
  schema: ModelSchemaSpec,
  existingIds?: Set<string>
): { issues: ValidationIssue[]; cleanRecord: Record<string, any>; isValid: boolean } => {
  const issues: ValidationIssue[] = [];
  const cleanRecord: Record<string, any> = {};

  // Build key lookup mapping
  const normalizedRowKeys = new Map<string, string>();
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    normalizedRowKeys.set(cleanKey, key);
  }

  for (const field of schema.fields) {
    let rawVal: any = undefined;

    // Check canonical name
    const matchCanonical = normalizedRowKeys.get(field.name.toLowerCase());
    if (matchCanonical !== undefined) {
      rawVal = row[matchCanonical];
    } else {
      // Check aliases
      for (const alias of field.aliases) {
        const matchAlias = normalizedRowKeys.get(alias.toLowerCase());
        if (matchAlias !== undefined) {
          rawVal = row[matchAlias];
          break;
        }
      }
    }

    // Required check
    if (field.required && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
      issues.push({
        rowNumber,
        field: field.name,
        severity: 'error',
        message: `Missing required field "${field.name}".`
      });
      continue;
    }

    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      cleanRecord[field.name] = '';
      continue;
    }

    const strVal = String(rawVal).trim();

    // Enum validation
    if (field.type === 'enum' && field.allowedValues) {
      const lower = strVal.toLowerCase();
      const validMatch = field.allowedValues.find(v => v.toLowerCase() === lower);
      if (!validMatch) {
        issues.push({
          rowNumber,
          field: field.name,
          severity: 'error',
          message: `Invalid value "${strVal}". Allowed values are: ${field.allowedValues.join(', ')}`,
          value: strVal
        });
      } else {
        cleanRecord[field.name] = validMatch;
      }
      continue;
    }

    // Identifier validation (e.g. concept_id should usually be dot or underscore separated)
    if (field.type === 'identifier') {
      const cleanIdent = strVal.toLowerCase().replace(/\s+/g, '_');
      cleanRecord[field.name] = cleanIdent;

      if (cleanIdent.length < 2) {
        issues.push({
          rowNumber,
          field: field.name,
          severity: 'error',
          message: `Identifier "${cleanIdent}" is too short.`,
          value: cleanIdent
        });
      } else if (existingIds && existingIds.has(cleanIdent)) {
        issues.push({
          rowNumber,
          field: field.name,
          severity: 'warning',
          message: `ID "${cleanIdent}" already exists in the catalog. It will be updated/merged.`,
          value: cleanIdent
        });
      }
      continue;
    }

    // Boolean check
    if (field.type === 'boolean') {
      const lower = strVal.toLowerCase();
      const isTrue = lower === 'true' || lower === 'yes' || lower === '1';
      cleanRecord[field.name] = isTrue;
      continue;
    }

    cleanRecord[field.name] = strVal;
  }

  const hasErrors = issues.some(i => i.severity === 'error');
  return { issues, cleanRecord, isValid: !hasErrors };
};
