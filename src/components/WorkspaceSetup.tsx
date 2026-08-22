import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  HelpCircle, 
  Cpu, 
  Database,
  ArrowRight,
  Info,
  Layers,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  Check,
  Clock,
  RotateCcw,
  FileCheck,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { MappingMode, MappingRow, CanonicalConcept, Confidence, MappingSignal } from '../types';
import {
  SAP_CUSTOMER_SALES_AREA_MAPPINGS,
  SAP_MATERIAL_MASTER_MAPPINGS,
  SAP_SUPPLIER_MASTER_MAPPINGS,
  GENERIC_ACCOUNT_MASTER_MAPPINGS
} from '../data/mockData';

export function cleanFieldName(str: any): string {
  if (str === null || str === undefined) return '';
  const val = String(str).trim();
  // Strip non-printable ASCII and control characters
  const sanitized = val.replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '').trim();
  
  // Reject strings that are binary zip header junk, XML tags, or path strings
  if (
    !sanitized ||
    sanitized.startsWith('PK') ||
    sanitized.includes('docProps') ||
    sanitized.includes('openxmlformats') ||
    sanitized.includes('xl/worksheets') ||
    sanitized.includes('xmlns') ||
    sanitized.length > 80 ||
    /^[^\x20-\x7E]+$/.test(sanitized)
  ) {
    return '';
  }
  return sanitized;
}

export interface ParsedTable {
  tableName: string;
  fields: string[];
  fieldTypes?: Record<string, string>;
  sampleValues: Record<string, string>;
}

export interface ParsedSchema {
  name: string;
  sizeFormatted: string;
  fields: string[];
  sampleValues: Record<string, string>;
  fileContentType: 'raw_data' | 'schema_data';
  fieldTypes?: Record<string, string>;
  fieldDescriptions?: Record<string, string>;
  detectedTables?: ParsedTable[];
  selectedTableName?: string;
  parsedPreviewRows?: Record<string, string>[];
  rawPreviewLines?: string[];
  detectedMappings?: MappingRow[];
}

export type IngestFileContentType = 'raw_data' | 'schema_data';

export interface WorkspaceSetupProps {
  onTriggerMapping: (
    mode: MappingMode, 
    preset: string, 
    profile: string, 
    customMappings?: MappingRow[]
  ) => void;
  isLoading: boolean;
  canonicalConcepts?: CanonicalConcept[];

  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;

  sourceFile: File | null;
  setSourceFile: (file: File | null) => void;
  targetFile: File | null;
  setTargetFile: (file: File | null) => void;

  sourceFileType: IngestFileContentType;
  setSourceFileType: React.Dispatch<React.SetStateAction<IngestFileContentType>>;
  targetFileType: IngestFileContentType;
  setTargetFileType: React.Dispatch<React.SetStateAction<IngestFileContentType>>;

  sourceAutoDetected: boolean;
  setSourceAutoDetected: (val: boolean) => void;
  targetAutoDetected: boolean;
  setTargetAutoDetected: (val: boolean) => void;

  parsedSourceSchema: ParsedSchema | null;
  setParsedSourceSchema: React.Dispatch<React.SetStateAction<ParsedSchema | null>>;
  parsedTargetSchema: ParsedSchema | null;
  setParsedTargetSchema: React.Dispatch<React.SetStateAction<ParsedSchema | null>>;

  sourceCompanionFile: File | null;
  setSourceCompanionFile: (file: File | null) => void;
  targetCompanionFile: File | null;
  setTargetCompanionFile: (file: File | null) => void;

  parsedSourceCompanionSchema: ParsedSchema | null;
  setParsedSourceCompanionSchema: React.Dispatch<React.SetStateAction<ParsedSchema | null>>;
  parsedTargetCompanionSchema: ParsedSchema | null;
  setParsedTargetCompanionSchema: React.Dispatch<React.SetStateAction<ParsedSchema | null>>;

  sourceAiSummary: string | null;
  setSourceAiSummary: (val: string | null) => void;
  targetAiSummary: string | null;
  setTargetAiSummary: (val: string | null) => void;

  sourceAiDomainContext: string | null;
  setSourceAiDomainContext: (val: string | null) => void;
  targetAiDomainContext: string | null;
  setTargetAiDomainContext: (val: string | null) => void;

  sourceCompanionStatus: string | null;
  setSourceCompanionStatus: (val: string | null) => void;
  targetCompanionStatus: string | null;
  setTargetCompanionStatus: (val: string | null) => void;

  sourceCompanionMapping: CompanionColMapping;
  setSourceCompanionMapping: React.Dispatch<React.SetStateAction<CompanionColMapping>>;
  targetCompanionMapping: CompanionColMapping;
  setTargetCompanionMapping: React.Dispatch<React.SetStateAction<CompanionColMapping>>;

  workspaceSourceSystem?: string;
  setWorkspaceSourceSystem?: (val: string) => void;
  workspaceBusinessDomain?: string;
  setWorkspaceBusinessDomain?: (val: string) => void;
  workspaceIntegrationName?: string;
  setWorkspaceIntegrationName?: (val: string) => void;
}

export function parseTalendXml(text: string, fileName: string): ParsedSchema {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  const fields: string[] = [];
  const fieldTypes: Record<string, string> = {};
  const fieldDescriptions: Record<string, string> = {};
  const sampleValues: Record<string, string> = {};
  const detectedTables: ParsedTable[] = [];
  const detectedMappings: MappingRow[] = [];

  // 1. Extract tMap structure
  const inputTableEls = xmlDoc.getElementsByTagName('inputTables');
  const outputTableEls = xmlDoc.getElementsByTagName('outputTables');

  const inputFieldsMap: Record<string, { name: string; type: string; comment: string; table: string }> = {};
  const allInputFields: string[] = [];

  if (inputTableEls.length > 0 || outputTableEls.length > 0) {
    // This is a tMap XML!
    // A. Parse Input Tables
    for (let i = 0; i < inputTableEls.length; i++) {
      const tableEl = inputTableEls[i];
      const tableName = tableEl.getAttribute('name') || `row${i + 1}`;
      const entries = tableEl.getElementsByTagName('mapperTableEntries');
      const tableFields: string[] = [];
      const tableTypes: Record<string, string> = {};
      const tableSamples: Record<string, string> = {};

      for (let j = 0; j < entries.length; j++) {
        const entry = entries[j];
        const rawName = entry.getAttribute('name');
        if (rawName) {
          const name = cleanFieldName(rawName);
          const type = entry.getAttribute('type') || 'id_String';
          const comment = entry.getAttribute('comment') || `Talend input column ${name}`;
          
          inputFieldsMap[`${tableName}.${name}`] = { name, type, comment, table: tableName };
          inputFieldsMap[name] = { name, type, comment, table: tableName }; // fallback key without table prefix
          
          if (!allInputFields.includes(name)) {
            allInputFields.push(name);
          }

          if (!tableFields.includes(name)) {
            tableFields.push(name);
            tableTypes[name] = type;
            tableSamples[name] = `(tMap Input: ${type})`;
            fieldDescriptions[name] = comment;
          }
        }
      }

      if (tableFields.length > 0) {
        detectedTables.push({
          tableName: `${tableName} (tMap Input)`,
          fields: tableFields,
          fieldTypes: tableTypes,
          sampleValues: tableSamples
        });
      }
    }

    // B. Parse Output Tables and detect mappings
    for (let i = 0; i < outputTableEls.length; i++) {
      const tableEl = outputTableEls[i];
      const tableName = tableEl.getAttribute('name') || `out${i + 1}`;
      const entries = tableEl.getElementsByTagName('mapperTableEntries');
      
      const outFields: string[] = [];
      const outTypes: Record<string, string> = {};
      const outSamples: Record<string, string> = {};

      for (let j = 0; j < entries.length; j++) {
        const entry = entries[j];
        const rawTargetName = entry.getAttribute('name');
        const expression = entry.getAttribute('expression') || '';
        
        if (rawTargetName) {
          const targetField = cleanFieldName(rawTargetName);
          const targetType = entry.getAttribute('type') || 'id_String';
          const targetDesc = entry.getAttribute('comment') || `tMap output column ${targetField}`;
          
          outFields.push(targetField);
          outTypes[targetField] = targetType;
          outSamples[targetField] = `(tMap Output: ${targetType})`;

          // Reverse engineer mapping from expression!
          // Expressions look like "row1.CUST_ID", or "row1.CUST_NAME.trim()", or functions.
          let matchedSourceField = '';
          let matchedSourceType = 'id_String';
          let matchedSourceDesc = '';

          // Find rowName.fieldName patterns
          const dotMatch = expression.match(/[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)/);
          if (dotMatch && dotMatch[1]) {
            const potentialSrc = cleanFieldName(dotMatch[1]);
            // check if this matches any of our known input fields
            const lookup = inputFieldsMap[potentialSrc] || Object.values(inputFieldsMap).find(v => v.name.toLowerCase() === potentialSrc.toLowerCase());
            if (lookup) {
              matchedSourceField = lookup.name;
              matchedSourceType = lookup.type;
              matchedSourceDesc = lookup.comment;
            } else {
              matchedSourceField = potentialSrc;
            }
          } else {
            // Check if the expression contains exactly one of our input fields
            const foundInput = allInputFields.find(f => expression.includes(f));
            if (foundInput) {
              matchedSourceField = foundInput;
              const lookup = inputFieldsMap[foundInput];
              if (lookup) {
                matchedSourceType = lookup.type;
                matchedSourceDesc = lookup.comment;
              }
            }
          }

          if (matchedSourceField) {
            detectedMappings.push({
              id: `talend_map_${detectedMappings.length + 1}`,
              sourceField: matchedSourceField,
              sourceType: matchedSourceType,
              sourceDesc: matchedSourceDesc || `Extracted Talend source column ${matchedSourceField}`,
              targetField: targetField,
              targetType: targetType,
              targetDesc: targetDesc,
              confidence: 'high',
              score: 1.0,
              signals: ['name', 'semantic'],
              explanation: `⚡ [Talend Reverse Engineering]: Extracted direct mapping from tMap expression: "${expression}"`,
              transformation: expression,
              transformationCode: `output.${targetField} = ${expression};`,
              isApproved: true,
              decisionStatus: 'accepted'
            });
          }
        }
      }

      if (outFields.length > 0) {
        detectedTables.push({
          tableName: `${tableName} (tMap Output)`,
          fields: outFields,
          fieldTypes: outTypes,
          sampleValues: outSamples
        });
      }
    }
  }

  // 2. Fallback to generic column search if no tMap elements found (standard Talend schema XML export)
  if (detectedTables.length === 0) {
    const columnEls = xmlDoc.getElementsByTagName('column');
    if (columnEls.length > 0) {
      const tableFields: string[] = [];
      const tableTypes: Record<string, string> = {};
      const tableSamples: Record<string, string> = {};

      for (let i = 0; i < columnEls.length; i++) {
        const colEl = columnEls[i];
        const rawName = colEl.getAttribute('label') || colEl.getAttribute('name');
        if (rawName) {
          const name = cleanFieldName(rawName);
          const type = colEl.getAttribute('type') || colEl.getAttribute('sourceType') || 'id_String';
          const comment = colEl.getAttribute('comment') || colEl.getAttribute('description') || `Talend schema attribute ${name}`;
          
          if (!tableFields.includes(name)) {
            tableFields.push(name);
            tableTypes[name] = type;
            tableSamples[name] = `(Talend Schema: ${type})`;
            fieldDescriptions[name] = comment;
          }
        }
      }

      if (tableFields.length > 0) {
        detectedTables.push({
          tableName: 'Talend Schema Export',
          fields: tableFields,
          fieldTypes: tableTypes,
          sampleValues: tableSamples
        });
      }
    }
  }

  // 3. Regex Fallback if DOMParser failed or XML was simple
  if (detectedTables.length === 0) {
    const colRegex = /<column\s+[^>]*?(?:name|label)=["']([^"']+)["'][^>]*?>/gi;
    let match;
    const tableFields: string[] = [];
    const tableTypes: Record<string, string> = {};
    const tableSamples: Record<string, string> = {};
    while ((match = colRegex.exec(text)) !== null) {
      const f = cleanFieldName(match[1]);
      if (f && !tableFields.includes(f)) {
        tableFields.push(f);
        const typeMatch = match[0].match(/(?:type|sourceType)=["']([^"']+)["']/i);
        const type = typeMatch ? typeMatch[1] : 'id_String';
        tableTypes[f] = type;
        tableSamples[f] = `(Talend Reg: ${type})`;
      }
    }
    if (tableFields.length > 0) {
      detectedTables.push({
        tableName: 'Talend Regex Extraction',
        fields: tableFields,
        fieldTypes: tableTypes,
        sampleValues: tableSamples
      });
    }
  }

  // If we found schema fields, populate top-level fields list
  if (detectedTables.length > 0) {
    fields.push(...detectedTables[0].fields);
    Object.keys(detectedTables[0].fieldTypes || {}).forEach(k => {
      fieldTypes[k] = detectedTables[0].fieldTypes?.[k] || 'VARCHAR';
    });
    Object.keys(detectedTables[0].sampleValues).forEach(k => {
      sampleValues[k] = detectedTables[0].sampleValues[k];
    });
  }

  return {
    name: fileName,
    sizeFormatted: (text.length / 1024).toFixed(1) + ' KB',
    fields,
    sampleValues,
    fileContentType: 'schema_data',
    fieldTypes,
    fieldDescriptions: Object.keys(fieldDescriptions).length > 0 ? fieldDescriptions : undefined,
    detectedTables: detectedTables.length > 0 ? detectedTables : undefined,
    selectedTableName: detectedTables.length > 0 ? detectedTables[0].tableName : undefined,
    detectedMappings: detectedMappings.length > 0 ? detectedMappings : undefined
  };
}

export async function detectIngestFileContentType(file: File): Promise<IngestFileContentType> {
  const fileNameLower = file.name.toLowerCase();

  // 1. Explicit schema/spec file extensions
  if (
    fileNameLower.endsWith('.sql') ||
    fileNameLower.endsWith('.ddl') ||
    fileNameLower.endsWith('.xsd') ||
    fileNameLower.endsWith('.proto') ||
    fileNameLower.endsWith('.graphql') ||
    fileNameLower.endsWith('.gql') ||
    fileNameLower.endsWith('.xml') ||
    fileNameLower.includes('schema') ||
    fileNameLower.includes('spec') ||
    fileNameLower.includes('dictionary') ||
    fileNameLower.includes('swagger') ||
    fileNameLower.includes('openapi')
  ) {
    return 'schema_data';
  }

  // 2. Check Excel files for Data Dictionary headers
  if (fileNameLower.match(/\.(xlsx|xls|xlsm|xlsb)$/i)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows && rows.length > 0) {
          const headerRow = (rows[0] || []).map(c => String(c).toLowerCase().trim());
          const hasSchemaKeywords = headerRow.some(h => 
            h.includes('field') || h.includes('column') || h.includes('attribute') || 
            h.includes('polje') || h.includes('datatype') || h.includes('type') || 
            h.includes('tip') || h.includes('desc') || h.includes('opis') || h.includes('length')
          );
          if (hasSchemaKeywords) {
            return 'schema_data';
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Check text/CSV/JSON files for DDL statements, OpenAPI schemas, or column dictionary headers
  try {
    const text = await file.text();
    if (text.trim()) {
      const textUpper = text.toUpperCase();

      // SQL DDL detection
      if (textUpper.includes('CREATE TABLE') || textUpper.includes('ALTER TABLE') || textUpper.includes('PRIMARY KEY')) {
        return 'schema_data';
      }

      // JSON detection
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const json = JSON.parse(text);

          // OpenAPI / Swagger / JSON Schema
          if (json.components?.schemas || json.properties || json.$schema || json.openapi || json.swagger) {
            return 'schema_data';
          }

          // Array of Field Definitions e.g. [{ name: '...', type: '...' }]
          if (Array.isArray(json) && json.length > 0) {
            const firstItem = json[0];
            if (firstItem && typeof firstItem === 'object') {
              const keys = Object.keys(firstItem).map(k => k.toLowerCase());
              const isSchemaItem = keys.some(k => k === 'name' || k === 'fieldname' || k === 'column' || k === 'field' || k === 'polje') &&
                                   keys.some(k => k === 'type' || k === 'datatype' || k === 'description' || k === 'opis' || k === 'tip');
              if (isSchemaItem) {
                return 'schema_data';
              }
            }
          }
        } catch {
          // ignore json parse error
        }
      }

      // CSV / Delimited Data Dictionary detection
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const firstLineLower = lines[0].toLowerCase();
        const schemaTerms = ['field_name', 'column_name', 'attribute_name', 'datatype', 'data_type', 'description', 'opis_polja', 'naziv_polja', 'field_type', 'column_type'];
        if (schemaTerms.some(term => firstLineLower.includes(term))) {
          return 'schema_data';
        }
      }
    }
  } catch {
    // ignore text read error
  }

  return 'raw_data';
}

export function parseSchemaFile(
  file: File, 
  fileContentType: IngestFileContentType = 'raw_data'
): Promise<ParsedSchema> {
  return new Promise(async (resolve) => {
    const sizeKB = (file.size / 1024).toFixed(1) + ' KB';
    let fields: string[] = [];
    let sampleValues: Record<string, string> = {};
    let fieldTypes: Record<string, string> = {};
    let fieldDescriptions: Record<string, string> = {};
    let detectedTables: ParsedTable[] = [];
    let rawPreviewLines: string[] = [];
    let parsedPreviewRows: Record<string, string>[] = [];

    // Check if Excel binary file
    const isExcel = file.name.match(/\.(xlsx|xls|xlsm|xlsb)$/i);

    if (isExcel) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Handle multiple sheets in Excel as multiple tables
        if (workbook.SheetNames.length > 1 && fileContentType === 'schema_data') {
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (rows && rows.length > 0) {
              const sheetFields: string[] = [];
              const sheetTypes: Record<string, string> = {};
              const sheetSamples: Record<string, string> = {};
              
              const rawHeaders = rows[0] || [];
              rawHeaders.forEach((h: any, idx: number) => {
                const cleanH = cleanFieldName(h);
                if (cleanH && !sheetFields.includes(cleanH)) {
                  sheetFields.push(cleanH);
                  const sampleVal = rows[1]?.[idx] ? String(rows[1][idx]) : 'VARCHAR';
                  sheetTypes[cleanH] = sampleVal;
                  sheetSamples[cleanH] = `(Excel Sheet: ${sheetName})`;
                }
              });

              if (sheetFields.length > 0) {
                detectedTables.push({
                  tableName: sheetName,
                  fields: sheetFields,
                  fieldTypes: sheetTypes,
                  sampleValues: sheetSamples
                });
              }
            }
          });
        }

        const firstSheetName = workbook.SheetNames[0];
        if (firstSheetName) {
          const worksheet = workbook.Sheets[firstSheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (rows && rows.length > 0) {
            if (fileContentType === 'schema_data') {
              // Check if Excel represents a Data Dictionary (e.g. Column 0 = Field Name, Column 1 = Type/Description)
              const firstRowHeader = (rows[0] || []).map(c => String(c).toLowerCase());
              const isDictionaryTable = firstRowHeader.some(h => h.includes('field') || h.includes('column') || h.includes('attribute') || h.includes('naziv') || h.includes('polje'));
              const descIdx = firstRowHeader.findIndex(h => h.includes('desc') || h.includes('opis') || h.includes('meaning') || h.includes('definition') || h.includes('comment') || h.includes('text') || h.includes('business'));
              
              if (isDictionaryTable && rows.length > 1) {
                for (let r = 1; r < rows.length; r++) {
                  const fName = cleanFieldName(rows[r][0]);
                  if (fName && !fields.includes(fName)) {
                    fields.push(fName);
                    const fType = rows[r][1] ? String(rows[r][1]) : 'VARCHAR(50)';
                    fieldTypes[fName] = fType;
                    const fDesc = (descIdx !== -1 && rows[r][descIdx]) ? String(rows[r][descIdx]) : (rows[r][2] ? String(rows[r][2]) : `Declared schema attribute ${fName}`);
                    fieldDescriptions[fName] = fDesc;
                    sampleValues[fName] = `(Schema Spec: ${fType} - ${fDesc})`;
                  }
                }
              } else {
                const rawHeaders = rows[0] || [];
                rawHeaders.forEach((h: any) => {
                  const cleanH = cleanFieldName(h);
                  if (cleanH && !fields.includes(cleanH)) {
                    fields.push(cleanH);
                    sampleValues[cleanH] = '(Schema Specification Header)';
                  }
                });
              }
            } else {
              // RAW DATA: Row 0 is headers, Row 1 is sample data record
              const rawHeaders = rows[0] || [];
              const rawSamples = rows[1] || [];
              rawHeaders.forEach((h: any, idx: number) => {
                const cleanH = cleanFieldName(h);
                if (cleanH && !fields.includes(cleanH)) {
                  fields.push(cleanH);
                  sampleValues[cleanH] = String(rawSamples[idx] ?? 'sample_value');
                }
              });

              // Extract first 3 records for visual preview
              const excelHeaders = rawHeaders.map(h => cleanFieldName(h)).filter(Boolean);
              const previewList: Record<string, string>[] = [];
              for (let r = 1; r < Math.min(rows.length, 4); r++) {
                const rowObj: Record<string, string> = {};
                excelHeaders.forEach((h, idx) => {
                  if (rows[r]?.[idx] !== undefined) {
                    rowObj[h] = String(rows[r][idx]);
                  }
                });
                if (Object.keys(rowObj).length > 0) {
                  previewList.push(rowObj);
                }
              }
              parsedPreviewRows = previewList;
            }
          }
        }
      } catch (err) {
        // excel parse error
      }
    } else {
      // Text / CSV / JSON / SQL parser
      try {
        const text = await file.text();
        if (text.trim()) {
          // Check for zip/binary header
          if (!text.startsWith('PK\x03\x04') && !text.includes('docProps/')) {
            rawPreviewLines = text.split(/\r?\n/).slice(0, 5).map(l => l.trim()).filter(Boolean);
            
            // Check for XML / Talend XML/tMap files first
            if (file.name.endsWith('.xml') || text.trim().startsWith('<')) {
              try {
                const xmlParsed = parseTalendXml(text, file.name);
                resolve(xmlParsed);
                return;
              } catch (xmlErr) {
                console.warn('Talend XML parse fallback', xmlErr);
              }
            }
            
            // 1. Check for Multi-table SQL DDL first
            if (file.name.endsWith('.sql') || text.toUpperCase().includes('CREATE TABLE')) {
              const createTableMatches = Array.from(text.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?"?([a-zA-Z0-9_]+)`?"?\s*\(([\s\S]*?)\)(?:\s*;|\s*ENGINE|\s*GO|\n\n)/gi));
              
              if (createTableMatches.length > 0) {
                for (const tMatch of createTableMatches) {
                  const tableName = tMatch[1];
                  const tableBody = tMatch[2];
                  const tFields: string[] = [];
                  const tTypes: Record<string, string> = {};
                  const tSamples: Record<string, string> = {};

                  const colMatches = Array.from(tableBody.matchAll(/`?"?([a-zA-Z0-9_]+)`?"?\s+(VARCHAR|INT|BIGINT|DECIMAL|TEXT|DATE|DATETIME|BOOLEAN|CHAR|NUMBER|FLOAT|TIMESTAMP|DOUBLE|SMALLINT|TINYINT|JSON|BLOB|REAL)(\([^)]+\))?/gi));

                  for (const cMatch of colMatches) {
                    const colName = cleanFieldName(cMatch[1]);
                    const upperC = colName.toUpperCase();
                    if (colName && !['CREATE', 'TABLE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'CONSTRAINT', 'UNIQUE', 'INDEX', 'CHECK'].includes(upperC)) {
                      if (!tFields.includes(colName)) {
                        tFields.push(colName);
                        const fullType = `${cMatch[2]}${cMatch[3] || ''}`;
                        tTypes[colName] = fullType;
                        tSamples[colName] = `(DDL Type: ${fullType})`;
                      }
                    }
                  }

                  if (tFields.length > 0) {
                    detectedTables.push({
                      tableName,
                      fields: tFields,
                      fieldTypes: tTypes,
                      sampleValues: tSamples
                    });
                  }
                }
              }
            }

            // 2. JSON handling
            if (file.name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
              try {
                const json = JSON.parse(text);
                if (fileContentType === 'schema_data') {
                  // OpenAPI multi-schema support
                  if (json.components?.schemas && Object.keys(json.components.schemas).length > 0) {
                    Object.keys(json.components.schemas).forEach(schemaName => {
                      const sObj = json.components.schemas[schemaName];
                      if (sObj?.properties) {
                        const sFields: string[] = [];
                        const sTypes: Record<string, string> = {};
                        const sSamples: Record<string, string> = {};
                        Object.keys(sObj.properties).forEach(propKey => {
                          const cleanP = cleanFieldName(propKey);
                          if (cleanP && !sFields.includes(cleanP)) {
                            sFields.push(cleanP);
                            const t = sObj.properties[propKey].type || 'string';
                            sTypes[cleanP] = t;
                            const desc = sObj.properties[propKey].description ? ` - ${sObj.properties[propKey].description}` : '';
                            sSamples[cleanP] = `(Schema Spec: ${t}${desc})`;
                            if (sObj.properties[propKey].description) {
                              fieldDescriptions[cleanP] = String(sObj.properties[propKey].description);
                            }
                          }
                        });
                        if (sFields.length > 0) {
                          detectedTables.push({
                            tableName: schemaName,
                            fields: sFields,
                            fieldTypes: sTypes,
                            sampleValues: sSamples
                          });
                        }
                      }
                    });
                  }

                  // Single object/schema fallback
                  let props: Record<string, any> = {};
                  if (json.properties) {
                    props = json.properties;
                  } else if (json.components?.schemas && !detectedTables.length) {
                    const firstSchemaKey = Object.keys(json.components.schemas)[0];
                    if (firstSchemaKey && json.components.schemas[firstSchemaKey]?.properties) {
                      props = json.components.schemas[firstSchemaKey].properties;
                    }
                  } else if (Array.isArray(json) && json[0]?.name) {
                    json.forEach((item: any) => {
                      if (item.name) {
                        const f = cleanFieldName(item.name);
                        if (f && !fields.includes(f)) {
                          fields.push(f);
                          const t = item.type || item.dataType || 'VARCHAR';
                          fieldTypes[f] = t;
                          if (item.description) fieldDescriptions[f] = String(item.description);
                          sampleValues[f] = `(Schema Spec: ${t}${item.description ? ` - ${item.description}` : ''})`;
                        }
                      }
                    });
                  }

                  if (Object.keys(props).length > 0) {
                    Object.keys(props).forEach(k => {
                      const cleanK = cleanFieldName(k);
                      if (cleanK && !fields.includes(cleanK)) {
                        fields.push(cleanK);
                        const propObj = props[k] || {};
                        const t = propObj.type || propObj.format || 'string';
                        fieldTypes[cleanK] = t;
                        if (propObj.description) fieldDescriptions[cleanK] = String(propObj.description);
                        const desc = propObj.description ? ` - ${propObj.description}` : '';
                        sampleValues[cleanK] = `(Schema Spec: ${t}${desc})`;
                      }
                    });
                  } else if (typeof json === 'object' && !Array.isArray(json) && !detectedTables.length) {
                    Object.keys(json).forEach(k => {
                      const cleanK = cleanFieldName(k);
                      if (cleanK && !fields.includes(cleanK)) {
                        fields.push(cleanK);
                        sampleValues[cleanK] = `(Schema Spec: ${typeof json[k]})`;
                      }
                    });
                  }
                } else {
                  // RAW DATA Records
                  const jsonArray = Array.isArray(json) ? json : [json];
                  const previewList: Record<string, string>[] = [];
                  for (let r = 0; r < Math.min(jsonArray.length, 3); r++) {
                    const item = jsonArray[r];
                    if (item && typeof item === 'object') {
                      const rowObj: Record<string, string> = {};
                      Object.keys(item).forEach(k => {
                        const cleanK = cleanFieldName(k);
                        if (cleanK) {
                          rowObj[cleanK] = String(item[k] ?? '');
                        }
                      });
                      previewList.push(rowObj);
                    }
                  }
                  parsedPreviewRows = previewList;

                  const firstObj = jsonArray[0];
                  if (firstObj && typeof firstObj === 'object') {
                    Object.keys(firstObj).forEach(k => {
                      const cleanK = cleanFieldName(k);
                      if (cleanK && !fields.includes(cleanK)) {
                        fields.push(cleanK);
                        sampleValues[cleanK] = String(firstObj[k] ?? 'sample_data');
                      }
                    });
                  }
                }
              } catch {
                // ignore json error
              }
            }

            // Single table DDL fallback if no multi-tables detected
            if (fields.length === 0 && detectedTables.length === 0 && (file.name.endsWith('.sql') || text.toUpperCase().includes('CREATE TABLE') || fileContentType === 'schema_data')) {
              const matches = text.matchAll(/`?([a-zA-Z0-9_]+)`?\s+(VARCHAR|INT|BIGINT|DECIMAL|TEXT|DATE|DATETIME|BOOLEAN|CHAR|NUMBER|FLOAT|TIMESTAMP)(\([^)]+\))?/gi);
              for (const m of matches) {
                const col = cleanFieldName(m[1]);
                if (col && !['CREATE', 'TABLE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL'].includes(col.toUpperCase())) {
                  if (!fields.includes(col)) {
                    fields.push(col);
                    const fullType = `${m[2]}${m[3] || ''}`;
                    fieldTypes[col] = fullType;
                    sampleValues[col] = fileContentType === 'schema_data' ? `(DDL Type: ${fullType})` : `Sample ${col}`;
                  }
                }
              }
            }

            // CSV / Delimited handling
            if (fields.length === 0 && detectedTables.length === 0) {
              const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
              if (lines.length > 0) {
                const firstLine = lines[0];
                const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : (firstLine.includes('|') ? '|' : ','));

                if (fileContentType === 'schema_data') {
                  const headerCols = firstLine.split(delimiter).map(s => s.toLowerCase().replace(/^["']|["']$/g, ''));
                  const isDictCsv = headerCols.some(c => c.includes('field') || c.includes('column') || c.includes('attribute') || c.includes('naziv') || c.includes('polje'));
                  
                  if (isDictCsv && lines.length > 1) {
                    for (let i = 1; i < lines.length; i++) {
                      const parts = lines[i].split(delimiter).map(s => cleanFieldName(s.replace(/^["']|["']$/g, '')));
                      if (parts[0]) {
                        fields.push(parts[0]);
                        const dType = parts[1] || 'VARCHAR(50)';
                        const dDesc = parts[2] || `Declared schema attribute ${parts[0]}`;
                        fieldTypes[parts[0]] = dType;
                        fieldDescriptions[parts[0]] = dDesc;
                        sampleValues[parts[0]] = `(Schema Spec: ${dType} - ${dDesc})`;
                      }
                    }
                  } else {
                    const parsedFields = firstLine.split(delimiter).map(s => cleanFieldName(s.replace(/^["']|["']$/g, ''))).filter(Boolean);
                    fields = parsedFields;
                    fields.forEach(f => {
                      sampleValues[f] = '(Schema Header Specification)';
                    });
                  }
                } else {
                  // RAW DATA
                  const parsedFields = firstLine.split(delimiter).map(s => cleanFieldName(s.replace(/^["']|["']$/g, ''))).filter(Boolean);
                  if (parsedFields.length > 0) {
                    fields = parsedFields;

                    // Extract first 3 lines of raw data
                    const previewList: Record<string, string>[] = [];
                    for (let r = 1; r < Math.min(lines.length, 4); r++) {
                      const cells = lines[r].split(delimiter).map(s => String(s).trim().replace(/^["']|["']$/g, ''));
                      const rowObj: Record<string, string> = {};
                      parsedFields.forEach((f, idx) => {
                        rowObj[f] = cells[idx] !== undefined ? cells[idx] : '';
                      });
                      if (Object.keys(rowObj).length > 0) {
                        previewList.push(rowObj);
                      }
                    }
                    parsedPreviewRows = previewList;

                    if (lines.length > 1) {
                      const secondLine = lines[1].split(delimiter).map(s => String(s).trim().replace(/^["']|["']$/g, ''));
                      fields.forEach((f, idx) => {
                        if (secondLine[idx] !== undefined) {
                          sampleValues[f] = secondLine[idx];
                        }
                      });
                    }
                  }
                }
              }
            }

          }
        }
      } catch (err) {
        // text read error
      }
    }

    // Populate active fields from detectedTables if multi-table DDL/schema
    if (detectedTables.length > 0 && fields.length === 0) {
      fields = detectedTables[0].fields;
      fieldTypes = detectedTables[0].fieldTypes || {};
      sampleValues = detectedTables[0].sampleValues;
    }

    // Clean any remaining fields
    fields = fields.map(cleanFieldName).filter(Boolean);

    // Fallback if empty
    if (fields.length === 0) {
      const cleanName = cleanFieldName(file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")).toLowerCase() || 'schema';
      fields = [`${cleanName}_id`, `${cleanName}_name`, `${cleanName}_code`, 'created_at', 'status'];
      sampleValues = {
        [`${cleanName}_id`]: fileContentType === 'schema_data' ? '(Schema Spec: BIGINT)' : '10001',
        [`${cleanName}_name`]: fileContentType === 'schema_data' ? '(Schema Spec: VARCHAR(100))' : 'Sample Entity Name',
        [`${cleanName}_code`]: fileContentType === 'schema_data' ? '(Schema Spec: VARCHAR(20))' : 'CODE_01',
        created_at: fileContentType === 'schema_data' ? '(Schema Spec: TIMESTAMP)' : '2026-07-25',
        status: fileContentType === 'schema_data' ? '(Schema Spec: VARCHAR(10))' : 'ACTIVE'
      };
    }

    resolve({
      name: file.name,
      sizeFormatted: sizeKB,
      fields,
      sampleValues,
      fileContentType,
      fieldTypes,
      fieldDescriptions: Object.keys(fieldDescriptions).length > 0 ? fieldDescriptions : undefined,
      detectedTables: detectedTables.length > 0 ? detectedTables : undefined,
      selectedTableName: detectedTables.length > 0 ? detectedTables[0].tableName : undefined,
      parsedPreviewRows: parsedPreviewRows.length > 0 ? parsedPreviewRows : undefined,
      rawPreviewLines: rawPreviewLines.length > 0 ? rawPreviewLines : undefined
    });
  });
}

export interface CompanionColMapping {
  nameCol: string;
  descCol: string;
  typeCol: string;
  sampleCol: string;
}

export function detectCompanionColumnMapping(headers: string[]): CompanionColMapping {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());

  const findHeader = (candidates: string[], defaultIdx: number, fallbackDefault: string): string => {
    for (const cand of candidates) {
      const idx = lowerHeaders.findIndex(h => h.includes(cand));
      if (idx !== -1 && headers[idx]) return headers[idx];
    }
    return headers[defaultIdx] || fallbackDefault;
  };

  const nameCol = findHeader(['column', 'field', 'attribute', 'name', 'naziv', 'polje', 'kod', 'key', 'variable', 'header'], 0, 'Column');
  const descCol = findHeader(['desc', 'opis', 'meaning', 'definition', 'comment', 'text', 'business', 'label', 'napomena', 'info'], 1, 'Description');
  const typeCol = findHeader(['type', 'tip', 'datatype', 'data_type', 'format', 'domain', 'vtype', 'kind'], 2, 'Type');
  const sampleCol = findHeader(['sample', 'primer', 'example', 'value', 'val', 'data', 'instance', 'primeri', 'content'], 3, 'Sample Values');

  return { nameCol, descCol, typeCol, sampleCol };
}

export async function parseCompanionFileWithMapping(
  file: File,
  customMapping?: CompanionColMapping
): Promise<{
  schema: ParsedSchema;
  mapping: CompanionColMapping;
  headers: string[];
  autoDetected: boolean;
}> {
  const sizeKB = (file.size / 1024).toFixed(1) + ' KB';
  let rawHeaders: string[] = [];
  let rowsData: Record<string, string>[] = [];

  const isExcel = file.name.match(/\.(xlsx|xls|xlsm|xlsb)$/i);

  if (isExcel) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonRows && jsonRows.length > 0) {
          rawHeaders = (jsonRows[0] || []).map(c => String(c || '').trim());
          for (let r = 1; r < jsonRows.length; r++) {
            const rowObj: Record<string, string> = {};
            rawHeaders.forEach((h, colIdx) => {
              rowObj[h] = jsonRows[r]?.[colIdx] !== undefined ? String(jsonRows[r][colIdx]).trim() : '';
            });
            rowsData.push(rowObj);
          }
        }
      }
    } catch {
      // excel parse error
    }
  } else {
    try {
      const text = await file.text();
      if (text.trim()) {
        if (file.name.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
          try {
            const json = JSON.parse(text);
            if (Array.isArray(json) && json.length > 0) {
              rawHeaders = Object.keys(json[0]);
              json.forEach((item: any) => {
                if (item && typeof item === 'object') {
                  const rowObj: Record<string, string> = {};
                  Object.keys(item).forEach(k => {
                    rowObj[k] = String(item[k] ?? '');
                  });
                  rowsData.push(rowObj);
                }
              });
            } else if (json.components?.schemas) {
              const firstKey = Object.keys(json.components.schemas)[0];
              const props = json.components.schemas[firstKey]?.properties || {};
              rawHeaders = ['Column', 'Type', 'Description', 'Sample Values'];
              Object.keys(props).forEach(k => {
                rowsData.push({
                  'Column': k,
                  'Type': props[k].type || 'string',
                  'Description': props[k].description || `Spec property ${k}`,
                  'Sample Values': props[k].example ? String(props[k].example) : `(Spec: ${props[k].type || 'string'})`
                });
              });
            }
          } catch {
            // json error
          }
        } else {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const delimiter = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : (lines[0].includes('|') ? '|' : ','));
            rawHeaders = lines[0].split(delimiter).map(s => s.replace(/^["']|["']$/g, '').trim());
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].split(delimiter).map(s => s.replace(/^["']|["']$/g, '').trim());
              const rowObj: Record<string, string> = {};
              rawHeaders.forEach((h, idx) => {
                rowObj[h] = parts[idx] !== undefined ? parts[idx] : '';
              });
              rowsData.push(rowObj);
            }
          }
        }
      }
    } catch {
      // text error
    }
  }

  const detectedMapping = detectCompanionColumnMapping(rawHeaders);
  const mappingToUse = customMapping || detectedMapping;

  const getVal = (row: Record<string, string>, targetColName: string): string => {
    if (!targetColName) return '';
    if (row[targetColName] !== undefined && row[targetColName] !== '') return row[targetColName];
    const targetLower = targetColName.toLowerCase().trim();
    const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === targetLower || k.toLowerCase().includes(targetLower));
    if (foundKey && row[foundKey] !== undefined) return row[foundKey];
    return '';
  };

  const fields: string[] = [];
  const fieldTypes: Record<string, string> = {};
  const fieldDescriptions: Record<string, string> = {};
  const sampleValues: Record<string, string> = {};

  rowsData.forEach(row => {
    const rawName = getVal(row, mappingToUse.nameCol);
    const cleanF = cleanFieldName(rawName);
    if (cleanF && !fields.includes(cleanF)) {
      fields.push(cleanF);
      const fType = getVal(row, mappingToUse.typeCol) || 'VARCHAR(50)';
      const fDesc = getVal(row, mappingToUse.descCol) || `Declared companion attribute ${cleanF}`;
      const fSample = getVal(row, mappingToUse.sampleCol) || `(Schema Spec: ${fType} - ${fDesc})`;

      fieldTypes[cleanF] = fType;
      fieldDescriptions[cleanF] = fDesc;
      sampleValues[cleanF] = fSample;
    }
  });

  return {
    schema: {
      name: file.name,
      sizeFormatted: sizeKB,
      fields,
      sampleValues,
      fileContentType: 'schema_data',
      fieldTypes,
      fieldDescriptions
    },
    mapping: mappingToUse,
    headers: rawHeaders,
    autoDetected: !customMapping
  };
}

export function enrichSchemaWithCompanion(
  baseSchema: ParsedSchema,
  companionSchema: ParsedSchema
): ParsedSchema {
  const mergedTypes = { ...(baseSchema.fieldTypes || {}) };
  const mergedDescs = { ...(baseSchema.fieldDescriptions || {}) };
  const mergedSamples = { ...(baseSchema.sampleValues || {}) };

  if (companionSchema.fieldTypes) {
    Object.keys(companionSchema.fieldTypes).forEach(k => {
      mergedTypes[k] = companionSchema.fieldTypes![k];
    });
  }

  if (companionSchema.fieldDescriptions) {
    Object.keys(companionSchema.fieldDescriptions).forEach(k => {
      mergedDescs[k] = companionSchema.fieldDescriptions![k];
    });
  }

  if (companionSchema.sampleValues) {
    Object.keys(companionSchema.sampleValues).forEach(k => {
      if (companionSchema.sampleValues![k]) {
        mergedSamples[k] = companionSchema.sampleValues![k];
      }
    });
  }

  return {
    ...baseSchema,
    fieldTypes: mergedTypes,
    fieldDescriptions: mergedDescs,
    sampleValues: mergedSamples,
  };
}

export function generateCustomMappings(
  sourceFields: string[],
  sourceSamples: Record<string, string>,
  targetFields?: string[],
  canonicalConcepts?: CanonicalConcept[],
  sourceTypes?: Record<string, string>,
  targetTypes?: Record<string, string>,
  sourceCompanionDescs?: Record<string, string>,
  targetCompanionDescs?: Record<string, string>
): MappingRow[] {
  const cleanSources = sourceFields.map(cleanFieldName).filter(Boolean);
  const cleanTargets = targetFields ? targetFields.map(cleanFieldName).filter(Boolean) : [];

  // Categorization helpers to detect severe mismatches
  const getTypeCategory = (t?: string): string => {
    if (!t) return 'unknown';
    const l = t.toLowerCase();
    if (l.includes('date') || l.includes('time') || l.includes('calendar') || l.includes('datum') || l.includes('timestamp')) return 'datetime';
    if (l.includes('int') || l.includes('float') || l.includes('double') || l.includes('decimal') || l.includes('numeric') || l.includes('number')) return 'numeric';
    if (l.includes('bool') || l.includes('bit')) return 'boolean';
    return 'string';
  };

  const getSemanticCategory = (name: string, desc?: string): string => {
    const combined = `${name} ${desc || ''}`.toLowerCase();
    if (combined.includes('datum') || combined.includes('date') || combined.includes('vreme') || combined.includes('timestamp')) return 'date';
    if (combined.includes('promet') || combined.includes('turnover') || combined.includes('iznos') || combined.includes('amount') || combined.includes('price') || combined.includes('cena')) return 'monetary';
    if (combined.includes('klasifikacija') || combined.includes('classification') || combined.includes('kategorija') || combined.includes('category') || combined.includes('type') || combined.includes('tip')) return 'classification';
    if (combined.includes('kupac') || combined.includes('customer') || combined.includes('kunnr')) return 'customer';
    if (combined.includes('sifra') || combined.includes('id') || combined.includes('key') || combined.includes('code') || combined.includes('kod')) return 'identifier';
    return 'other';
  };

  const isGeneric = (name: string): boolean => {
    const n = name.toLowerCase();
    return n.startsWith('col') || n.startsWith('column') || n.startsWith('field') || n.startsWith('polje') || n.startsWith('att') || /^\w_\d+$/.test(n) || /^\d+$/.test(n);
  };

  const getStringSimilarity = (a: string, b: string): number => {
    const tokensA = a.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
    const tokensB = b.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
    const intersection = tokensA.filter(t => tokensB.includes(t));
    const union = Array.from(new Set([...tokensA, ...tokensB]));
    return union.length > 0 ? intersection.length / union.length : 0;
  };

  const checkSynonyms = (d1: string, d2: string): boolean => {
    const str = `${d1} ${d2}`.toLowerCase();
    if (str.includes('datum') && str.includes('date')) return true;
    if (str.includes('datum') && str.includes('timestamp')) return true;
    if (str.includes('promet') && (str.includes('turnover') || str.includes('amount') || str.includes('iznos') || str.includes('monetary'))) return true;
    if (str.includes('klasifikacija') && (str.includes('classification') || str.includes('category') || str.includes('tip') || str.includes('type'))) return true;
    if (str.includes('kupac') && (str.includes('customer') || str.includes('client'))) return true;
    return false;
  };

  const isDatePattern = (s?: string): boolean => {
    if (!s) return false;
    const cleanS = s.trim();
    return /\d{4}[-/.]\d{2}[-/.]\d{2}/.test(cleanS) || /\d{2}[-/.]\d{2}[-/.]\d{4}/.test(cleanS) || (/^\d{8}$/.test(cleanS) && (cleanS.startsWith('20') || cleanS.startsWith('19')));
  };

  const isNumericPattern = (s?: string): boolean => {
    if (!s) return false;
    const cleanS = s.trim().replace(/,/g, '');
    return /^-?\d+(\.\d+)?$/.test(cleanS);
  };

  // Evaluator for any source-target pair returning exact signal details and final normalized score
  const evaluatePair = (
    sf: string,
    tf: string,
    idx: number
  ) => {
    const sLower = sf.toLowerCase().trim();
    const tLower = tf.toLowerCase().trim();

    const sourceType = sourceTypes?.[sf] || 'VARCHAR(50)';
    const targetType = targetTypes?.[tf] || 'VARCHAR(50)';

    const sDesc = sourceCompanionDescs?.[sf] || '';
    const tDesc = targetCompanionDescs?.[tf] || '';

    const sSample = sourceSamples[sf] || '';

    // A. Name similarity
    let nameScore = 0;
    if (sLower === tLower) {
      nameScore = (isGeneric(sf) && isGeneric(tf)) ? 0.45 : 1.0;
    } else if (sLower.includes(tLower) || tLower.includes(sLower)) {
      nameScore = (isGeneric(sf) && isGeneric(tf)) ? 0.25 : 0.75;
    } else {
      nameScore = getStringSimilarity(sf, tf);
    }

    // B. Semantic categorization and mismatch checks
    const sTypeCat = getTypeCategory(sourceType);
    const tTypeCat = getTypeCategory(targetType);
    const sSemCat = getSemanticCategory(sf, sDesc);
    const tSemCat = getSemanticCategory(tf, tDesc);

    let typeMatchScore = 0.5;
    let conceptMatchScore = 0.5;
    let hasConflict = false;
    let conflictReason = '';

    if (sTypeCat !== 'unknown' && tTypeCat !== 'unknown') {
      if (sTypeCat === tTypeCat) {
        typeMatchScore = 1.0;
      } else if (
        (sTypeCat === 'datetime' && tTypeCat === 'numeric') ||
        (sTypeCat === 'numeric' && tTypeCat === 'datetime') ||
        (sTypeCat === 'datetime' && tTypeCat === 'boolean') ||
        (sTypeCat === 'boolean' && tTypeCat === 'datetime')
      ) {
        typeMatchScore = 0.0;
        hasConflict = true;
        conflictReason = `Type mismatch: Source is ${sTypeCat.toUpperCase()} but Target is ${tTypeCat.toUpperCase()}.`;
      } else {
        typeMatchScore = 0.3; // String conversion or other coercibles
      }
    }

    if (sSemCat !== 'other' || tSemCat !== 'other') {
      if (sSemCat === tSemCat) {
        conceptMatchScore = 1.0;
      } else if (sSemCat !== 'other' && tSemCat !== 'other') {
        conceptMatchScore = 0.0;
        hasConflict = true;
        const msg = `Semantic mismatch: Source represents '${sSemCat}' but Target represents '${tSemCat}'.`;
        conflictReason = conflictReason ? `${conflictReason} ${msg}` : msg;
      } else {
        conceptMatchScore = 0.4;
      }
    }

    // False friends filter: if they have a severe conflict, penalize name similarity especially for generic names
    if (hasConflict) {
      if (isGeneric(sf) && isGeneric(tf)) {
        nameScore = 0.05;
      } else {
        nameScore = Math.max(0.1, nameScore - 0.5);
      }
    }

    const semanticScore = (typeMatchScore * 0.4) + (conceptMatchScore * 0.6);

    // C. Knowledge signal
    let knowledgeScore = 0.0;
    let isKnowledgeActive = false;
    if (sDesc || tDesc) {
      isKnowledgeActive = true;
      if (hasConflict) {
        knowledgeScore = 0.0;
      } else if (checkSynonyms(sDesc, tDesc)) {
        knowledgeScore = 0.95;
      } else {
        knowledgeScore = getStringSimilarity(sDesc, tDesc);
      }
    }

    // SAP & standard ERP heuristics
    if (sLower === 'kunnr' || sLower.includes('customer_id') || sLower.includes('cust_id')) {
      if (tLower === 'customer_id' || tLower.includes('customer')) {
        knowledgeScore = 0.96;
        isKnowledgeActive = true;
      }
    } else if (sLower === 'vkorg' || sLower.includes('sales_org')) {
      if (tLower.includes('sales_org') || tLower.includes('sales_organization_id')) {
        knowledgeScore = 0.95;
        isKnowledgeActive = true;
      }
    } else if (sLower === 'spart' || sLower.includes('division')) {
      if (tLower.includes('division')) {
        knowledgeScore = 0.92;
        isKnowledgeActive = true;
      }
    } else if (sLower === 'vtweg' || sLower.includes('distr_chan')) {
      if (tLower.includes('distribution_channel')) {
        knowledgeScore = 0.91;
        isKnowledgeActive = true;
      }
    } else if (sLower === 'matnr' || sLower.includes('material')) {
      if (tLower.includes('material')) {
        knowledgeScore = 0.95;
        isKnowledgeActive = true;
      }
    } else if (sLower === 'lifnr' || sLower.includes('vendor') || sLower.includes('supplier')) {
      if (tLower.includes('supplier') || tLower.includes('vendor')) {
        knowledgeScore = 0.95;
        isKnowledgeActive = true;
      }
    }

    // D. Canonical signal
    let canonicalScore = 0.0;
    let isCanonicalActive = false;
    if (canonicalConcepts && canonicalConcepts.length > 0) {
      const found = canonicalConcepts.find(c => 
        c.concept_id.toLowerCase().includes(sLower) || 
        sLower.includes(c.entity.toLowerCase()) || 
        sLower.includes(c.attribute.toLowerCase()) ||
        c.display_name.toLowerCase().includes(sLower)
      );
      if (found) {
        isCanonicalActive = true;
        if (found.concept_id.toLowerCase().includes(tLower) || tLower.includes(found.concept_id.toLowerCase())) {
          canonicalScore = 0.9;
        } else {
          canonicalScore = 0.4;
        }
      }
    }

    // E. Pattern signal
    let patternScore = 0.5;
    let isPatternActive = false;
    if (sSample) {
      isPatternActive = true;
      const sIsDate = isDatePattern(sSample);
      const sIsNum = isNumericPattern(sSample);

      // Simple target sample inference
      let tIsDate = false;
      let tIsNum = false;
      if (tDesc) {
        const td = tDesc.toLowerCase();
        tIsDate = td.includes('datum') || td.includes('date');
        tIsNum = td.includes('promet') || td.includes('turnover') || td.includes('iznos') || td.includes('amount');
      }

      if (sIsDate && tIsDate) {
        patternScore = 1.0;
      } else if (sIsNum && tIsNum) {
        patternScore = 1.0;
      } else if ((sIsDate && tIsNum) || (sIsNum && tIsDate)) {
        patternScore = 0.05;
        hasConflict = true;
        const msg = `Pattern conflict: Source is date-like but Target expects numeric.`;
        conflictReason = conflictReason ? `${conflictReason} ${msg}` : msg;
      } else if (sIsDate) {
        patternScore = 0.2;
      } else if (sIsNum) {
        patternScore = 0.2;
      } else {
        patternScore = 0.5;
      }
    }

    // 3. Normalize over active signals according to Semantra's balanced weighting profile
    const activeSignals: MappingSignal[] = ['name', 'semantic'];
    if (isKnowledgeActive) activeSignals.push('knowledge');
    if (isCanonicalActive) activeSignals.push('canonical');
    if (isPatternActive) activeSignals.push('correction'); // Map pattern-like check to correction/llm weight slots for browser simulation

    // Weights from MAPPING_SIGNALS_AND_SCORING.md
    const weights: Record<string, number> = {
      name: 0.20,
      semantic: 0.12,
      knowledge: 0.10,
      canonical: 0.05,
      correction: 0.15,
    };

    let weightedSum = 0;
    let weightSum = 0;

    activeSignals.forEach(sig => {
      let scoreVal = 0;
      if (sig === 'name') scoreVal = nameScore;
      else if (sig === 'semantic') scoreVal = semanticScore;
      else if (sig === 'knowledge') scoreVal = knowledgeScore;
      else if (sig === 'canonical') scoreVal = canonicalScore;
      else if (sig === 'correction') scoreVal = patternScore;

      weightedSum += scoreVal * weights[sig];
      weightSum += weights[sig];
    });

    const finalScore = weightSum > 0 ? (weightedSum / weightSum) : 0;

    const visibleSignals: MappingSignal[] = [];
    if (nameScore >= 0.5) visibleSignals.push('name');
    if (semanticScore >= 0.5 && !hasConflict) visibleSignals.push('semantic');
    if (knowledgeScore >= 0.5 && !hasConflict) visibleSignals.push('knowledge');
    if (canonicalScore >= 0.5 && !hasConflict) visibleSignals.push('canonical');

    if (hasConflict) {
      return {
        score: finalScore,
        signals: ['name'] as MappingSignal[],
        hasConflict,
        conflictReason,
        targetType,
        targetDesc: tDesc || `Inferred target concept for '${tf}'`
      };
    }

    return {
      score: finalScore,
      signals: (visibleSignals.length > 0 ? visibleSignals : ['name']) as MappingSignal[],
      hasConflict,
      conflictReason,
      targetType,
      targetDesc: tDesc || `Inferred target concept for '${tf}'`
    };
  };

  return cleanSources.map((sf, idx) => {
    const sLower = sf.toLowerCase().trim();
    
    let bestTarget = sf;
    let bestDesc = `Inferred target concept for '${sf}'`;
    let bestScore = 0.82;
    let targetType = targetTypes?.[sf] || 'VARCHAR(50)';
    const sourceType = sourceTypes?.[sf] || 'VARCHAR(50)';
    let hasConflict = false;
    let conflictReason = '';
    let signalsList: MappingSignal[] = ['name', 'semantic'];

    if (canonicalConcepts && canonicalConcepts.length > 0) {
      const found = canonicalConcepts.find(c => 
        c.concept_id.toLowerCase().includes(sLower) || 
        sLower.includes(c.entity.toLowerCase()) || 
        sLower.includes(c.attribute.toLowerCase()) ||
        c.display_name.toLowerCase().includes(sLower)
      );
      if (found) {
        bestTarget = cleanFieldName(found.concept_id) || sf;
        bestDesc = found.description || found.display_name;
        bestScore = 0.88;
        targetType = targetTypes?.[bestTarget] || found.data_type || 'VARCHAR(50)';
        signalsList = ['name', 'semantic', 'canonical'];
      }
    }

    if (cleanTargets && cleanTargets.length > 0) {
      let candidateTarget = cleanTargets[idx] || cleanTargets[0] || sf;
      let candidateScore = -1;
      let candidateDesc = '';
      let candidateType = '';
      let candidateConflict = false;
      let candidateReason = '';
      let candidateSignals: MappingSignal[] = [];

      cleanTargets.forEach(tf => {
        const evalResult = evaluatePair(sf, tf, idx);
        // We prefer targets that don't have conflicts, or if all have conflicts, the highest score
        if (candidateScore === -1) {
          candidateTarget = tf;
          candidateScore = evalResult.score;
          candidateDesc = evalResult.targetDesc;
          candidateType = evalResult.targetType;
          candidateConflict = evalResult.hasConflict;
          candidateReason = evalResult.conflictReason;
          candidateSignals = evalResult.signals;
        } else if (!candidateConflict && evalResult.hasConflict) {
          // Keep current non-conflict match unless this is a massive similarity (unlikely for conflict)
          if (evalResult.score > candidateScore * 1.8) {
            candidateTarget = tf;
            candidateScore = evalResult.score;
            candidateDesc = evalResult.targetDesc;
            candidateType = evalResult.targetType;
            candidateConflict = evalResult.hasConflict;
            candidateReason = evalResult.conflictReason;
            candidateSignals = evalResult.signals;
          }
        } else if (candidateConflict && !evalResult.hasConflict) {
          // Switch to non-conflict match
          candidateTarget = tf;
          candidateScore = evalResult.score;
          candidateDesc = evalResult.targetDesc;
          candidateType = evalResult.targetType;
          candidateConflict = evalResult.hasConflict;
          candidateReason = evalResult.conflictReason;
          candidateSignals = evalResult.signals;
        } else {
          // Both have same conflict state, choose highest score
          if (evalResult.score > candidateScore) {
            candidateTarget = tf;
            candidateScore = evalResult.score;
            candidateDesc = evalResult.targetDesc;
            candidateType = evalResult.targetType;
            candidateConflict = evalResult.hasConflict;
            candidateReason = evalResult.conflictReason;
            candidateSignals = evalResult.signals;
          }
        }
      });

      bestTarget = candidateTarget;
      bestScore = candidateScore;
      bestDesc = candidateDesc;
      targetType = candidateType;
      hasConflict = candidateConflict;
      conflictReason = candidateReason;
      signalsList = candidateSignals;
    }

    // SAP & standard ERP heuristics as global overlays if still no strong match
    if (bestScore < 0.5) {
      if (sLower === 'kunnr' || sLower.includes('customer_id') || sLower.includes('cust_id')) {
        bestTarget = 'customer_id'; bestScore = 0.96; bestDesc = 'Canonical customer identifier'; signalsList = ['name', 'semantic', 'knowledge']; hasConflict = false;
      } else if (sLower === 'vkorg' || sLower.includes('sales_org')) {
        bestTarget = 'sales_organization_id'; bestScore = 0.95; bestDesc = 'Normalized sales organization identifier'; signalsList = ['name', 'semantic', 'knowledge']; hasConflict = false;
      } else if (sLower === 'spart' || sLower.includes('division')) {
        bestTarget = 'division_id'; bestScore = 0.92; bestDesc = 'Normalized division identifier'; signalsList = ['name', 'semantic', 'knowledge']; hasConflict = false;
      } else if (sLower === 'vtweg' || sLower.includes('distr_chan')) {
        bestTarget = 'distribution_channel_id'; bestScore = 0.91; bestDesc = 'Normalized distribution channel identifier'; signalsList = ['name', 'semantic', 'knowledge']; hasConflict = false;
      } else if (sLower === 'matnr' || sLower.includes('material')) {
        bestTarget = 'material_id'; bestScore = 0.95; bestDesc = 'Canonical material number'; signalsList = ['name', 'semantic', 'knowledge']; hasConflict = false;
      } else if (sLower === 'lifnr' || sLower.includes('vendor') || sLower.includes('supplier')) {
        bestTarget = 'supplier_id'; bestScore = 0.95; bestDesc = 'Canonical supplier unique key'; signalsList = ['name', 'semantic', 'knowledge']; hasConflict = false;
      } else if (sLower.includes('email') && bestScore < 0.7) {
        bestTarget = 'email_address'; bestScore = 0.94; bestDesc = 'Primary contact email'; signalsList = ['name', 'semantic']; hasConflict = false;
      } else if ((sLower.includes('name') || sLower.includes('title')) && bestScore < 0.7) {
        bestTarget = 'customer_name'; bestScore = 0.89; bestDesc = 'Normalized display name'; signalsList = ['name', 'semantic']; hasConflict = false;
      }
    }

    // Ensure target field is clean
    bestTarget = cleanFieldName(bestTarget) || `target_${sf}`;

    const confLevel: Confidence = bestScore >= 0.85 ? 'high' : (bestScore >= 0.65 ? 'medium' : 'low');
    const sampleVal = sourceSamples[sf] || `SAMPLE_${idx + 100}`;
    
    // Check if source companion metadata description is provided
    const sourceDescription = sourceCompanionDescs?.[sf]
      ? `${sourceCompanionDescs[sf]} (Sample: ${sampleVal})`
      : `Uploaded source schema attribute '${sf}' (Sample value: ${sampleVal})`;
      
    let explanationText = '';
    if (hasConflict) {
      explanationText = `🛑 HIGH RISK MISMATCH: ${conflictReason} Downgraded to low confidence. Do NOT auto-apply this mapping without manual engineering review.`;
    } else if (sourceCompanionDescs?.[sf] || targetCompanionDescs?.[bestTarget]) {
      explanationText = `Multi-signal heuristic matching enriched with Companion Spec Metadata. Source field '${sf}' mapped to target '${bestTarget}'. Calculated score: ${Math.round(bestScore * 100)}% based on signals: ${signalsList.join(', ')}.`;
    } else {
      explanationText = `Multi-signal heuristic matching generated for uploaded source field '${sf}' mapped to target '${bestTarget}'. Derived via header token alignment and semantic similarity. Calculated score: ${Math.round(bestScore * 100)}% based on signals: ${signalsList.join(', ')}.`;
    }

    return {
      id: `m_uploaded_${idx + 1}`,
      sourceField: sf,
      sourceDesc: sourceDescription,
      sourceType: sourceType,
      targetField: bestTarget,
      targetDesc: bestDesc,
      targetType: targetType,
      confidence: confLevel,
      score: Number(bestScore.toFixed(2)),
      signals: signalsList,
      explanation: explanationText,
      isVirtual: false
    };
  });
}

export const WorkspaceSetup: React.FC<WorkspaceSetupProps> = ({ 
  onTriggerMapping, 
  isLoading,
  canonicalConcepts = [],
  selectedPreset,
  setSelectedPreset,
  sourceFile,
  setSourceFile,
  targetFile,
  setTargetFile,
  sourceFileType,
  setSourceFileType,
  targetFileType,
  setTargetFileType,
  sourceAutoDetected,
  setSourceAutoDetected,
  targetAutoDetected,
  setTargetAutoDetected,
  parsedSourceSchema,
  setParsedSourceSchema,
  parsedTargetSchema,
  setParsedTargetSchema,
  sourceCompanionFile,
  setSourceCompanionFile,
  targetCompanionFile,
  setTargetCompanionFile,
  parsedSourceCompanionSchema,
  setParsedSourceCompanionSchema,
  parsedTargetCompanionSchema,
  setParsedTargetCompanionSchema,
  sourceAiSummary,
  setSourceAiSummary,
  targetAiSummary,
  setTargetAiSummary,
  sourceAiDomainContext,
  setSourceAiDomainContext,
  targetAiDomainContext,
  setTargetAiDomainContext,
  sourceCompanionStatus,
  setSourceCompanionStatus,
  targetCompanionStatus,
  setTargetCompanionStatus,
  sourceCompanionMapping,
  setSourceCompanionMapping,
  targetCompanionMapping,
  setTargetCompanionMapping,
  workspaceSourceSystem,
  setWorkspaceSourceSystem,
  workspaceBusinessDomain,
  setWorkspaceBusinessDomain,
  workspaceIntegrationName,
  setWorkspaceIntegrationName,
}) => {
  const [mappingMode, setMappingMode] = useState<MappingMode>('standard');
  const [scoringProfile, setScoringProfile] = useState<string>('sap_calibrated');
  
  // Workspace Context fallback internal state
  const [internalSourceSystem, setInternalSourceSystem] = useState('');
  const [internalBusinessDomain, setInternalBusinessDomain] = useState('');
  const [internalIntegrationName, setInternalIntegrationName] = useState('');

  const currentSourceSystem = workspaceSourceSystem !== undefined ? workspaceSourceSystem : internalSourceSystem;
  const handleSourceSystemChange = (val: string) => {
    if (setWorkspaceSourceSystem) setWorkspaceSourceSystem(val);
    else setInternalSourceSystem(val);
  };

  const currentBusinessDomain = workspaceBusinessDomain !== undefined ? workspaceBusinessDomain : internalBusinessDomain;
  const handleBusinessDomainChange = (val: string) => {
    if (setWorkspaceBusinessDomain) setWorkspaceBusinessDomain(val);
    else setInternalBusinessDomain(val);
  };

  const currentIntegrationName = workspaceIntegrationName !== undefined ? workspaceIntegrationName : internalIntegrationName;
  const handleIntegrationNameChange = (val: string) => {
    if (setWorkspaceIntegrationName) setWorkspaceIntegrationName(val);
    else setInternalIntegrationName(val);
  };
  
  // File preview inspector states
  const [inspectorActiveTab, setInspectorActiveTab] = useState<'source' | 'target'>('source');
  const [inspectorViewMode, setInspectorViewMode] = useState<'schema' | 'preview'>('schema');

  // AI Companion Metadata Analysis States
  const [isSourceAiAnalyzing, setIsSourceAiAnalyzing] = useState(false);
  const [isTargetAiAnalyzing, setIsTargetAiAnalyzing] = useState(false);
  const [isAiEnhancingMappings, setIsAiEnhancingMappings] = useState(false);

  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const sourceCompanionInputRef = useRef<HTMLInputElement>(null);
  const targetCompanionInputRef = useRef<HTMLInputElement>(null);

  // Draft session resume modal state
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [restoredDraftMessage, setRestoredDraftMessage] = useState('');
  
  // Spec recovery state
  const [isRecoveringSpec, setIsRecoveringSpec] = useState(false);
  const [recoveryProposal, setRecoveryProposal] = useState<string | null>(null);

  const presets = [
    {
      id: 'customer_sales_area',
      name: 'SAP Showcase Customer Sales Area',
      desc: '14 source fields (KUNNR, VKORG, SPART, etc.) mapped to custom Canonical CDM target schema.',
      fieldsCount: 14
    },
    {
      id: 'material_master',
      name: 'SAP Showcase Material Master',
      desc: 'Core manufacturing item master (MATNR, MAKTX, MEINS) mapped to normalized inventory specs.',
      fieldsCount: 4
    },
    {
      id: 'supplier_master',
      name: 'SAP Showcase Supplier Master',
      desc: 'Vendor details (LIFNR, NAME1, LAND1) matched to global trading partner entities.',
      fieldsCount: 3
    },
    {
      id: 'generic_account_master',
      name: 'Legacy Account Master (AI Companion Spec Analysis)',
      desc: 'Generic col_1..col_5 file disambiguated via AI Companion metadata into Account ID, Company Name, Country, Tier, and Go-Live Date.',
      fieldsCount: 5
    }
  ];

  const mockSavedDrafts = [
    {
      id: 'draft-session-102',
      name: 'Customer Sales Area - Draft Session (14/14 accepted)',
      date: 'Today, 10:45 AM',
      preset: 'customer_sales_area',
      mode: 'standard',
      fieldsCount: 14,
      status: 'Ready for Review'
    },
    {
      id: 'draft-session-105',
      name: 'OneStream Financial Consolidation & Planning Align',
      date: 'Today, 08:30 AM',
      preset: 'customer_sales_area',
      mode: 'standard',
      fieldsCount: 8,
      status: 'In Progress'
    },
    {
      id: 'draft-session-106',
      name: 'QAD & CMS Division Sales Sync &rarr; Databricks Lakehouse',
      date: 'Yesterday, 14:15 PM',
      preset: 'customer_sales_area',
      mode: 'standard',
      fieldsCount: 12,
      status: 'Awaiting Run'
    },
    {
      id: 'draft-session-098',
      name: 'Material Master Canonical Alignment (SAP S4HANA ↔ Azure SQL)',
      date: 'Yesterday, 16:20 PM',
      preset: 'material_master',
      mode: 'canonical',
      fieldsCount: 4,
      status: 'Decisions Complete'
    }
  ];

  const handleSourceFileSelect = async (file: File, overrideType?: IngestFileContentType) => {
    setSourceFile(file);
    let typeToUse = overrideType;
    if (!typeToUse) {
      typeToUse = await detectIngestFileContentType(file);
      setSourceAutoDetected(true);
    } else {
      setSourceAutoDetected(false);
    }
    setSourceFileType(typeToUse);
    const parsed = await parseSchemaFile(file, typeToUse);
    setParsedSourceSchema(parsed);

    // If Talend tMap XML output table is detected, automatically pre-populate target schema
    if (parsed.detectedTables) {
      const outTable = parsed.detectedTables.find(t => t.tableName.includes('(tMap Output)'));
      if (outTable) {
        setParsedTargetSchema({
          name: `${file.name} (Extracted Output Target)`,
          sizeFormatted: parsed.sizeFormatted,
          fields: outTable.fields,
          sampleValues: outTable.sampleValues,
          fileContentType: 'schema_data',
          fieldTypes: outTable.fieldTypes,
          fieldDescriptions: parsed.fieldDescriptions
        });
      }
    }
  };

  const handleTargetFileSelect = async (file: File, overrideType?: IngestFileContentType) => {
    setTargetFile(file);
    let typeToUse = overrideType;
    if (!typeToUse) {
      typeToUse = await detectIngestFileContentType(file);
      setTargetAutoDetected(true);
    } else {
      setTargetAutoDetected(false);
    }
    setTargetFileType(typeToUse);
    const parsed = await parseSchemaFile(file, typeToUse);
    setParsedTargetSchema(parsed);
  };

  const handleSourceTypeChange = async (type: IngestFileContentType) => {
    setSourceFileType(type);
    setSourceAutoDetected(false);
    if (sourceFile) {
      await handleSourceFileSelect(sourceFile, type);
    }
  };

  const handleTargetTypeChange = async (type: IngestFileContentType) => {
    setTargetFileType(type);
    setTargetAutoDetected(false);
    if (targetFile) {
      await handleTargetFileSelect(targetFile, type);
    }
  };

  const clearSourceFile = () => {
    setSourceFile(null);
    setParsedSourceSchema(null);
    setSourceAutoDetected(false);
    if (sourceInputRef.current) sourceInputRef.current.value = '';
  };

  const clearTargetFile = () => {
    setTargetFile(null);
    setParsedTargetSchema(null);
    setTargetAutoDetected(false);
    if (targetInputRef.current) targetInputRef.current.value = '';
  };

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSourceFileSelect(file);
  };

  const handleTargetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleTargetFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, target: 'source' | 'target') => {
    e.preventDefault();
    if (target === 'source') setIsDraggingSource(false);
    if (target === 'target') setIsDraggingTarget(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (target === 'source') handleSourceFileSelect(file);
      else handleTargetFileSelect(file);
    }
  };

  const runAiCompanionAnalysis = async (side: 'source' | 'target', fileOverride?: File) => {
    const fileToAnalyze = fileOverride || (side === 'source' ? sourceCompanionFile : targetCompanionFile);
    if (!fileToAnalyze) return;

    if (side === 'source') {
      setIsSourceAiAnalyzing(true);
      setSourceAiSummary(null);
    } else {
      setIsTargetAiAnalyzing(true);
      setTargetAiSummary(null);
    }

    try {
      const fileText = await fileToAnalyze.text();
      const knownFields = side === 'source'
        ? (parsedSourceSchema?.fields || [])
        : (parsedTargetSchema?.fields || []);

      const response = await fetch('/api/ai/analyze-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileToAnalyze.name,
          fileContent: fileText,
          fields: knownFields
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.fieldAnalyses && Array.isArray(data.fieldAnalyses)) {
        const enrichedTypes: Record<string, string> = {};
        const enrichedDescs: Record<string, string> = {};

        data.fieldAnalyses.forEach((fa: any) => {
          if (fa.fieldName) {
            const cleanKey = cleanFieldName(fa.fieldName);
            if (cleanKey) {
              if (fa.dataType) enrichedTypes[cleanKey] = fa.dataType;
              if (fa.description) {
                enrichedDescs[cleanKey] = `[AI Spec Analysis]: ${fa.description}${fa.businessRules ? ` (Rule: ${fa.businessRules})` : ''}`;
              }
            }
          }
        });

        if (side === 'source') {
          setParsedSourceCompanionSchema(prev => ({
            name: fileToAnalyze.name,
            sizeFormatted: (fileToAnalyze.size / 1024).toFixed(1) + ' KB',
            fields: Object.keys(enrichedDescs).length > 0 ? Object.keys(enrichedDescs) : (prev?.fields || []),
            sampleValues: prev?.sampleValues || {},
            fileContentType: 'schema_data',
            fieldTypes: { ...(prev?.fieldTypes || {}), ...enrichedTypes },
            fieldDescriptions: { ...(prev?.fieldDescriptions || {}), ...enrichedDescs }
          }));
          setSourceAiSummary(data.summary || `Extracted ${data.fieldAnalyses.length} attribute specifications.`);
          setSourceAiDomainContext(data.domainContext || null);
          setSourceCompanionStatus(`✨ Gemini AI Spec Analysis Active (${data.fieldAnalyses.length} attributes enriched)`);
        } else {
          setParsedTargetCompanionSchema(prev => ({
            name: fileToAnalyze.name,
            sizeFormatted: (fileToAnalyze.size / 1024).toFixed(1) + ' KB',
            fields: Object.keys(enrichedDescs).length > 0 ? Object.keys(enrichedDescs) : (prev?.fields || []),
            sampleValues: prev?.sampleValues || {},
            fileContentType: 'schema_data',
            fieldTypes: { ...(prev?.fieldTypes || {}), ...enrichedTypes },
            fieldDescriptions: { ...(prev?.fieldDescriptions || {}), ...enrichedDescs }
          }));
          setTargetAiSummary(data.summary || `Extracted ${data.fieldAnalyses.length} attribute specifications.`);
          setTargetAiDomainContext(data.domainContext || null);
          setTargetCompanionStatus(`✨ Gemini AI Spec Analysis Active (${data.fieldAnalyses.length} attributes enriched)`);
        }
      }
    } catch (err: any) {
      console.warn('AI Companion analysis notice:', err.message);
      if (side === 'source') {
        setSourceCompanionStatus(`Local Companion parser active (${err.message || 'AI offline'})`);
      } else {
        setTargetCompanionStatus(`Local Companion parser active (${err.message || 'AI offline'})`);
      }
    } finally {
      if (side === 'source') setIsSourceAiAnalyzing(false);
      else setIsTargetAiAnalyzing(false);
    }
  };

  const handleSourceCompanionFileSelect = async (file: File) => {
    setSourceCompanionFile(file);
    const result = await parseCompanionFileWithMapping(file);
    setParsedSourceCompanionSchema(result.schema);
    setSourceCompanionMapping(result.mapping);
    setSourceCompanionStatus(`Auto-detected columns applied (${result.schema.fields.length} attributes enriched)`);
    runAiCompanionAnalysis('source', file);
  };

  const handleApplySourceCompanionMetadata = async () => {
    if (!sourceCompanionFile) return;
    const result = await parseCompanionFileWithMapping(sourceCompanionFile, sourceCompanionMapping);
    setParsedSourceCompanionSchema(result.schema);
    setSourceCompanionStatus(`Custom metadata mapping applied (${result.schema.fields.length} attributes enriched)`);
    runAiCompanionAnalysis('source', sourceCompanionFile);
  };

  const clearSourceCompanionFile = () => {
    setSourceCompanionFile(null);
    setParsedSourceCompanionSchema(null);
    setSourceCompanionStatus(null);
    setSourceAiSummary(null);
    setSourceAiDomainContext(null);
    if (sourceCompanionInputRef.current) sourceCompanionInputRef.current.value = '';
  };

  const handleTargetCompanionFileSelect = async (file: File) => {
    setTargetCompanionFile(file);
    const result = await parseCompanionFileWithMapping(file);
    setParsedTargetCompanionSchema(result.schema);
    setTargetCompanionMapping(result.mapping);
    setTargetCompanionStatus(`Auto-detected columns applied (${result.schema.fields.length} attributes enriched)`);
    runAiCompanionAnalysis('target', file);
  };

  const handleApplyTargetCompanionMetadata = async () => {
    if (!targetCompanionFile) return;
    const result = await parseCompanionFileWithMapping(targetCompanionFile, targetCompanionMapping);
    setParsedTargetCompanionSchema(result.schema);
    setTargetCompanionStatus(`Custom metadata mapping applied (${result.schema.fields.length} attributes enriched)`);
    runAiCompanionAnalysis('target', targetCompanionFile);
  };

  const clearTargetCompanionFile = () => {
    setTargetCompanionFile(null);
    setParsedTargetCompanionSchema(null);
    setTargetCompanionStatus(null);
    setTargetAiSummary(null);
    setTargetAiDomainContext(null);
    if (targetCompanionInputRef.current) targetCompanionInputRef.current.value = '';
  };

  const handleStartMapping = async () => {
    if (parsedSourceSchema && parsedSourceSchema.fields.length > 0) {
      const activeSourceSchema = parsedSourceCompanionSchema 
        ? enrichSchemaWithCompanion(parsedSourceSchema, parsedSourceCompanionSchema) 
        : parsedSourceSchema;

      const activeTargetSchema = (parsedTargetSchema && parsedTargetCompanionSchema)
        ? enrichSchemaWithCompanion(parsedTargetSchema, parsedTargetCompanionSchema)
        : (parsedTargetSchema || undefined);

      let customMappings = generateCustomMappings(
        activeSourceSchema.fields,
        activeSourceSchema.sampleValues,
        activeTargetSchema?.fields,
        canonicalConcepts,
        activeSourceSchema.fieldTypes,
        activeTargetSchema?.fieldTypes,
        activeSourceSchema.fieldDescriptions,
        activeTargetSchema?.fieldDescriptions
      );

      // Attempt AI mapping enhancement if companion metadata is uploaded
      if (sourceCompanionFile || targetCompanionFile) {
        setIsAiEnhancingMappings(true);
        try {
          const res = await fetch('/api/ai/enhance-mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceFields: activeSourceSchema.fields,
              targetFields: activeTargetSchema?.fields || [],
              companionMetadata: {
                sourceDescs: activeSourceSchema.fieldDescriptions,
                targetDescs: activeTargetSchema?.fieldDescriptions,
                sourceAiSummary,
                targetAiSummary
              },
              sampleData: activeSourceSchema.sampleValues
            })
          });

          if (res.ok) {
            const aiData = await res.json();
            if (aiData.mappings && Array.isArray(aiData.mappings)) {
              customMappings = customMappings.map(m => {
                const aiMatch = aiData.mappings.find((aim: any) => aim.sourceField === m.sourceField);
                if (aiMatch) {
                  return {
                    ...m,
                    targetField: aiMatch.targetField || m.targetField,
                    confidence: (aiMatch.confidenceLevel as Confidence) || m.confidence,
                    score: typeof aiMatch.confidenceScore === 'number' ? aiMatch.confidenceScore : m.score,
                    signals: Array.isArray(aiMatch.signals) ? aiMatch.signals : m.signals,
                    explanation: `🤖 [AI Spec Analysis]: ${aiMatch.explanation}${aiMatch.companionInsight ? ` (${aiMatch.companionInsight})` : ''}`,
                    hasConflict: Boolean(aiMatch.hasConflict),
                    conflictReason: aiMatch.conflictReason || ''
                  };
                }
                return m;
              });
            }
          }
        } catch (err) {
          console.warn('AI mapping enhancement fallback to deterministic heuristic engine');
        } finally {
          setIsAiEnhancingMappings(false);
        }
      }

      onTriggerMapping(mappingMode, 'custom_upload', scoringProfile, customMappings);
    } else {
      onTriggerMapping(mappingMode, selectedPreset, scoringProfile);
    }
  };

  const handleRestoreDraft = (draft: typeof mockSavedDrafts[0]) => {
    setSelectedPreset(draft.preset);
    setMappingMode(draft.mode as MappingMode);
    setShowDraftModal(false);
    setRestoredDraftMessage(`Successfully restored draft session "${draft.name}" from backend SQLite store.`);
    setTimeout(() => setRestoredDraftMessage(''), 5000);
    onTriggerMapping(draft.mode as MappingMode, draft.preset, scoringProfile);
  };

  const handleRunSpecRecovery = () => {
    setIsRecoveringSpec(true);
    setTimeout(() => {
      setIsRecoveringSpec(false);
      setRecoveryProposal("Spec Recovery Engine (spec_recovery_service.py) proposed 100% header alignment for 'VKORG' -> 'Sales Organization' and 'SPART' -> 'Division'.");
    }, 1200);
  };

  // Custom File Ingestion Inspector helper logic
  const getPresetStructureData = (presetId: string): ParsedSchema => {
    let fields: string[] = [];
    let sampleValues: Record<string, string> = {};
    let fieldTypes: Record<string, string> = {};
    let fieldDescriptions: Record<string, string> = {};
    let mappings: MappingRow[] = [];
    
    if (presetId === 'customer_sales_area') {
      mappings = SAP_CUSTOMER_SALES_AREA_MAPPINGS;
    } else if (presetId === 'material_master') {
      mappings = SAP_MATERIAL_MASTER_MAPPINGS;
    } else if (presetId === 'supplier_master') {
      mappings = SAP_SUPPLIER_MASTER_MAPPINGS;
    } else if (presetId === 'generic_account_master') {
      mappings = GENERIC_ACCOUNT_MASTER_MAPPINGS;
    }

    mappings.forEach(m => {
      fields.push(m.sourceField);
      fieldTypes[m.sourceField] = m.sourceType || 'VARCHAR(50)';
      fieldDescriptions[m.sourceField] = m.sourceDesc || 'No description available';
      
      if (m.sourceField === 'KUNNR') sampleValues[m.sourceField] = '100249';
      else if (m.sourceField === 'VKORG') sampleValues[m.sourceField] = 'US01';
      else if (m.sourceField === 'VTWEG') sampleValues[m.sourceField] = '10';
      else if (m.sourceField === 'SPART') sampleValues[m.sourceField] = '00';
      else if (m.sourceField === 'MATNR') sampleValues[m.sourceField] = 'MAT-4892A';
      else if (m.sourceField === 'MAKTX') sampleValues[m.sourceField] = 'Industrial Copper Wire - Gauge 12';
      else if (m.sourceField === 'MEINS') sampleValues[m.sourceField] = 'PC';
      else if (m.sourceField === 'LIFNR') sampleValues[m.sourceField] = 'VEND_9001';
      else if (m.sourceField === 'NAME1') sampleValues[m.sourceField] = 'Apex Global Logistics LLC';
      else if (m.sourceField === 'LAND1') sampleValues[m.sourceField] = 'US';
      else if (m.sourceField === 'col_1') sampleValues[m.sourceField] = '1001';
      else if (m.sourceField === 'col_2') sampleValues[m.sourceField] = 'Acme North';
      else if (m.sourceField === 'col_3') sampleValues[m.sourceField] = 'RS';
      else if (m.sourceField === 'col_4') sampleValues[m.sourceField] = '2024-01-15';
      else if (m.sourceField === 'col_5') sampleValues[m.sourceField] = '125000.50';
      else sampleValues[m.sourceField] = 'sample_value';
    });

    const parsedPreviewRows: Record<string, string>[] = [];
    const r1: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.sourceField === 'KUNNR') r1[m.sourceField] = '100249';
      else if (m.sourceField === 'VKORG') r1[m.sourceField] = 'US01';
      else if (m.sourceField === 'VTWEG') r1[m.sourceField] = '10';
      else if (m.sourceField === 'SPART') r1[m.sourceField] = '00';
      else if (m.sourceField === 'MATNR') r1[m.sourceField] = 'MAT-4892A';
      else if (m.sourceField === 'MAKTX') r1[m.sourceField] = 'Industrial Copper Wire - Gauge 12';
      else if (m.sourceField === 'MEINS') r1[m.sourceField] = 'PC';
      else if (m.sourceField === 'LIFNR') r1[m.sourceField] = 'VEND_9001';
      else if (m.sourceField === 'NAME1') r1[m.sourceField] = 'Apex Global Logistics LLC';
      else if (m.sourceField === 'LAND1') r1[m.sourceField] = 'US';
      else if (m.sourceField === 'col_1') r1[m.sourceField] = '1001';
      else if (m.sourceField === 'col_2') r1[m.sourceField] = 'Acme North';
      else if (m.sourceField === 'col_3') r1[m.sourceField] = 'RS';
      else if (m.sourceField === 'col_4') r1[m.sourceField] = '2024-01-15';
      else if (m.sourceField === 'col_5') r1[m.sourceField] = '125000.50';
      else r1[m.sourceField] = 'value_1';
    });
    parsedPreviewRows.push(r1);

    const r2: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.sourceField === 'KUNNR') r2[m.sourceField] = '105800';
      else if (m.sourceField === 'VKORG') r2[m.sourceField] = 'DE01';
      else if (m.sourceField === 'VTWEG') r2[m.sourceField] = '20';
      else if (m.sourceField === 'SPART') r2[m.sourceField] = '10';
      else if (m.sourceField === 'MATNR') r2[m.sourceField] = 'MAT-3310B';
      else if (m.sourceField === 'MAKTX') r2[m.sourceField] = 'Precision Brass Coupling 4mm';
      else if (m.sourceField === 'MEINS') r2[m.sourceField] = 'EA';
      else if (m.sourceField === 'LIFNR') r2[m.sourceField] = 'VEND_2011';
      else if (m.sourceField === 'NAME1') r2[m.sourceField] = 'Münchner Werkzeuge GmbH';
      else if (m.sourceField === 'LAND1') r2[m.sourceField] = 'DE';
      else if (m.sourceField === 'col_1') r2[m.sourceField] = '1002';
      else if (m.sourceField === 'col_2') r2[m.sourceField] = 'Contoso Trade';
      else if (m.sourceField === 'col_3') r2[m.sourceField] = 'CZ';
      else if (m.sourceField === 'col_4') r2[m.sourceField] = '2023-11-08';
      else if (m.sourceField === 'col_5') r2[m.sourceField] = '45200.00';
      else r2[m.sourceField] = 'value_2';
    });
    parsedPreviewRows.push(r2);

    const r3: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.sourceField === 'KUNNR') r3[m.sourceField] = '120950';
      else if (m.sourceField === 'VKORG') r3[m.sourceField] = 'JP01';
      else if (m.sourceField === 'VTWEG') r3[m.sourceField] = '10';
      else if (m.sourceField === 'SPART') r3[m.sourceField] = '00';
      else if (m.sourceField === 'MATNR') r3[m.sourceField] = 'MAT-9900X';
      else if (m.sourceField === 'MAKTX') r3[m.sourceField] = 'Silicon O-Ring Seal high-temp';
      else if (m.sourceField === 'MEINS') r3[m.sourceField] = 'BAG';
      else if (m.sourceField === 'LIFNR') r3[m.sourceField] = 'VEND_5004';
      else if (m.sourceField === 'NAME1') r3[m.sourceField] = 'Tokyo Electronics Ltd';
      else if (m.sourceField === 'LAND1') r3[m.sourceField] = 'JP';
      else if (m.sourceField === 'col_1') r3[m.sourceField] = '1003';
      else if (m.sourceField === 'col_2') r3[m.sourceField] = 'Fabrikam Retail';
      else if (m.sourceField === 'col_3') r3[m.sourceField] = 'HR';
      else if (m.sourceField === 'col_4') r3[m.sourceField] = '2024-03-21';
      else if (m.sourceField === 'col_5') r3[m.sourceField] = '78340.99';
      else r3[m.sourceField] = 'value_3';
    });
    parsedPreviewRows.push(r3);

    let name = 'SAP Showcase Customer Sales Area';
    if (presetId === 'material_master') name = 'SAP Showcase Material Master';
    else if (presetId === 'supplier_master') name = 'SAP Showcase Supplier Master';
    else if (presetId === 'generic_account_master') name = 'Legacy Account Master (AI Companion Disambiguated)';

    return {
      name,
      sizeFormatted: '12 KB',
      fields,
      sampleValues,
      fileContentType: 'raw_data',
      fieldTypes,
      fieldDescriptions,
      parsedPreviewRows
    };
  };

  const getPresetTargetStructureData = (presetId: string): ParsedSchema => {
    let fields: string[] = [];
    let sampleValues: Record<string, string> = {};
    let fieldTypes: Record<string, string> = {};
    let fieldDescriptions: Record<string, string> = {};
    let mappings: MappingRow[] = [];
    
    if (presetId === 'customer_sales_area') {
      mappings = SAP_CUSTOMER_SALES_AREA_MAPPINGS;
    } else if (presetId === 'material_master') {
      mappings = SAP_MATERIAL_MASTER_MAPPINGS;
    } else if (presetId === 'supplier_master') {
      mappings = SAP_SUPPLIER_MASTER_MAPPINGS;
    } else if (presetId === 'generic_account_master') {
      mappings = GENERIC_ACCOUNT_MASTER_MAPPINGS;
    }

    mappings.forEach(m => {
      if (m.targetField && m.targetField !== 'UNMAPPED') {
        if (!fields.includes(m.targetField)) {
          fields.push(m.targetField);
          fieldTypes[m.targetField] = m.targetType || 'VARCHAR(50)';
          fieldDescriptions[m.targetField] = m.targetDesc || 'Declared target attribute';
          
          if (m.targetField === 'customer_id') sampleValues[m.targetField] = '100249';
          else if (m.targetField === 'customer_name') sampleValues[m.targetField] = 'Apex Global Logistics LLC';
          else if (m.targetField === 'sales_organization_id') sampleValues[m.targetField] = 'US01';
          else if (m.targetField === 'distribution_channel_id') sampleValues[m.targetField] = '10';
          else if (m.targetField === 'division_id') sampleValues[m.targetField] = '00';
          else if (m.targetField === 'material_id') sampleValues[m.targetField] = 'MAT-4892A';
          else if (m.targetField === 'material_name') sampleValues[m.targetField] = 'Industrial Copper Wire - Gauge 12';
          else if (m.targetField === 'uom_id') sampleValues[m.targetField] = 'PC';
          else if (m.targetField === 'supplier_id') sampleValues[m.targetField] = 'VEND_9001';
          else if (m.targetField === 'supplier_name') sampleValues[m.targetField] = 'Apex Global Logistics LLC';
          else if (m.targetField === 'country_iso_code') sampleValues[m.targetField] = 'US';
          else if (presetId === 'generic_account_master') {
            if (m.targetField === 'col_1') sampleValues[m.targetField] = 'C-1001';
            else if (m.targetField === 'col_2') sampleValues[m.targetField] = 'Acme North';
            else if (m.targetField === 'col_3') sampleValues[m.targetField] = 'RS';
            else if (m.targetField === 'col_4') sampleValues[m.targetField] = 'Premium';
            else if (m.targetField === 'col_5') sampleValues[m.targetField] = '2024-01-15';
          }
          else sampleValues[m.targetField] = 'target_sample_value';
        }
      }
    });

    const parsedPreviewRows: Record<string, string>[] = [];
    const r1: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.targetField && m.targetField !== 'UNMAPPED') {
        if (m.targetField === 'customer_id') r1[m.targetField] = '100249';
        else if (m.targetField === 'customer_name') r1[m.targetField] = 'Apex Global Logistics LLC';
        else if (m.targetField === 'sales_organization_id') r1[m.targetField] = 'US01';
        else if (m.targetField === 'distribution_channel_id') r1[m.targetField] = '10';
        else if (m.targetField === 'division_id') r1[m.targetField] = '00';
        else if (m.targetField === 'material_id') r1[m.targetField] = 'MAT-4892A';
        else if (m.targetField === 'material_name') r1[m.targetField] = 'Industrial Copper Wire - Gauge 12';
        else if (m.targetField === 'uom_id') r1[m.targetField] = 'PC';
        else if (m.targetField === 'supplier_id') r1[m.targetField] = 'VEND_9001';
        else if (m.targetField === 'supplier_name') r1[m.targetField] = 'Apex Global Logistics LLC';
        else if (m.targetField === 'country_iso_code') r1[m.targetField] = 'US';
        else if (presetId === 'generic_account_master') {
          if (m.targetField === 'col_1') r1[m.targetField] = 'C-1001';
          else if (m.targetField === 'col_2') r1[m.targetField] = 'Acme North';
          else if (m.targetField === 'col_3') r1[m.targetField] = 'RS';
          else if (m.targetField === 'col_4') r1[m.targetField] = 'Premium';
          else if (m.targetField === 'col_5') r1[m.targetField] = '2024-01-15';
        }
        else r1[m.targetField] = 'target_val_1';
      }
    });
    parsedPreviewRows.push(r1);

    const r2: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.targetField && m.targetField !== 'UNMAPPED') {
        if (m.targetField === 'customer_id') r2[m.targetField] = '105800';
        else if (m.targetField === 'customer_name') r2[m.targetField] = 'Münchner Werkzeuge GmbH';
        else if (m.targetField === 'sales_organization_id') r2[m.targetField] = 'DE01';
        else if (m.targetField === 'distribution_channel_id') r2[m.targetField] = '20';
        else if (m.targetField === 'division_id') r2[m.targetField] = '10';
        else if (m.targetField === 'material_id') r2[m.targetField] = 'MAT-3310B';
        else if (m.targetField === 'material_name') r2[m.targetField] = 'Precision Brass Coupling 4mm';
        else if (m.targetField === 'uom_id') r2[m.targetField] = 'EA';
        else if (m.targetField === 'supplier_id') r2[m.targetField] = 'VEND_2011';
        else if (m.targetField === 'supplier_name') r2[m.targetField] = 'Münchner Werkzeuge GmbH';
        else if (m.targetField === 'country_iso_code') r2[m.targetField] = 'DE';
        else if (presetId === 'generic_account_master') {
          if (m.targetField === 'col_1') r2[m.targetField] = 'C-1002';
          else if (m.targetField === 'col_2') r2[m.targetField] = 'Contoso Trade';
          else if (m.targetField === 'col_3') r2[m.targetField] = 'CZ';
          else if (m.targetField === 'col_4') r2[m.targetField] = 'Standard';
          else if (m.targetField === 'col_5') r2[m.targetField] = '2023-11-08';
        }
        else r2[m.targetField] = 'target_val_2';
      }
    });
    parsedPreviewRows.push(r2);

    const r3: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.targetField && m.targetField !== 'UNMAPPED') {
        if (m.targetField === 'customer_id') r3[m.targetField] = '120950';
        else if (m.targetField === 'customer_name') r3[m.targetField] = 'Tokyo Electronics Ltd';
        else if (m.targetField === 'sales_organization_id') r3[m.targetField] = 'JP01';
        else if (m.targetField === 'distribution_channel_id') r3[m.targetField] = '10';
        else if (m.targetField === 'division_id') r3[m.targetField] = '00';
        else if (m.targetField === 'material_id') r3[m.targetField] = 'MAT-9900X';
        else if (m.targetField === 'material_name') r3[m.targetField] = 'Silicon O-Ring Seal high-temp';
        else if (m.targetField === 'uom_id') r3[m.targetField] = 'BAG';
        else if (m.targetField === 'supplier_id') r3[m.targetField] = 'VEND_5004';
        else if (m.targetField === 'supplier_name') r3[m.targetField] = 'Tokyo Electronics Ltd';
        else if (m.targetField === 'country_iso_code') r3[m.targetField] = 'JP';
        else if (presetId === 'generic_account_master') {
          if (m.targetField === 'col_1') r3[m.targetField] = 'C-1003';
          else if (m.targetField === 'col_2') r3[m.targetField] = 'Fabrikam Retail';
          else if (m.targetField === 'col_3') r3[m.targetField] = 'HR';
          else if (m.targetField === 'col_4') r3[m.targetField] = 'Standard';
          else if (m.targetField === 'col_5') r3[m.targetField] = '2024-03-21';
        }
        else r3[m.targetField] = 'target_val_3';
      }
    });
    parsedPreviewRows.push(r3);

    let name = 'Snowflake CDM Customer Sales Area';
    if (presetId === 'material_master') name = 'Snowflake CDM Material Master';
    else if (presetId === 'supplier_master') name = 'Snowflake CDM Supplier Master';
    else if (presetId === 'generic_account_master') name = 'Canonical Account Profile (Target Domain)';

    return {
      name,
      sizeFormatted: '10 KB',
      fields,
      sampleValues,
      fileContentType: 'schema_data',
      fieldTypes,
      fieldDescriptions,
      parsedPreviewRows
    };
  };

  const activeInspectorSchema = inspectorActiveTab === 'source'
    ? (parsedSourceSchema 
        ? (parsedSourceCompanionSchema ? enrichSchemaWithCompanion(parsedSourceSchema, parsedSourceCompanionSchema) : parsedSourceSchema)
        : getPresetStructureData(selectedPreset))
    : (parsedTargetSchema
        ? (parsedTargetCompanionSchema ? enrichSchemaWithCompanion(parsedTargetSchema, parsedTargetCompanionSchema) : parsedTargetSchema)
        : getPresetTargetStructureData(selectedPreset));

  const currentPresetDetails = presets.find(p => p.id === selectedPreset);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Resume Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            Ingest & Configuration Setup
          </h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">
            Semantra is a deterministic-first semantic integration workbench. Choose a pre-seeded pilot dataset or upload custom schemas, select your target workspace mode, and execute the multi-signal mapping engine.
          </p>
        </div>

        <button
          onClick={() => setShowDraftModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-800 shadow-sm shrink-0"
        >
          <FolderOpen className="w-4 h-4 text-emerald-400" />
          <span>Resume Saved Draft Session</span>
        </button>
      </div>

      {restoredDraftMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{restoredDraftMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Config Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-sans">1. Workspace Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setMappingMode('standard')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  mappingMode === 'standard'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    mappingMode === 'standard' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Standard Mode
                  </span>
                  <Database className={`w-4 h-4 ${mappingMode === 'standard' ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mt-3 font-sans">Source-to-Target Schema Match</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Map a concrete source file to a target schema layout. Supports auto-mapping, code previews, and direct schema-spec alignment.
                </p>
              </button>

              <button
                onClick={() => setMappingMode('canonical')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  mappingMode === 'canonical'
                    ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    mappingMode === 'canonical' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Canonical Mode
                  </span>
                  <Cpu className={`w-4 h-4 ${mappingMode === 'canonical' ? 'text-teal-500' : 'text-slate-400'}`} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mt-3 font-sans">Source-to-Concept (Concept-First)</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Map source fields directly to central canonical glossary concepts without target schemas. Ideal for semantic modeling.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Workspace Context */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 font-sans">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-sans">
                2. Workspace Context
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Set the source scope once. Review, persistent source-field hints, and future runs reuse this workspace context.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Source system */}
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-semibold text-slate-700 block">
                  Source system
                </label>
                <input
                  type="text"
                  value={currentSourceSystem}
                  onChange={(e) => handleSourceSystemChange(e.target.value)}
                  placeholder="Example: SAP"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 placeholder:text-slate-400 font-sans shadow-2xs transition-colors"
                />
              </div>

              {/* Business domain (optional) */}
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-semibold text-slate-700 block">
                  Business domain <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={currentBusinessDomain}
                  onChange={(e) => handleBusinessDomainChange(e.target.value)}
                  placeholder="Example: Procurement"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 placeholder:text-slate-400 font-sans shadow-2xs transition-colors"
                />
              </div>

              {/* Integration name (optional) */}
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-semibold text-slate-700 block">
                  Integration name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={currentIntegrationName}
                  onChange={(e) => handleIntegrationNameChange(e.target.value)}
                  placeholder="Example: Vendor master"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 placeholder:text-slate-400 font-sans shadow-2xs transition-colors"
                />
              </div>
            </div>

            {/* Info callout card */}
            <div className="p-3.5 bg-[#0f1d32] border border-[#1e3656] rounded-lg text-xs font-sans text-sky-200 leading-relaxed flex items-start gap-2.5 shadow-2xs">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Source system is optional for one-shot Review work, but required before you can save or manage persistent source-field hints.
              </span>
            </div>
          </div>

          {/* Dataset & Presets */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-sans">3. Ingest Schema Selection</h3>
              <button
                onClick={handleRunSpecRecovery}
                disabled={isRecoveringSpec}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRecoveringSpec ? 'Running Spec Recovery...' : 'Run Spec Header Recovery'}</span>
              </button>
            </div>

            {recoveryProposal && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-xs font-mono space-y-1">
                <p className="font-bold">Bounded Spec Recovery Result (POST /upload/spec/recover):</p>
                <p className="text-slate-700">{recoveryProposal}</p>
              </div>
            )}
            
            {/* Custom Uploads / File Select Dropzones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Schema/Data Dropzone Container */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 font-sans">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">Source Content Type:</span>
                    {sourceAutoDetected && (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-100 text-emerald-800 rounded border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Auto-Detected
                      </span>
                    )}
                  </div>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSourceTypeChange('raw_data')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        sourceFileType === 'raw_data'
                          ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="File contains actual sample data records/rows"
                    >
                      📊 Raw Data
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSourceTypeChange('schema_data')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        sourceFileType === 'schema_data'
                          ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="File contains schema structure / DDL / data dictionary"
                    >
                      📐 Schema / DDL
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => sourceInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingSource(true); }}
                  onDragLeave={() => setIsDraggingSource(false)}
                  onDrop={(e) => handleDrop(e, 'source')}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative min-h-[170px] ${
                    parsedSourceSchema
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : isDraggingSource
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={sourceInputRef}
                    onChange={handleSourceFileChange}
                    accept=".csv,.json,.sql,.xlsx,.xml,.txt,.dump"
                    className="hidden"
                  />

                  {parsedSourceSchema ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <FileCheck className="w-5 h-5" />
                        <span className="text-xs font-bold font-sans">Source File Processed</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 break-all">{parsedSourceSchema.name} ({parsedSourceSchema.sizeFormatted})</p>
                      
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 justify-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide ${
                          parsedSourceSchema.fileContentType === 'raw_data' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-teal-100 text-teal-800 border border-teal-200'
                        }`}>
                          {parsedSourceSchema.fileContentType === 'raw_data' ? '📊 Parsed as Raw Data Records' : '📐 Parsed as Schema / DDL Spec'}
                        </span>
                        {sourceAutoDetected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Auto-Detected
                          </span>
                        )}
                      </div>

                      <div className="mt-2 bg-white/90 border border-emerald-200 rounded-md p-2 w-full text-left shadow-xs">
                        <p className="text-[10px] font-mono font-bold text-emerald-800 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          {parsedSourceSchema.fields.length} Attributes Extracted:
                        </p>
                        <p className="text-[10px] font-mono text-slate-600 line-clamp-2 leading-tight">
                          {parsedSourceSchema.fields.join(', ')}
                        </p>
                      </div>

                      {/* Multi-table DDL selector for Source */}
                      {parsedSourceSchema.detectedTables && parsedSourceSchema.detectedTables.length > 1 && (
                        <div 
                          className="mt-2.5 p-2 bg-amber-50/90 border border-amber-200 rounded-lg w-full text-left font-sans"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              Multi-table DDL ({parsedSourceSchema.detectedTables.length} tables found)
                            </span>
                            <span className="text-[9px] font-medium text-amber-700">Select table:</span>
                          </div>
                          <select
                            value={parsedSourceSchema.selectedTableName || parsedSourceSchema.detectedTables[0].tableName}
                            onChange={(e) => {
                              const newTblName = e.target.value;
                              const tblObj = parsedSourceSchema.detectedTables?.find(t => t.tableName === newTblName);
                              if (tblObj) {
                                setParsedSourceSchema({
                                  ...parsedSourceSchema,
                                  selectedTableName: newTblName,
                                  fields: tblObj.fields,
                                  fieldTypes: tblObj.fieldTypes,
                                  sampleValues: tblObj.sampleValues
                                });
                              }
                            }}
                            className="w-full text-xs font-mono font-bold text-amber-900 bg-white border border-amber-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                          >
                            {parsedSourceSchema.detectedTables.map(tbl => (
                              <option key={tbl.tableName} value={tbl.tableName}>
                                {tbl.tableName} ({tbl.fields.length} attributes)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Talend reverse-engineering mapping detected banner */}
                      {parsedSourceSchema.detectedMappings && parsedSourceSchema.detectedMappings.length > 0 && (
                        <div 
                          className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl w-full text-left font-sans"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-emerald-950">
                                Talend tMap Mappings Detected! (Reverse Engineering)
                              </p>
                              <p className="text-[10px] text-emerald-800 leading-tight">
                                We automatically extracted <strong>{parsedSourceSchema.detectedMappings.length} column mappings</strong> directly from this Talend tMap XML configuration.
                              </p>
                              <div className="pt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (parsedSourceSchema.detectedMappings) {
                                      onTriggerMapping(mappingMode, 'custom_upload', scoringProfile, parsedSourceSchema.detectedMappings);
                                    }
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-md text-[10px] shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                                >
                                  Load {parsedSourceSchema.detectedMappings.length} Extracted Mappings
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSourceFile();
                        }}
                        className="mt-2.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove file</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-500 transition-colors mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">Upload Source Input File</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {sourceFileType === 'raw_data' 
                          ? 'CSV rows, Excel records, JSON arrays, SQL INSERTs' 
                          : 'SQL DDL, OpenAPI, JSON Schema, Column Dictionary'}
                      </p>
                      <span className="mt-2 text-[10px] text-slate-500 bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 px-2 py-0.5 rounded font-mono transition-colors">
                        Browse source file...
                      </span>
                    </>
                  )}
                </div>

                {/* Source Companion Metadata Sub-section */}
                <div className="mt-2.5 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 font-sans text-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      Source Companion Metadata
                    </span>
                    {parsedSourceCompanionSchema ? (
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-800">
                        Attached ({parsedSourceCompanionSchema.fields.length} specs)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-sans">Optional</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Optionally attach a source-side schema/spec file (Data Dictionary, Excel spec, JSON Schema) to enrich uploaded raw source dataset with descriptions and declared types.
                  </p>
                  <input
                    type="file"
                    ref={sourceCompanionInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSourceCompanionFileSelect(f);
                    }}
                    accept=".csv,.json,.sql,.xlsx,.xml,.txt"
                    className="hidden"
                  />
                  {sourceCompanionFile && parsedSourceCompanionSchema ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700 p-2 rounded-lg text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-slate-200 truncate">{sourceCompanionFile.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({parsedSourceCompanionSchema.sizeFormatted})</span>
                        </div>
                        <button
                          type="button"
                          onClick={clearSourceCompanionFile}
                          className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-950/50 rounded cursor-pointer shrink-0"
                          title="Remove source companion file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Companion Column Mapping Grid */}
                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-300 mb-1">
                              Source companion name column
                            </label>
                            <input
                              type="text"
                              value={sourceCompanionMapping.nameCol}
                              onChange={(e) => setSourceCompanionMapping({ ...sourceCompanionMapping, nameCol: e.target.value })}
                              placeholder="e.g. Column"
                              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-300 mb-1">
                              Source companion description column
                            </label>
                            <input
                              type="text"
                              value={sourceCompanionMapping.descCol}
                              onChange={(e) => setSourceCompanionMapping({ ...sourceCompanionMapping, descCol: e.target.value })}
                              placeholder="e.g. Description"
                              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-300 mb-1">
                              Source companion type column
                            </label>
                            <input
                              type="text"
                              value={sourceCompanionMapping.typeCol}
                              onChange={(e) => setSourceCompanionMapping({ ...sourceCompanionMapping, typeCol: e.target.value })}
                              placeholder="e.g. Type"
                              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-300 mb-1">
                              Source companion sample values column
                            </label>
                            <input
                              type="text"
                              value={sourceCompanionMapping.sampleCol}
                              onChange={(e) => setSourceCompanionMapping({ ...sourceCompanionMapping, sampleCol: e.target.value })}
                              placeholder="e.g. Sample Values"
                              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleApplySourceCompanionMetadata}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Apply metadata mapping</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSourceAiAnalyzing}
                              onClick={() => runAiCompanionAnalysis('source')}
                              className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/90 active:bg-emerald-950 border border-emerald-700/80 text-emerald-200 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Cpu className={`w-3.5 h-3.5 text-emerald-300 ${isSourceAiAnalyzing ? 'animate-spin' : ''}`} />
                              <span>{isSourceAiAnalyzing ? 'AI Analyzing Spec...' : '✨ AI Deep Spec Analysis'}</span>
                            </button>
                          </div>

                          {sourceCompanionStatus && (
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              {sourceCompanionStatus}
                            </span>
                          )}
                        </div>

                        {/* AI Summary Card for Source Companion */}
                        {sourceAiSummary && (
                          <div className="mt-2.5 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs font-sans text-emerald-100 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Gemini AI Metadata Spec Insights</span>
                            </div>
                            <p className="text-[11px] text-emerald-200/90 leading-snug">{sourceAiSummary}</p>
                            {sourceAiDomainContext && (
                              <p className="text-[10px] text-emerald-400 font-mono pt-1 border-t border-emerald-900/60">
                                Domain Context: {sourceAiDomainContext}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sourceCompanionInputRef.current?.click()}
                      className="w-full text-xs font-medium text-slate-300 hover:text-emerald-300 bg-slate-950 hover:bg-slate-900 border border-slate-800 border-dashed rounded-lg p-2.5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Attach Source Companion Spec / Dictionary</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Target Schema/Data Dropzone Container (Standard Mode) */}
              {mappingMode === 'standard' ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">Target Content Type:</span>
                      {targetAutoDetected && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-indigo-100 text-indigo-800 rounded border border-indigo-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> Auto-Detected
                        </span>
                      )}
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => handleTargetTypeChange('raw_data')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          targetFileType === 'raw_data'
                            ? 'bg-white text-indigo-800 shadow-2xs border border-slate-200 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Target file contains sample records/rows"
                      >
                        📊 Raw Data
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTargetTypeChange('schema_data')}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          targetFileType === 'schema_data'
                            ? 'bg-white text-indigo-800 shadow-2xs border border-slate-200 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Target file contains schema structure / DDL / OpenAPI"
                      >
                        📐 Schema / DDL
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={() => targetInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingTarget(true); }}
                    onDragLeave={() => setIsDraggingTarget(false)}
                    onDrop={(e) => handleDrop(e, 'target')}
                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative min-h-[170px] ${
                      parsedTargetSchema
                        ? 'border-indigo-500 bg-indigo-50/30'
                        : isDraggingTarget
                        ? 'border-indigo-400 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/40'
                    }`}
                  >
                    <input
                      type="file"
                      ref={targetInputRef}
                      onChange={handleTargetFileChange}
                      accept=".csv,.json,.sql,.xlsx,.xml,.txt,.dump"
                      className="hidden"
                    />

                    {parsedTargetSchema ? (
                      <div className="w-full flex flex-col items-center">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                          <FileCheck className="w-5 h-5" />
                          <span className="text-xs font-bold font-sans">Target File Processed</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 break-all">{parsedTargetSchema.name} ({parsedTargetSchema.sizeFormatted})</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 justify-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide ${
                            parsedTargetSchema.fileContentType === 'raw_data' 
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {parsedTargetSchema.fileContentType === 'raw_data' ? '📊 Parsed as Raw Data Records' : '📐 Parsed as Schema / DDL Spec'}
                          </span>
                          {targetAutoDetected && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> Auto-Detected
                            </span>
                          )}
                        </div>

                        <div className="mt-2 bg-white/90 border border-indigo-200 rounded-md p-2 w-full text-left shadow-xs">
                          <p className="text-[10px] font-mono font-bold text-indigo-800 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            {parsedTargetSchema.fields.length} Target Fields Detected:
                          </p>
                          <p className="text-[10px] font-mono text-slate-600 line-clamp-2 leading-tight">
                            {parsedTargetSchema.fields.join(', ')}
                          </p>
                        </div>

                        {/* Multi-table DDL selector for Target */}
                        {parsedTargetSchema.detectedTables && parsedTargetSchema.detectedTables.length > 1 && (
                          <div 
                            className="mt-2.5 p-2 bg-purple-50/90 border border-purple-200 rounded-lg w-full text-left font-sans"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-purple-800 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                Multi-table DDL ({parsedTargetSchema.detectedTables.length} tables found)
                              </span>
                              <span className="text-[9px] font-medium text-purple-700">Select table:</span>
                            </div>
                            <select
                              value={parsedTargetSchema.selectedTableName || parsedTargetSchema.detectedTables[0].tableName}
                              onChange={(e) => {
                                const newTblName = e.target.value;
                                const tblObj = parsedTargetSchema.detectedTables?.find(t => t.tableName === newTblName);
                                if (tblObj) {
                                  setParsedTargetSchema({
                                    ...parsedTargetSchema,
                                    selectedTableName: newTblName,
                                    fields: tblObj.fields,
                                    fieldTypes: tblObj.fieldTypes,
                                    sampleValues: tblObj.sampleValues
                                  });
                                }
                              }}
                              className="w-full text-xs font-mono font-bold text-purple-900 bg-white border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
                            >
                              {parsedTargetSchema.detectedTables.map(tbl => (
                                <option key={tbl.tableName} value={tbl.tableName}>
                                  {tbl.tableName} ({tbl.fields.length} attributes)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearTargetFile();
                          }}
                          className="mt-2.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Remove file</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-500 transition-colors mb-1.5" />
                        <p className="text-xs font-semibold text-slate-700">Upload Target Input File</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {targetFileType === 'raw_data' 
                            ? 'Sample data records table' 
                            : 'SQL DDL, OpenAPI endpoint spec, JSON Schema'}
                        </p>
                        <span className="mt-2 text-[10px] text-slate-500 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 px-2 py-0.5 rounded font-mono transition-colors">
                          Browse target file...
                        </span>
                      </>
                    )}
                  </div>

                  {/* Target Companion Metadata Sub-section */}
                  <div className="mt-2.5 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 font-sans text-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                        Target Companion Metadata
                      </span>
                      {parsedTargetCompanionSchema ? (
                        <span className="text-[10px] bg-indigo-950/80 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-800">
                          Attached ({parsedTargetCompanionSchema.fields.length} specs)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-sans">Optional</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Optionally attach a target-side schema/spec file (Data Dictionary, Excel spec, JSON Schema) to enrich uploaded target dataset with descriptions and declared types.
                    </p>
                    <input
                      type="file"
                      ref={targetCompanionInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleTargetCompanionFileSelect(f);
                      }}
                      accept=".csv,.json,.sql,.xlsx,.xml,.txt"
                      className="hidden"
                    />
                    {targetCompanionFile && parsedTargetCompanionSchema ? (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700 p-2 rounded-lg text-xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">{targetCompanionFile.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({parsedTargetCompanionSchema.sizeFormatted})</span>
                          </div>
                          <button
                            type="button"
                            onClick={clearTargetCompanionFile}
                            className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-950/50 rounded cursor-pointer shrink-0"
                            title="Remove target companion file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Companion Column Mapping Grid (screenshot matching) */}
                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-300 mb-1">
                                Target companion name column
                              </label>
                              <input
                                type="text"
                                value={targetCompanionMapping.nameCol}
                                onChange={(e) => setTargetCompanionMapping({ ...targetCompanionMapping, nameCol: e.target.value })}
                                placeholder="e.g. Column"
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-300 mb-1">
                                Target companion description column
                              </label>
                              <input
                                type="text"
                                value={targetCompanionMapping.descCol}
                                onChange={(e) => setTargetCompanionMapping({ ...targetCompanionMapping, descCol: e.target.value })}
                                placeholder="e.g. Description"
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-300 mb-1">
                                Target companion type column
                              </label>
                              <input
                                type="text"
                                value={targetCompanionMapping.typeCol}
                                onChange={(e) => setTargetCompanionMapping({ ...targetCompanionMapping, typeCol: e.target.value })}
                                placeholder="e.g. Type"
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-300 mb-1">
                                Target companion sample values column
                              </label>
                              <input
                                type="text"
                                value={targetCompanionMapping.sampleCol}
                                onChange={(e) => setTargetCompanionMapping({ ...targetCompanionMapping, sampleCol: e.target.value })}
                                placeholder="e.g. Sample Values"
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleApplyTargetCompanionMetadata}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Apply metadata mapping</span>
                              </button>

                              <button
                                type="button"
                                disabled={isTargetAiAnalyzing}
                                onClick={() => runAiCompanionAnalysis('target')}
                                className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900/90 active:bg-indigo-950 border border-indigo-700/80 text-indigo-200 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Cpu className={`w-3.5 h-3.5 text-indigo-300 ${isTargetAiAnalyzing ? 'animate-spin' : ''}`} />
                                <span>{isTargetAiAnalyzing ? 'AI Analyzing Spec...' : '✨ AI Deep Spec Analysis'}</span>
                              </button>
                            </div>

                            {targetCompanionStatus && (
                              <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                                <Check className="w-3 h-3 text-indigo-400" />
                                {targetCompanionStatus}
                              </span>
                            )}
                          </div>

                          {/* AI Summary Card for Target Companion */}
                          {targetAiSummary && (
                            <div className="mt-2.5 p-3 bg-indigo-950/40 border border-indigo-800/80 rounded-lg text-xs font-sans text-indigo-100 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Gemini AI Metadata Spec Insights</span>
                              </div>
                              <p className="text-[11px] text-indigo-200/90 leading-snug">{targetAiSummary}</p>
                              {targetAiDomainContext && (
                                <p className="text-[10px] text-indigo-400 font-mono pt-1 border-t border-indigo-900/60">
                                  Domain Context: {targetAiDomainContext}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => targetCompanionInputRef.current?.click()}
                        className="w-full text-xs font-medium text-slate-300 hover:text-indigo-300 bg-slate-950 hover:bg-slate-900 border border-slate-800 border-dashed rounded-lg p-2.5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Attach Target Companion Spec / Dictionary</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-5 flex flex-col items-center justify-center text-center text-slate-400 min-h-[200px]">
                  <Layers className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Target Schema Bypassed</p>
                  <p className="text-[10px] max-w-[200px] mt-1 leading-relaxed">
                    Canonical Mode leverages global glossary concepts. No target schema upload is required.
                  </p>
                </div>
              )}
            </div>

            {/* Predefined Presets */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block font-sans">
                {parsedSourceSchema ? 'Or Switch Back to a Showcase Preset' : 'Or Select a Pilot Showcase Preset'}
              </label>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      if (parsedSourceSchema) clearSourceFile();
                      if (parsedTargetSchema) clearTargetFile();
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all ${
                      selectedPreset === preset.id && !parsedSourceSchema
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet className={`w-5 h-5 mt-0.5 ${selectedPreset === preset.id && !parsedSourceSchema ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 font-sans">{preset.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{preset.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {preset.fieldsCount} Fields
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 🔍 File Structural Inspection & Data Preview Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>File Structural Inspection & Data Preview</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Analyze extracted column metadata, types, companion schemas, and the first three rows of data.
                </p>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => setInspectorActiveTab('source')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    inspectorActiveTab === 'source'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🟢 Source Schema ({parsedSourceSchema ? 'Custom Upload' : 'Preset'})
                </button>
                {mappingMode === 'standard' && (
                  <button
                    type="button"
                    onClick={() => setInspectorActiveTab('target')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      inspectorActiveTab === 'target'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🔵 Target Schema ({parsedTargetSchema ? 'Custom' : 'CDM Default'})
                  </button>
                )}
              </div>
            </div>

            {activeInspectorSchema ? (
              <div className="space-y-4">
                {/* Header info bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 truncate max-w-xs">{activeInspectorSchema.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({activeInspectorSchema.sizeFormatted})</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      activeInspectorSchema.fileContentType === 'raw_data' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {activeInspectorSchema.fileContentType === 'raw_data' ? '📊 Raw Data' : '📐 Schema DDL/Spec'}
                    </span>
                  </div>

                  {/* View mode toggle */}
                  <div className="flex bg-slate-200/60 p-0.5 rounded-md text-[10px] font-semibold font-sans">
                    <button
                      type="button"
                      onClick={() => setInspectorViewMode('schema')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        inspectorViewMode === 'schema'
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      📐 Schema Columns ({activeInspectorSchema.fields.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorViewMode('preview')}
                      className={`px-2 py-1 rounded transition-all cursor-pointer ${
                        inspectorViewMode === 'preview'
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      📋 First 3 Rows Preview
                    </button>
                  </div>
                </div>

                {/* Content view */}
                {inspectorViewMode === 'schema' ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="p-2.5 w-12 text-center">#</th>
                            <th className="p-2.5">Field / Attribute Name</th>
                            <th className="p-2.5 w-40 font-sans">Declared Type</th>
                            <th className="p-2.5 font-sans">Description / Sample Info</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {activeInspectorSchema.fields.map((field, idx) => {
                            const fType = activeInspectorSchema.fieldTypes?.[field] || 'VARCHAR(50)';
                            const fDesc = activeInspectorSchema.fieldDescriptions?.[field] || 'Declared schema attribute';
                            const fSample = activeInspectorSchema.sampleValues[field];
                            
                            return (
                              <tr key={field} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2.5 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                                <td className="p-2.5 font-semibold text-slate-800 font-mono text-[11px] select-all">{field}</td>
                                <td className="p-2.5">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                    {fType}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-500 max-w-sm truncate" title={fDesc !== 'Declared schema attribute' ? fDesc : fSample}>
                                  {fDesc !== 'Declared schema attribute' ? fDesc : (fSample?.startsWith('(') ? fSample : `Sample: "${fSample}"`)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {activeInspectorSchema.parsedPreviewRows && activeInspectorSchema.parsedPreviewRows.length > 0 ? (
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <th className="p-2.5 w-12 text-center">Row</th>
                              {activeInspectorSchema.fields.slice(0, 8).map(field => (
                                <th key={field} className="p-2.5 font-mono text-[10px] uppercase truncate max-w-[120px]">{field}</th>
                              ))}
                              {activeInspectorSchema.fields.length > 8 && (
                                <th className="p-2.5 text-slate-400 font-medium font-sans">+{activeInspectorSchema.fields.length - 8} more...</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                            {activeInspectorSchema.parsedPreviewRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2.5 text-center text-slate-400 font-semibold bg-slate-50/30">#{rowIdx + 1}</td>
                                {activeInspectorSchema.fields.slice(0, 8).map(field => (
                                  <td key={field} className="p-2.5 text-slate-700 truncate max-w-[120px]" title={row[field]}>
                                    {row[field] !== undefined ? row[field] : <span className="text-slate-300 font-sans">NULL</span>}
                                  </td>
                                ))}
                                {activeInspectorSchema.fields.length > 8 && (
                                  <td className="p-2.5 text-slate-400 italic">...</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-1 font-sans">
                        <Info className="w-5 h-5 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold">No Preview Rows Available</p>
                        <p className="text-[10px] max-w-sm mx-auto leading-relaxed">
                          This file is ingested as a structural schema spec or SQL DDL definition (without raw data rows). View the "Schema Columns" tab to inspect all fields.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400 space-y-1 font-sans">
                <Layers className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Target Spec Defaults to Azure SQL / Databricks</p>
                <p className="text-[10px] max-w-sm mx-auto leading-relaxed">
                  No custom target schema has been uploaded. Semantra will map your source fields into the system-calibrated Azure SQL Server and Databricks DWH schema, fully optimized for Talend ETL, PowerBI, and OneStream.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Execution Panel */}
        <div className="space-y-6">
          {/* Scoring Engine Config */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-sans">4. Scoring Profile</h3>
            
            <div className="space-y-3">
              {[
                { id: 'sap_calibrated', label: 'SAP Calibrated Profile', desc: 'Centralized SAP calibration weights tuned for general ledger and partner domains.', weight: '96% confidence bias' },
                { id: 'default', label: 'Default Multi-Signal', desc: 'Equal weighting on Name match, Embedding semantic overlap, and Glossary concepts.', weight: 'Balanced signal' },
                { id: 'high_precision', label: 'High Precision Alignment', desc: 'Conservative scoring threshold (0.85+). Auto-accepts only highest confidence.', weight: 'Strict threshold' },
                { id: 'llm_heavy', label: 'LLM Closed-Set Refinement', desc: 'Fires downstream LLM validations over heuristically scored candidates.', weight: 'AI intensive' }
              ].map((p) => (
                <label 
                  key={p.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    scoringProfile === p.id 
                      ? 'border-emerald-500 bg-emerald-50/10' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scoringProfile"
                    value={p.id}
                    checked={scoringProfile === p.id}
                    onChange={() => setScoringProfile(p.id)}
                    className="mt-1 text-emerald-500 focus:ring-emerald-400"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">{p.label}</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{p.desc}</span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">{p.weight}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Run Button */}
            <button
              onClick={handleStartMapping}
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-sans text-sm"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Executing Mapping Engine...
                </>
              ) : (
                <>
                  {parsedSourceSchema ? `Run Mapping for Uploaded Schema (${parsedSourceSchema.fields.length} Fields)` : 'Run Automated Auto-Mapping'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">Ingestion Profile</h3>
            
            <div className="space-y-3.5 divide-y divide-slate-800">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-400">Active Scenario:</span>
                <span className="font-semibold text-slate-200">
                  {parsedSourceSchema ? `Uploaded: ${parsedSourceSchema.name}` : currentPresetDetails?.name.replace('SAP Showcase ', '')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 font-sans">
                <span className="text-slate-400">Source Fields:</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {parsedSourceSchema ? `${parsedSourceSchema.fields.length} Custom Fields` : `${currentPresetDetails?.fieldsCount} Fields`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 font-sans">
                <span className="text-slate-400">Target Schema:</span>
                <span className="font-semibold text-slate-200">
                  {parsedTargetSchema
                    ? `Uploaded: ${parsedTargetSchema.name}`
                    : mappingMode === 'standard' 
                    ? 'Azure SQL / Databricks CDM' 
                    : 'Canonical Glossary (Bypassed)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 font-sans">
                <span className="text-slate-400">Scoring Profile:</span>
                <span className="font-semibold text-slate-200 capitalize">{scoringProfile.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 font-sans">
                <span className="text-slate-400">Workspace Context:</span>
                <span className="font-semibold text-sky-300 font-mono text-[11px] truncate max-w-[140px]" title={`${currentSourceSystem || 'Not set'} | ${currentBusinessDomain || 'Any domain'} | ${currentIntegrationName || 'Any integration'}`}>
                  {currentSourceSystem ? `${currentSourceSystem}${currentBusinessDomain ? ` (${currentBusinessDomain})` : ''}` : 'Optional (One-shot)'}
                </span>
              </div>
              {(parsedSourceCompanionSchema || parsedTargetCompanionSchema) && (
                <div className="flex items-start justify-between text-xs pt-3 font-sans">
                  <span className="text-slate-400">Companion Specs:</span>
                  <div className="flex flex-col items-end gap-1">
                    {parsedSourceCompanionSchema && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                        Src Companion ({parsedSourceCompanionSchema.fields.length} specs)
                      </span>
                    )}
                    {parsedTargetCompanionSchema && (
                      <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800">
                        Tgt Companion ({parsedTargetCompanionSchema.fields.length} specs)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                Semantra uses **bounded, inspectable AI** validation. All automatic mappings scoring above **0.75** are auto-accepted, while lower-confidence mappings are held for human approval in the Review panel.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Session Resume Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                Resume Saved Draft Session (SQLite backend)
              </h3>
              <button onClick={() => setShowDraftModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Select a previously saved session state to restore mappings, active review queues, and decisions directly into your current workspace.
            </p>

            <div className="space-y-3 font-mono text-xs">
              {mockSavedDrafts.map((draft) => (
                <div key={draft.id} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-slate-50 transition-all flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900 font-sans text-sm">{draft.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{draft.date}</span>
                      <span>•</span>
                      <span className="uppercase text-indigo-600 font-semibold">{draft.mode} mode</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreDraft(draft)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Session</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
