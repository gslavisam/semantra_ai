import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Filter, ShieldAlert } from 'lucide-react';
import { ValidationIssue } from '../utils/schemaValidation';

interface ValidationReportPanelProps {
  totalRows: number;
  validRowsCount: number;
  warningRowsCount: number;
  errorRowsCount: number;
  issues: ValidationIssue[];
  skipErrors: boolean;
  onToggleSkipErrors: (skip: boolean) => void;
}

export const ValidationReportPanel: React.FC<ValidationReportPanelProps> = ({
  totalRows,
  validRowsCount,
  warningRowsCount,
  errorRowsCount,
  issues,
  skipErrors,
  onToggleSkipErrors
}) => {
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(errorRowsCount > 0);

  const filteredIssues = issues.filter(issue => {
    if (filter === 'errors') return issue.severity === 'error';
    if (filter === 'warnings') return issue.severity === 'warning';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm font-sans text-xs space-y-3 p-4">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-4 gap-3 font-mono">
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
          <span className="text-[10px] text-slate-400 block">Total Rows</span>
          <span className="text-lg font-bold text-white">{totalRows}</span>
        </div>

        <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
          <span className="text-[10px] text-emerald-400 block">Valid Rows</span>
          <span className="text-lg font-bold text-emerald-300">{validRowsCount}</span>
        </div>

        <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg">
          <span className="text-[10px] text-amber-400 block">Warnings</span>
          <span className="text-lg font-bold text-amber-300">{warningRowsCount}</span>
        </div>

        <div className={`p-2.5 rounded-lg border ${
          errorRowsCount > 0 
            ? 'bg-rose-950/40 border-rose-500/40' 
            : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`text-[10px] block ${errorRowsCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
            Blocking Errors
          </span>
          <span className={`text-lg font-bold ${errorRowsCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
            {errorRowsCount}
          </span>
        </div>
      </div>

      {/* Validation Policy Toggle (if errors exist) */}
      {errorRowsCount > 0 && (
        <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-rose-200">
              {errorRowsCount} row(s) failed schema validation rules.
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-200 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800 select-none">
            <input
              type="checkbox"
              checked={skipErrors}
              onChange={(e) => onToggleSkipErrors(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[11px]">
              Allow importing valid rows (skip {errorRowsCount} invalid)
            </span>
          </label>
        </div>
      )}

      {/* Issues Table Drawer */}
      {issues.length > 0 && (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 bg-slate-900 flex items-center justify-between cursor-pointer select-none text-[11px] font-mono border-b border-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>Validation Log & Linting Details</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {issues.length} entries
                </span>
              </span>

              {/* Quick filter tabs */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  All ({issues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('errors')}
                  className={`px-2 py-0.5 rounded text-[10px] ${filter === 'errors' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'text-rose-400 hover:text-rose-300'}`}
                >
                  Errors ({issues.filter(i => i.severity === 'error').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('warnings')}
                  className={`px-2 py-0.5 rounded text-[10px] ${filter === 'warnings' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'text-amber-400 hover:text-amber-300'}`}
                >
                  Warnings ({issues.filter(i => i.severity === 'warning').length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[10px]">{isExpanded ? 'Hide Details' : 'View Details'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          {isExpanded && (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2 w-16">Row #</th>
                    <th className="p-2 w-24">Severity</th>
                    <th className="p-2 w-32">Field</th>
                    <th className="p-2">Validation Rule / Diagnostic Message</th>
                    <th className="p-2 w-36">Input Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredIssues.map((issue, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-2 font-bold text-white">Row {issue.rowNumber}</td>
                      <td className="p-2">
                        {issue.severity === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[9px]">
                            <AlertCircle className="w-2.5 h-2.5" /> ERROR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px]">
                            <AlertTriangle className="w-2.5 h-2.5" /> WARNING
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-indigo-300 font-semibold">{issue.field}</td>
                      <td className="p-2 text-slate-300">{issue.message}</td>
                      <td className="p-2 text-slate-400 truncate max-w-[140px]">
                        {issue.value !== undefined ? String(issue.value) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
