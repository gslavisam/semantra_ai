// Client-side AI Enrichment helper communicating with Semantra server-side AI engine

export interface FieldSuggestion {
  value: any;
  reason: string;
  confidence: number;
}

export interface EnrichedItemResult {
  concept_id: string;
  suggestedFields: Record<string, FieldSuggestion>;
}

export interface EnrichmentResponse {
  enrichedItems: EnrichedItemResult[];
  summary?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  circuitBreakerState?: string;
  piiSanitizedCount?: number;
}

export async function requestAIEnrichment(
  type: 'canonical' | 'knowledge',
  items: any[],
  catalogContext?: { knownDomains?: string[]; sampleCanonicalIds?: string[] }
): Promise<EnrichmentResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('/api/ai/enrich-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        items,
        catalogContext
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Enrichment request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.warn("AI enrichment server call failed or timed out, generating local deterministic suggestions:", err);
    // Offline / client fallback
    return generateLocalDeterministicEnrichment(type, items);
  }
}

// Fallback client-side generator in case backend is unreachable
function generateLocalDeterministicEnrichment(type: 'canonical' | 'knowledge', items: any[]): EnrichmentResponse {
  const enrichedItems: EnrichedItemResult[] = items.map((item, idx) => {
    const conceptId = String(item.concept_id || item.id || `row_${idx + 1}`).toLowerCase();
    const displayName = item.display_name || item.canonical_name || item.name || conceptId;
    const entity = item.entity || (conceptId.includes('.') ? conceptId.split('.')[0] : 'general');
    const attribute = item.attribute || (conceptId.includes('.') ? conceptId.split('.').slice(1).join('_') : conceptId);
    const tokens = `${conceptId} ${displayName} ${entity} ${attribute}`.toLowerCase();

    const suggestedFields: Record<string, FieldSuggestion> = {};

    if (type === 'canonical') {
      if (!item.description || item.description.trim() === '') {
        let desc = `Governed semantic definition for ${displayName || attribute}.`;
        if (tokens.includes('cost') || tokens.includes('center') || tokens.includes('kostl')) {
          desc = 'Operational cost center code representing an organizational unit responsible for budget control.';
        } else if (tokens.includes('tax') || tokens.includes('vat') || tokens.includes('pib')) {
          desc = 'National tax identification number or VAT registration code for tax compliance.';
        } else if (tokens.includes('cust') || tokens.includes('client') || tokens.includes('kunnr')) {
          desc = 'Primary customer account identifier across enterprise CRM and billing systems.';
        } else if (tokens.includes('salary') || tokens.includes('plata')) {
          desc = 'Employee compensation amount or gross base salary figure.';
        }
        suggestedFields.description = { value: desc, reason: 'Client semantic heuristic', confidence: 0.85 };
      }

      if (!item.aliases || item.aliases.trim() === '') {
        const al: string[] = [];
        if (attribute) al.push(attribute.toUpperCase());
        if (tokens.includes('cost_center') || tokens.includes('kostl')) al.push('KOSTL', 'CC_ID', 'COST_CTR');
        else if (tokens.includes('tax') || tokens.includes('vat')) al.push('STCEG', 'TAX_ID', 'VAT_REG');
        else if (tokens.includes('customer')) al.push('KUNNR', 'CUST_ID', 'ACCOUNT_NUM');
        else al.push(`${entity.toUpperCase()}_${attribute.toUpperCase()}`);
        suggestedFields.aliases = { value: al.join('; '), reason: 'Column synonym generator', confidence: 0.90 };
      }

      const isPii = tokens.includes('ssn') || tokens.includes('tax') || tokens.includes('pib') ||
                    tokens.includes('email') || tokens.includes('salary') || tokens.includes('iban');
      if (item.is_pii === undefined || item.is_pii === false || item.is_pii === '') {
        if (isPii) {
          suggestedFields.is_pii = { value: true, reason: 'PII token detected in naming', confidence: 0.95 };
        }
      }
    } else {
      if (!item.domain || item.domain === 'General Knowledge' || item.domain.trim() === '') {
        let dom = 'Enterprise Master Data';
        if (tokens.includes('hr') || tokens.includes('job') || tokens.includes('salary')) dom = 'Ljudski Resursi (HR)';
        else if (tokens.includes('finance') || tokens.includes('cost') || tokens.includes('tax')) dom = 'Finance & Accounting';
        suggestedFields.domain = { value: dom, reason: 'Domain inference', confidence: 0.88 };
      }

      if (!item.linked_canonical_concepts || item.linked_canonical_concepts.trim() === '') {
        let target = `${entity}.${attribute}`;
        if (tokens.includes('cost_center')) target = 'financial.cost_center';
        else if (tokens.includes('tax')) target = 'customer.tax_id';
        suggestedFields.linked_canonical_concepts = { value: target, reason: 'Canonical concept alignment', confidence: 0.90 };
      }

      const isPii = tokens.includes('ssn') || tokens.includes('tax') || tokens.includes('salary') || tokens.includes('email');
      if (!item.linked_pii || item.linked_pii === 'no') {
        if (isPii) {
          suggestedFields.linked_pii = { value: 'yes', reason: 'Privacy token match', confidence: 0.92 };
          suggestedFields.linked_pii_tags = { value: 'confidential_pii', reason: 'Tag suggestion', confidence: 0.90 };
        }
      }
    }

    return {
      concept_id: conceptId,
      suggestedFields
    };
  });

  return {
    enrichedItems,
    summary: "Offline rule-based fallback enrichment engaged.",
    fallbackUsed: true
  };
}
