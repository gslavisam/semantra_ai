import React, { useState } from 'react';
import { 
  Search, 
  SearchCode, 
  User, 
  Workflow, 
  ArrowRight, 
  CheckCircle, 
  Info,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Plus,
  X,
  Filter,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Layers
} from 'lucide-react';
import { CatalogEntry } from '../types';

interface CatalogViewProps {
  catalogEntries: CatalogEntry[];
  onImportMappings: (entry: CatalogEntry) => void;
  onUpdateCatalog?: React.Dispatch<React.SetStateAction<CatalogEntry[]>>;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ 
  catalogEntries, 
  onImportMappings,
  onUpdateCatalog
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>(catalogEntries[0]?.id || '');
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Advanced Filters State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedTarget, setSelectedTarget] = useState<string>('all');
  const [minFitScore, setMinFitScore] = useState<number>(0);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(true);

  // New tag addition input state
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Selected Catalog entry helper
  const selectedEntry = catalogEntries.find(e => e.id === selectedEntryId) || catalogEntries[0] || null;

  // Dynamically extract all unique tags from active catalog
  const allUniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    catalogEntries.forEach(entry => {
      if (entry.tags) {
        entry.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet).sort();
  }, [catalogEntries]);

  // Dynamically extract unique source & target systems
  const sourceSystems = React.useMemo(() => {
    const systems = new Set<string>();
    catalogEntries.forEach(e => systems.add(e.sourceSystem));
    return Array.from(systems).sort();
  }, [catalogEntries]);

  const targetSystems = React.useMemo(() => {
    const systems = new Set<string>();
    catalogEntries.forEach(e => systems.add(e.targetSystem));
    return Array.from(systems).sort();
  }, [catalogEntries]);

  // Handle adding a custom tag to an entry
  const handleAddTag = (entryId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!onUpdateCatalog) return;

    onUpdateCatalog(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const activeTags = entry.tags || [];
        if (activeTags.includes(trimmed)) {
          setNewTagInput('');
          return entry;
        }
        return {
          ...entry,
          tags: [...activeTags, trimmed]
        };
      }
      return entry;
    }));
    setNewTagInput('');
  };

  // Handle removing a tag from an entry
  const handleRemoveTag = (entryId: string, tagToRemove: string) => {
    if (!onUpdateCatalog) return;

    onUpdateCatalog(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const activeTags = entry.tags || [];
        return {
          ...entry,
          tags: activeTags.filter(t => t !== tagToRemove)
        };
      }
      return entry;
    }));
  };

  // Toggle tag filter
  const handleToggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Reset all advanced filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedSource('all');
    setSelectedTarget('all');
    setMinFitScore(0);
  };

  // Filter catalog entries
  const filteredEntries = React.useMemo(() => {
    return catalogEntries.filter((entry) => {
      // Text match
      const textPool = `${entry.name} ${entry.description} ${entry.owner} ${entry.sourceSystem} ${entry.targetSystem}`.toLowerCase();
      const matchesText = textPool.includes(searchTerm.toLowerCase());

      // Tags match (AND gate compliance: must contain all selected tags)
      const entryTags = entry.tags || [];
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => entryTags.includes(t));

      // Source matching
      const matchesSource = selectedSource === 'all' || entry.sourceSystem === selectedSource;

      // Target matching
      const matchesTarget = selectedTarget === 'all' || entry.targetSystem === selectedTarget;

      // Fit score matching
      const displayFit = entry.reuseFitScore <= 1.0 ? Math.round(entry.reuseFitScore * 100) : Math.round(entry.reuseFitScore);
      const matchesFit = displayFit >= minFitScore;

      return matchesText && matchesTags && matchesSource && matchesTarget && matchesFit;
    });
  }, [catalogEntries, searchTerm, selectedTags, selectedSource, selectedTarget, minFitScore]);

  // Import mappings action
  const handleImport = (entry: CatalogEntry) => {
    setIsImporting(true);
    setTimeout(() => {
      onImportMappings(entry);
      setIsImporting(false);
    }, 1000);
  };

  const isFilterActive = searchTerm !== '' || selectedTags.length > 0 || selectedSource !== 'all' || selectedTarget !== 'all' || minFitScore > 0;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <SearchCode className="w-5 h-5 text-emerald-500" />
              Enterprise Integration Catalog
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-sans max-w-3xl">
              Search, compare, and reuse approved corporate mapping sets. Semantra scans active workspace schemas, calculates a dynamic **Workspace Reuse Fit** score, and lets you import golden-standard baselines to skip cold-start auto-mapping.
            </p>
          </div>
          <span className="shrink-0 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
            <strong>{catalogEntries.length}</strong> Registered Corporate Blueprints
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Advanced Filters & Cards/Table List */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Advanced Filtering & Tagging Console */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-700 font-sans flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                Advanced Metadata Filter Engine
              </span>
              <div className="flex items-center gap-2">
                {isFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-slate-200/60 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Filters
                  </button>
                )}
                <button
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium font-sans cursor-pointer"
                >
                  {isFiltersExpanded ? 'Collapse Engine' : 'Expand Filters'}
                </button>
              </div>
            </div>

            {/* Always visible core search row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog by asset name, descriptions, mappings, owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-sans"
                />
              </div>

              {/* View mode toggler */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-semibold ${
                    viewMode === 'grid' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-semibold ${
                    viewMode === 'table' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Tabular</span>
                </button>
              </div>
            </div>

            {isFiltersExpanded && (
              <div className="pt-2 border-t border-slate-100 space-y-3 transition-all">
                {/* Systems select and fit score row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Source system select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Source Application
                    </label>
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="all">All Systems ({sourceSystems.length})</option>
                      {sourceSystems.map((sys, idx) => (
                        <option key={idx} value={sys}>{sys}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target system select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Target System Domain
                    </label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="all">All Targets ({targetSystems.length})</option>
                      {targetSystems.map((sys, idx) => (
                        <option key={idx} value={sys}>{sys}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reuse fit threshold slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Min Reuse Fit Threshold
                      </label>
                      <span className="text-[11px] font-bold font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">
                        &ge; {minFitScore}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minFitScore}
                      onChange={(e) => setMinFitScore(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none mt-2"
                    />
                  </div>
                </div>

                {/* Tags multi-select container */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Corporate Metadata Tags Filter ({selectedTags.length} active)
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                    {allUniqueTags.map((tag, idx) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleTagFilter(tag)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5 shrink-0" />
                          <span>{tag}</span>
                          {isSelected && <X className="w-2.5 h-2.5 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cards Grid or Table view */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                const displayFit = entry.reuseFitScore <= 1.0
                  ? Math.round(entry.reuseFitScore * 100)
                  : Math.round(entry.reuseFitScore);

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[200px] bg-white ${
                      isSelected 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-xs font-semibold text-slate-800 font-sans line-clamp-1">{entry.name}</h3>
                        <span className="shrink-0 px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-sans">{entry.description}</p>
                      
                      {/* Tags inside the card */}
                      <div className="flex flex-wrap gap-1">
                        {(entry.tags || []).slice(0, 4).map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[9px] font-mono font-medium">
                            {tag}
                          </span>
                        ))}
                        {(entry.tags || []).length > 4 && (
                          <span className="text-[9px] text-slate-400 font-mono self-center">
                            +{entry.tags!.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <div className="flex items-center gap-1">
                        <Workflow className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-500 text-[10px] truncate max-w-[130px]" title={`${entry.sourceSystem} → ${entry.targetSystem}`}>
                          {entry.sourceSystem.split(' ')[0]} &rarr; {entry.targetSystem.split(' ')[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {entry.fieldsMapped} Fields
                        </span>
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          displayFit >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : displayFit >= 40 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {displayFit}% Fit
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredEntries.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white space-y-2">
                  <Info className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold font-sans">No matching corporate blueprint matches current filters.</p>
                  <p className="text-[11px] text-slate-400 font-sans">Adjust search keywords, tags, or lower your Fit Threshold value.</p>
                </div>
              )}
            </div>
          ) : (
            /* Dense Tabular View for 100+ Integrations */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-semibold">Integration Asset</th>
                      <th className="py-2.5 px-4 font-semibold">Source &rarr; Target</th>
                      <th className="py-2.5 px-4 font-semibold">Associated Tags</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Fields</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Reuse Fit</th>
                      <th className="py-2.5 px-4 font-semibold">Steward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map((entry) => {
                      const isSelected = selectedEntry?.id === entry.id;
                      const displayFit = entry.reuseFitScore <= 1.0
                        ? Math.round(entry.reuseFitScore * 100)
                        : Math.round(entry.reuseFitScore);

                      return (
                        <tr
                          key={entry.id}
                          onClick={() => setSelectedEntryId(entry.id)}
                          className={`group cursor-pointer transition-colors text-[11px] ${
                            isSelected 
                              ? 'bg-emerald-50/40 font-medium' 
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 font-sans group-hover:text-emerald-700 transition-colors">
                                {entry.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-sans line-clamp-1 max-w-[240px]">
                                {entry.description}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            <div className="flex items-center gap-1">
                              <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[9px]">
                                {entry.sourceSystem}
                              </span>
                              <span className="text-slate-400">&rarr;</span>
                              <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[9px]">
                                {entry.targetSystem}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(entry.tags || []).slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="bg-slate-50 border border-slate-150 text-[9px] font-mono text-slate-500 px-1.5 py-0.2 rounded">
                                  {tag}
                                </span>
                              ))}
                              {(entry.tags || []).length > 3 && (
                                <span className="text-[9px] text-slate-400 font-mono">+{entry.tags!.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500">
                            {entry.fieldsMapped}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] inline-block ${
                              displayFit >= 80 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : displayFit >= 40 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {displayFit}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-sans">
                            {entry.owner}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                          No matching assets found. Try adjusting your search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Selected Catalog Entry Detail & Dynamic Tagging */}
        <div>
          {selectedEntry ? (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-800 pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded uppercase">
                    {selectedEntry.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {selectedEntry.id}</span>
                </div>
                <h3 className="text-sm font-bold text-white font-sans mt-1.5">{selectedEntry.name}</h3>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>Steward: {selectedEntry.owner}</span>
                </div>
              </div>

              {/* Dynamic Tag Management Subsystem */}
              <div className="space-y-2 bg-slate-800/20 border border-slate-800 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    Asset Metadata Tags
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono">{(selectedEntry.tags || []).length} assigned</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(selectedEntry.tags || []).map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="group inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-slate-100 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700 transition-all select-none"
                    >
                      {tag}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(selectedEntry.id, tag);
                        }}
                        className="text-slate-500 hover:text-rose-400 font-bold ml-1 focus:outline-none cursor-pointer"
                        title={`Remove tag "${tag}"`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Dynamic Add Tag */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTag(selectedEntry.id, newTagInput);
                    }}
                    className="inline-flex items-center gap-1"
                  >
                    <input
                      type="text"
                      placeholder="+ Tag Name"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] w-18 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </form>
                </div>
                <p className="text-[9px] text-slate-500 font-sans">
                  Press Enter to append custom corporate metadata tags instantly.
                </p>
              </div>

              {/* Mappings preview inside catalog detail */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">Sample Fields Included</h4>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 space-y-1.5">
                  {selectedEntry.mappings.map((m, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-300">{m.source}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-emerald-400 font-semibold">{m.target}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reuse Fit details */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800">
                <h4 className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Workspace Reuse Fit
                </h4>
                
                {(() => {
                  const selectedFit = selectedEntry.reuseFitScore <= 1.0 
                    ? Math.round(selectedEntry.reuseFitScore * 100) 
                    : Math.round(selectedEntry.reuseFitScore);
                  return (
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-bold font-mono leading-none ${
                        selectedFit >= 80 ? 'text-emerald-400' : selectedFit >= 40 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {selectedFit}%
                      </span>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block font-sans">Semantic Alignment Confidence</span>
                        <span className="text-[10px] text-slate-400 font-sans">Computed based on active workspace schemas</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-slate-800/60 p-3 rounded border-l-2 border-emerald-500">
                  <p className="text-[11px] text-slate-300 leading-normal font-sans">
                    {selectedEntry.reuseExplanation}
                  </p>
                </div>
              </div>

              {/* Import Action */}
              <button
                onClick={() => handleImport(selectedEntry)}
                disabled={isImporting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors font-sans cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Applying baseline...
                  </>
                ) : (
                  <>
                    Apply approved mappings to workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm text-center text-slate-400 text-xs py-12">
              Select a catalog entry to review details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
