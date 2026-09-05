import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Copy, Check, Download, FileCode, FileSpreadsheet, ShieldAlert, Sparkles } from 'lucide-react';
import { ModelSchemaSpec } from '../utils/schemaValidation';

interface SchemaSpecificationGuideProps {
  spec: ModelSchemaSpec;
  defaultExpanded?: boolean;
}

export const SchemaSpecificationGuide: React.FC<SchemaSpecificationGuideProps> = ({
  spec,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedFormat, setCopiedFormat] = useState<'csv' | 'json' | null>(null);

  const copyToClipboard = (text: string, format: 'csv' | 'json') => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const downloadSampleFile = (format: 'csv' | 'json') => {
    let content = '';
    let mime = '';
    let extension = '';

    if (format === 'csv') {
      content = spec.sampleCsv;
      mime = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else {
      content = JSON.stringify(spec.sampleJson, null, 2);
      mime = 'application/json;charset=utf-8;';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${spec.modelName}_sample_template.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm font-sans text-xs">
      {/* Header toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono font-bold text-slate-200 text-xs flex items-center gap-2">
              <span>{spec.title} & Formats</span>
              <span className="text-[10px] text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono">
                CSV & JSON Supported
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isExpanded ? 'Click to collapse format specifications' : 'Click to inspect required headers, allowed enums, types and download templates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-950/60">
          
          {/* Summary & Template Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg">
            <div className="space-y-0.5">
              <span className="font-mono text-slate-300 font-medium text-xs block">
                Allowed File Formats: <strong className="text-emerald-400 font-mono">.csv</strong> or <strong className="text-indigo-400 font-mono">.json</strong>
              </span>
              <p className="text-[11px] text-slate-400">
                JSON files should contain an array of objects. CSV files must include a header line matching field names or accepted aliases.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* CSV Template */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); downloadSampleFile('csv'); }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                title="Download CSV template"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download .CSV</span>
              </button>

              {/* JSON Template */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); downloadSampleFile('json'); }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                title="Download JSON template"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>Download .JSON</span>
              </button>

              {/* Copy CSV Sample */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); copyToClipboard(spec.sampleCsv, 'csv'); }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                title="Copy sample CSV to clipboard"
              >
                {copiedFormat === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Schema Fields Table */}
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2">Column / Field</th>
                    <th className="p-2">Required</th>
                    <th className="p-2">Type / Allowed Enums</th>
                    <th className="p-2">Recognized Aliases</th>
                    <th className="p-2">Description & Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {spec.fields.map(f => (
                    <tr key={f.name} className="hover:bg-slate-900/40">
                      <td className="p-2 font-bold text-white whitespace-nowrap">
                        <code>{f.name}</code>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {f.required ? (
                          <span className="px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded text-[9px] font-bold">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Optional</span>
                        )}
                      </td>
                      <td className="p-2">
                        {f.allowedValues ? (
                          <div className="space-y-0.5">
                            <span className="text-indigo-300 block text-[10px] font-bold">{f.type}</span>
                            <div className="flex flex-wrap gap-1">
                              {f.allowedValues.map(v => (
                                <code key={v} className="px-1 py-0.2 bg-slate-900 text-slate-300 rounded text-[9px] border border-slate-800">
                                  {v}
                                </code>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">{f.type}</span>
                        )}
                      </td>
                      <td className="p-2 text-slate-400 text-[10px]">
                        {f.aliases.length > 0 ? (
                          <span className="text-slate-400">{f.aliases.slice(0, 3).join(', ')}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-2 font-sans text-slate-300 text-[11px]">
                        <div>{f.description}</div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          Ex: <span className="text-slate-400">{f.example}</span>
                        </div>
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
  );
};
