import { PIIType, PIIEntity, PIIMaskingResult } from '../types';

/**
 * Enterprise PII Regex Patterns & Extractors
 * Supports international formats and regional European (PIB, JMBG, IBAN) formats.
 */
const PII_PATTERNS: { type: PIIType; pattern: RegExp; confidence: number }[] = [
  // Email Addresses
  {
    type: 'email',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    confidence: 0.99
  },
  // IBANs & Bank Account Numbers
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g,
    confidence: 0.98
  },
  // Credit Card Numbers (Visa, MasterCard, Amex, etc.)
  {
    type: 'credit_card',
    pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g,
    confidence: 0.95
  },
  // JMBG / European 13-digit National ID
  {
    type: 'national_id',
    pattern: /\b(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])[0-9]{3}[0-9]{6}\b/g,
    confidence: 0.96
  },
  // Tax IDs / PIB (8 to 10 digits with optional prefix)
  {
    type: 'tax_id',
    pattern: /\b(?:PIB|TAX|VAT|ID)?:?\s*([1-9][0-9]{7,9})\b/gi,
    confidence: 0.92
  },
  // US SSN
  {
    type: 'national_id',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.95
  },
  // Phone Numbers (International & Regional)
  {
    type: 'phone',
    pattern: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
    confidence: 0.90
  },
  // IPv4 Addresses
  {
    type: 'custom',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    confidence: 0.94
  }
];

export interface PIISettings {
  maskEmails: boolean;
  maskPhones: boolean;
  maskTaxIds: boolean;
  maskIbans: boolean;
  maskNationalIds: boolean;
  maskCreditCards: boolean;
  maskIps: boolean;
}

export const DEFAULT_PII_SETTINGS: PIISettings = {
  maskEmails: true,
  maskPhones: true,
  maskTaxIds: true,
  maskIbans: true,
  maskNationalIds: true,
  maskCreditCards: true,
  maskIps: true
};

/**
 * Scans and masks PII entities from a string or object payload.
 * Generates an immutable token map for deterministic reverse rehydration.
 */
export function maskPIIText(
  text: string,
  settings: PIISettings = DEFAULT_PII_SETTINGS,
  existingCounters?: Record<string, number>,
  existingDict?: Record<string, string>
): {
  maskedText: string;
  detectedEntities: PIIEntity[];
  counters: Record<string, number>;
  dict: Record<string, string>;
} {
  let result = text;
  const detectedEntities: PIIEntity[] = [];
  const counters: Record<string, number> = existingCounters ? { ...existingCounters } : {};
  const dict: Record<string, string> = existingDict ? { ...existingDict } : {};

  // Helper to get or create token
  const getOrCreateToken = (type: PIIType, rawValue: string): string => {
    // Check if we already mapped this exact value
    for (const [token, val] of Object.entries(dict)) {
      if (val === rawValue) {
        return token;
      }
    }
    const count = (counters[type] || 0) + 1;
    counters[type] = count;
    const token = `[MASKED_${type.toUpperCase()}_${count}]`;
    dict[token] = rawValue;
    return token;
  };

  for (const item of PII_PATTERNS) {
    if (item.type === 'email' && !settings.maskEmails) continue;
    if (item.type === 'phone' && !settings.maskPhones) continue;
    if (item.type === 'tax_id' && !settings.maskTaxIds) continue;
    if (item.type === 'iban' && !settings.maskIbans) continue;
    if (item.type === 'national_id' && !settings.maskNationalIds) continue;
    if (item.type === 'credit_card' && !settings.maskCreditCards) continue;
    if (item.type === 'custom' && !settings.maskIps) continue;

    // Reset regex index
    item.pattern.lastIndex = 0;
    const matches = Array.from(result.matchAll(item.pattern));

    for (const match of matches) {
      const rawValue = match[0];
      // Skip if already masked token or very short
      if (rawValue.startsWith('[MASKED_') || rawValue.length < 3) continue;

      const token = getOrCreateToken(item.type, rawValue);
      result = result.replace(rawValue, token);

      detectedEntities.push({
        id: `pii_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: item.type,
        rawValue,
        maskedToken: token,
        location: `offset_${match.index ?? 0}`,
        confidence: item.confidence
      });
    }
  }

  return {
    maskedText: result,
    detectedEntities,
    counters,
    dict
  };
}

/**
 * Deep masks any JSON object / array / string data structure
 */
export function maskPIIPayload(
  data: any,
  settings: PIISettings = DEFAULT_PII_SETTINGS
): PIIMaskingResult {
  const detectedEntities: PIIEntity[] = [];
  let counters: Record<string, number> = {};
  let dict: Record<string, string> = {};

  function traverseAndMask(obj: any): any {
    if (typeof obj === 'string') {
      const { maskedText, detectedEntities: newEntities, counters: newCounters, dict: newDict } = maskPIIText(
        obj,
        settings,
        counters,
        dict
      );
      detectedEntities.push(...newEntities);
      counters = newCounters;
      dict = newDict;
      return maskedText;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => traverseAndMask(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = traverseAndMask(value);
      }
      return result;
    }
    return obj;
  }

  const sanitizedPayload = traverseAndMask(data);

  return {
    sanitizedPayload,
    detectedEntities,
    count: detectedEntities.length,
    isSanitized: detectedEntities.length > 0,
    mappingDict: dict
  };
}

/**
 * Rehydrates masked text back with original values if authorized for local viewing
 */
export function unmaskPIIText(text: string, mappingDict: Record<string, string>): string {
  if (!text || !mappingDict) return text;
  let result = text;
  for (const [token, rawValue] of Object.entries(mappingDict)) {
    result = result.replaceAll(token, rawValue);
  }
  return result;
}
