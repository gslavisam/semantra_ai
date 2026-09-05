import React, { useState, useRef } from 'react';
import { X, Upload, Layers, Check, AlertCircle, FileSpreadsheet, CheckCircle2, Download, FileText, RefreshCw, FileCode } from 'lucide-react';
import { OverlayRule } from '../types';
import { OVERLAY_SCHEMA, validateDataRow, ValidationIssue } from '../utils/schemaValidation';
import { SchemaSpecificationGuide } from './SchemaSpecificationGuide';
import { ValidationReportPanel } from './ValidationReportPanel';

interface ImportOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportOverlay: (fileName: string, title: string, system: string, rules: OverlayRule[], activateInStack: boolean) => void;
}

interface ProcessedOverlayItem {
  rowNumber: number;
  id: string;
  source_system: string;
  source_field: string;
  target_canonical_concept: string;
  override_type: 'alias_promotion' | 'domain_override' | 'pii_tag' | 'type_mapping';
  steward: string;
  notes: string;
  isValid: boolean;
  issues: ValidationIssue[];
}

export const ImportOverlayModal: React.FC<ImportOverlayModalProps> = ({
  isOpen,
  onClose,
  onImportOverlay
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [overlayTitle, setOverlayTitle] = useState<string>('');
  const [sourceSystem, setSourceSystem] = useState<string>('Enterprise System');
  const [activateInStack, setActivateInStack] = useState<boolean>(true);
  const [skipErrors, setSkipErrors] = useState<boolean>(true);
  
  const [processedItems, setProcessedItems] = useState<ProcessedOverlayItem[]>([]);
  const [allIssues, setAllIssues] = useState<ValidationIssue[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result.map(s => s.replace(/^"+|"+$/g, '').trim());
  };

  const processContent = (content: string, name: string) => {
    setIsParsing(true);
    setErrorBanner(null);
    setProcessedItems([]);
    setAllIssues([]);

    try {
      const trimmed = content.trim();
      let rawObjects: Record<string, any>[] = [];

      // Detect JSON vs CSV
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          rawObjects = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e: any) {
          setErrorBanner(`JSON Parse Error: ${e?.message || 'Invalid JSON format'}`);
          setIsParsing(false);
          return;
        }
      } else {
        const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setErrorBanner('CSV must contain a header row and at least one data row.');
          setIsParsing(false);
          return;
        }

        const headers = parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const parts = parseCSVLine(lines[i]);
          if (parts.length === 0 || parts.every(p => p === '')) continue;
          const obj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            obj[h] = parts[idx] !== undefined ? parts[idx] : '';
          });
          rawObjects.push(obj);
        }
      }

      if (rawObjects.length === 0) {
        setErrorBanner('No data rows found in file/text.');
        setIsParsing(false);
        return;
      }

      const items: ProcessedOverlayItem[] = [];
      const collectedIssues: ValidationIssue[] = [];
      let detectedSys = sourceSystem;

      rawObjects.forEach((rawObj, idx) => {
        const rowNum = idx + 1;
        const validation = validateDataRow(rawObj, rowNum, OVERLAY_SCHEMA);
        collectedIssues.push(...validation.issues);

        const source_field = validation.cleanRecord.source_field || '';
        const target_canonical_concept = validation.cleanRecord.target_canonical_concept || '';
        const ruleSys = validation.cleanRecord.source_system || detectedSys;
        if (validation.cleanRecord.source_system) {
          detectedSys = validation.cleanRecord.source_system;
        }

        const rawType = validation.cleanRecord.override_type || 'alias_promotion';
        const override_type: 'alias_promotion' | 'domain_override' | 'pii_tag' | 'type_mapping' = 
          ['alias_promotion', 'domain_override', 'pii_tag', 'type_mapping'].includes(rawType)
            ? rawType
            : 'alias_promotion';

        const steward = validation.cleanRecord.steward || 'Data Steward';
        const notes = validation.cleanRecord.notes || `Overlay rule from ${name}`;
        const id = validation.cleanRecord.id || `ov_imp_${Date.now()}_${rowNum}`;

        items.push({
          rowNumber: rowNum,
          id,
          source_system: ruleSys,
          source_field,
          target_canonical_concept,
          override_type,
          steward,
          notes,
          isValid: validation.isValid,
          issues: validation.issues
        });
      });

      setProcessedItems(items);
      setAllIssues(collectedIssues);
      setFileName(name);
      setOverlayTitle(name.replace(/\.(csv|json)$/i, '').replace(/_/g, ' ').toUpperCase());
      setSourceSystem(detectedSys);
    } catch (err: any) {
      setErrorBanner(`Error parsing overlay file: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleCommit = () => {
    const candidateItems = skipErrors 
      ? processedItems.filter(r => r.isValid) 
      : processedItems;

    if (candidateItems.length === 0 || !fileName) return;

    const rulesToMount: OverlayRule[] = candidateItems.map(c => ({
      id: c.id,
      source_system: c.source_system,
      source_field: c.source_field,
      target_canonical_concept: c.target_canonical_concept,
      override_type: c.override_type,
      steward: c.steward,
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      notes: c.notes
    }));

    onImportOverlay(
      fileName.endsWith('.csv') || fileName.endsWith('.json') ? fileName : `${fileName}.csv`,
      overlayTitle || fileName,
      sourceSystem,
      rulesToMount,
      activateInStack
    );
    onClose();
  };

  const validItems = processedItems.filter(r => r.isValid);
  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const canCommit = processedItems.length > 0 && (skipErrors ? validItems.length > 0 : errorCount === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Upload Custom Overlay
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-sans">
                  CSV & JSON with Pre-flight Validation
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Import client-specific or system-specific mapping overlay files into the active runtime stack.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorBanner && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Collapsible Format & Schema Guide */}
          <SchemaSpecificationGuide spec={OVERLAY_SCHEMA} defaultExpanded={false} />

          {/* Mode Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === 'upload' 
                    ? 'bg-emerald-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>File Upload (.csv / .json)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors ${
                  activeTab === 'paste' 
                    ? 'bg-emerald-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text (CSV / JSON)</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Upload Dropzone */}
          {activeTab === 'upload' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-slate-900/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.json,text/csv,application/json" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-slate-200 text-xs">
                  {fileName ? `Selected: ${fileName}` : 'Click to select or drag & drop overlay CSV / JSON file'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Verifies source field, target canonical mapping, and override behavior modes.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw Content */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste CSV text with headers or JSON array of overlay rules here..."
                rows={5}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!rawText.trim()}
                  onClick={() => processContent(rawText, 'pasted_overlay')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-mono text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Parse & Validate</span>
                </button>
              </div>
            </div>
          )}

          {/* Configuration if parsed */}
          {processedItems.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              
              {/* Validation Report Panel */}
              <ValidationReportPanel
                totalRows={processedItems.length}
                validRowsCount={validItems.length}
                warningRowsCount={warningCount}
                errorRowsCount={errorCount}
                issues={allIssues}
                skipErrors={skipErrors}
                onToggleSkipErrors={setSkipErrors}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Overlay Display Title</label>
                  <input
                    type="text"
                    value={overlayTitle}
                    onChange={(e) => setOverlayTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Primary Source System</label>
                  <input
                    type="text"
                    value={sourceSystem}
                    onChange={(e) => setSourceSystem(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-200 block text-xs">Runtime Activation</span>
                  <span className="text-[11px] text-slate-400">Activate this overlay in the active mapping stack immediately upon import.</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-emerald-400">
                  <input
                    type="checkbox"
                    checked={activateInStack}
                    onChange={(e) => setActivateInStack(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                  />
                  <span>Active in Stack</span>
                </label>
              </div>

              {/* Parsed rules table preview */}
              <div className="space-y-2">
                <span className="font-mono text-slate-400 text-[11px] block">
                  Parsed Rules Preview ({validItems.length} valid of {processedItems.length}):
                </span>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-40 overflow-y-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">System</th>
                        <th className="p-2">Source Field</th>
                        <th className="p-2">&rarr; Target Canonical</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {processedItems.slice(0, 10).map((r, idx) => (
                        <tr key={idx} className={r.isValid ? 'hover:bg-slate-900/50' : 'bg-rose-950/20 text-rose-300'}>
                          <td className="p-2 font-bold">{r.rowNumber}</td>
                          <td className="p-2 text-slate-400">{r.source_system}</td>
                          <td className="p-2 font-bold text-white">{r.source_field}</td>
                          <td className="p-2 text-emerald-400">{r.target_canonical_concept}</td>
                          <td className="p-2 text-indigo-400">{r.override_type}</td>
                          <td className="p-2">
                            {r.isValid ? (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px]">VALID</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[9px]">INVALID</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            {processedItems.length > 0 ? `${validItems.length} valid rules ready to mount` : 'No file loaded yet'}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canCommit}
              onClick={handleCommit}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {errorCount > 0 && skipErrors
                  ? `Mount ${validItems.length} Valid Rules (Skip ${errorCount} Errors)`
                  : `Mount ${validItems.length} Overlay Rules`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
