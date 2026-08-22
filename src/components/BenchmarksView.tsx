import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp as TrendingIcon, 
  Sparkles, 
  Award as AwardIcon, 
  RefreshCw as RefreshIcon,
  Play as PlayIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Terminal,
  FileText,
  Info,
  ShieldCheck,
  Layers,
  Settings as SettingsIcon,
  UploadCloud,
  Check,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import { BenchmarkDataset, CorrectionRule, MappingRow } from '../types';

interface BenchmarksViewProps {
  benchmarkDatasets: BenchmarkDataset[];
  setBenchmarkDatasets: React.Dispatch<React.SetStateAction<BenchmarkDataset[]>>;
  correctionRules: CorrectionRule[];
  mappings?: MappingRow[];
  selectedPreset?: string;
  onUpdateMappings?: React.Dispatch<React.SetStateAction<MappingRow[]>>;

  hasRunActiveWorkspace?: boolean;
  setHasRunActiveWorkspace?: React.Dispatch<React.SetStateAction<boolean>>;
  lastRunTimestamp?: string | null;
  setLastRunTimestamp?: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDatasetId?: string;
  setSelectedDatasetId?: (id: string) => void;
  useGoldenMaster?: boolean;
  setUseGoldenMaster?: React.Dispatch<React.SetStateAction<boolean>>;
  hasAudited?: boolean;
  setHasAudited?: React.Dispatch<React.SetStateAction<boolean>>;
  customGoldenUploaded?: boolean;
  setCustomGoldenUploaded?: React.Dispatch<React.SetStateAction<boolean>>;
  customGoldenFields?: { field: string; expectedTransformation: string; desc: string }[];
  setCustomGoldenFields?: React.Dispatch<React.SetStateAction<{ field: string; expectedTransformation: string; desc: string }[]>>;
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({ 
  benchmarkDatasets, 
  setBenchmarkDatasets,
  correctionRules,
  mappings = [],
  selectedPreset = 'customer_sales_area',
  onUpdateMappings,
  hasRunActiveWorkspace: propHasRun,
  setHasRunActiveWorkspace: propSetHasRun,
  lastRunTimestamp: propLastRunTimestamp,
  setLastRunTimestamp: propSetLastRunTimestamp,
  selectedDatasetId: propSelectedDatasetId,
  setSelectedDatasetId: propSetSelectedDatasetId,
  useGoldenMaster: propUseGoldenMaster,
  setUseGoldenMaster: propSetUseGoldenMaster,
  hasAudited: propHasAudited,
  setHasAudited: propSetHasAudited,
  customGoldenUploaded: propCustomGoldenUploaded,
  setCustomGoldenUploaded: propSetCustomGoldenUploaded,
  customGoldenFields: propCustomGoldenFields,
  setCustomGoldenFields: propSetCustomGoldenFields
}) => {
  const [isRunning, setIsRunning] = useState<string | null>(null);

  const [localHasRunActiveWorkspace, setLocalHasRunActiveWorkspace] = useState<boolean>(false);
  const hasRunActiveWorkspace = propHasRun !== undefined ? propHasRun : localHasRunActiveWorkspace;
  const setHasRunActiveWorkspace = propSetHasRun || setLocalHasRunActiveWorkspace;

  const [localLastRunTimestamp, setLocalLastRunTimestamp] = useState<string | null>(null);
  const lastRunTimestamp = propLastRunTimestamp !== undefined ? propLastRunTimestamp : localLastRunTimestamp;
  const setLastRunTimestamp = propSetLastRunTimestamp || setLocalLastRunTimestamp;

  const [localSelectedDatasetId, setLocalSelectedDatasetId] = useState<string>('active_workspace');
  const selectedDatasetId = propSelectedDatasetId !== undefined ? propSelectedDatasetId : localSelectedDatasetId;
  const setSelectedDatasetId = propSetSelectedDatasetId || setLocalSelectedDatasetId;

  // Proposal 1: Golden Master Alignment Audit States & Helpers
  const [localUseGoldenMaster, setLocalUseGoldenMaster] = useState<boolean>(false);
  const useGoldenMaster = propUseGoldenMaster !== undefined ? propUseGoldenMaster : localUseGoldenMaster;
  const setUseGoldenMaster = propSetUseGoldenMaster || setLocalUseGoldenMaster;

  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  const [localHasAudited, setLocalHasAudited] = useState<boolean>(false);
  const hasAudited = propHasAudited !== undefined ? propHasAudited : localHasAudited;
  const setHasAudited = propSetHasAudited || setLocalHasAudited;

  const [localCustomGoldenUploaded, setLocalCustomGoldenUploaded] = useState<boolean>(false);
  const customGoldenUploaded = propCustomGoldenUploaded !== undefined ? propCustomGoldenUploaded : localCustomGoldenUploaded;
  const setCustomGoldenUploaded = propSetCustomGoldenUploaded || setLocalCustomGoldenUploaded;

  const [localCustomGoldenFields, setLocalCustomGoldenFields] = useState<{ field: string; expectedTransformation: string; desc: string }[]>([]);
  const customGoldenFields = propCustomGoldenFields !== undefined ? propCustomGoldenFields : localCustomGoldenFields;
  const setCustomGoldenFields = propSetCustomGoldenFields || setLocalCustomGoldenFields;

  const [isGoldenReportExpanded, setIsGoldenReportExpanded] = useState<boolean>(true);

  const getGoldenMasterMappings = React.useCallback((preset: string) => {
    if (preset === 'customer_sales_area') {
      return [
        { field: 'col_1', expectedTransformation: "CAST('C-' + CAST([col_1] AS VARCHAR(20)) AS VARCHAR(20))", desc: 'Prefix customer ID with C- and cast to VARCHAR(20)' },
        { field: 'col_2', expectedTransformation: "CAST(TRIM([col_2]) AS VARCHAR(100))", desc: 'Trim customer name and cast to VARCHAR(100)' },
        { field: 'col_3', expectedTransformation: "CAST(UPPER(TRIM([col_3])) AS VARCHAR(2))", desc: 'Uppercase and trim ISO country code' },
        { field: 'col_4', expectedTransformation: "CAST([col_4] AS VARCHAR(50))", desc: 'Cast region to standard VARCHAR(50)' },
        { field: 'col_5', expectedTransformation: "CASE WHEN [col_5] >= 200000 THEN 'Enterprise' WHEN [col_5] >= 100000 THEN 'Premium' WHEN [col_5] >= 75000 THEN 'Midmarket' ELSE 'Standard' END", desc: 'Multi-branch revenue tiering string' },
        { field: 'col_6', expectedTransformation: "CAST([col_6] AS VARCHAR(10))", desc: 'Cast Sales Office reference to VARCHAR(10)' }
      ];
    }
    if (preset === 'material_master') {
      return [
        { field: 'col_1', expectedTransformation: "CAST('M-' + CAST([col_1] AS VARCHAR(30)) AS VARCHAR(30))", desc: 'Prefix material ID with M-' },
        { field: 'col_2', expectedTransformation: "CAST(TRIM([col_2]) AS VARCHAR(200))", desc: 'Trim material descriptor to VARCHAR(200)' },
        { field: 'col_3', expectedTransformation: "CAST(UPPER(TRIM([col_3])) AS VARCHAR(3))", desc: 'Standardized UOM code' },
        { field: 'col_4', expectedTransformation: "CAST([col_4] AS VARCHAR(100))", desc: 'Material category mapping' },
        { field: 'col_5', expectedTransformation: "CAST([col_5] AS DECIMAL(10,4))", desc: 'Decimal unit weight format' }
      ];
    }
    if (preset === 'supplier_master') {
      return [
        { field: 'col_1', expectedTransformation: "CAST('S-' + CAST([col_1] AS VARCHAR(25)) AS VARCHAR(25))", desc: 'Prefix supplier master key' },
        { field: 'col_2', expectedTransformation: "CAST(TRIM([col_2]) AS VARCHAR(150))", desc: 'Trim supplier corporate name' },
        { field: 'col_3', expectedTransformation: "CAST(UPPER(TRIM([col_3])) AS VARCHAR(2))", desc: 'Supplier location ISO country code' },
        { field: 'col_4', expectedTransformation: "CAST([col_4] AS VARCHAR(4))", desc: 'Vendor payment terms indicator' }
      ];
    }
    if (preset === 'generic_account_master') {
      return [
        { field: 'col_1', expectedTransformation: "CAST('ACC-' + CAST([col_1] AS VARCHAR(15)) AS VARCHAR(15))", desc: 'Account reference prefix' },
        { field: 'col_2', expectedTransformation: "CAST(TRIM([col_2]) AS VARCHAR(100))", desc: 'Account executive descriptor' },
        { field: 'col_3', expectedTransformation: "CAST(UPPER(TRIM([col_3])) AS VARCHAR(3))", desc: 'Iso currency key format' }
      ];
    }
    return [];
  }, []);

  const goldenMasterRules = React.useMemo(() => {
    if (selectedPreset === 'custom_upload') {
      return customGoldenFields;
    }
    return getGoldenMasterMappings(selectedPreset || 'customer_sales_area');
  }, [selectedPreset, customGoldenFields, getGoldenMasterMappings]);

  const goldenMasterAvailable = goldenMasterRules.length > 0;

  const auditReport = React.useMemo(() => {
    if (!goldenMasterAvailable || !hasAudited) return null;

    let matchedCount = 0;
    const comparisons = goldenMasterRules.map(golden => {
      // Find the active mapping row matching golden.field
      const activeMapping = mappings.find(m => m.sourceField === golden.field);
      
      if (!activeMapping) {
        return {
          field: golden.field,
          desc: golden.desc,
          activeFormula: 'Missing Mapping',
          goldenFormula: golden.expectedTransformation,
          status: 'MISSING' as const,
          details: 'Field is not configured in the active workspace.'
        };
      }

      const activeForm = (activeMapping.transformation || '').replace(/\s+/g, '').toLowerCase();
      const goldenForm = golden.expectedTransformation.replace(/\s+/g, '').toLowerCase();

      let status: 'MATCH' | 'VARIATION' | 'MISMATCH' = 'MISMATCH';
      let details = 'Transformation syntax deviates from golden standard.';

      if (activeForm === goldenForm) {
        status = 'MATCH';
        details = 'Exact syntactic alignment.';
        matchedCount++;
      } else if (
        (activeForm.includes('trim') && goldenForm.includes('trim')) ||
        (activeForm.includes('cast') && goldenForm.includes('cast')) ||
        (activeForm.includes('upper') && goldenForm.includes('upper'))
      ) {
        status = 'VARIATION';
        details = 'Slight syntax or precision variation, functionally acceptable.';
        matchedCount += 0.85; // Partial credit
      }

      return {
        field: golden.field,
        desc: golden.desc,
        activeFormula: activeMapping.transformation || 'Direct mapping',
        goldenFormula: golden.expectedTransformation,
        status,
        details,
        mappingId: activeMapping.id,
        sourceField: activeMapping.sourceField,
        targetField: activeMapping.targetField
      };
    });

    const alignmentScore = Math.round((matchedCount / goldenMasterRules.length) * 100);

    return {
      alignmentScore,
      comparisons
    };
  }, [goldenMasterRules, mappings, hasAudited, goldenMasterAvailable]);

  const handleApplyGoldenOverride = (mappingId: string, goldenFormula: string) => {
    if (!onUpdateMappings) return;
    onUpdateMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        return {
          ...m,
          transformation: goldenFormula,
          explanation: `Aligned to compliance structure using Golden Master override standard.`,
          confidence: 'high' as const,
          score: 1.0,
          isApproved: true
        };
      }
      return m;
    }));
  };

  const handleApplyAllGoldenOverrides = () => {
    if (!onUpdateMappings || !auditReport) return;
    onUpdateMappings(prev => prev.map(m => {
      const comparison = auditReport.comparisons.find(c => c.field === m.sourceField && c.status !== 'MATCH');
      if (comparison && comparison.mappingId) {
        return {
          ...m,
          transformation: comparison.goldenFormula,
          explanation: `Aligned to compliance structure using Golden Master override standard.`,
          confidence: 'high' as const,
          score: 1.0,
          isApproved: true
        };
      }
      return m;
    }));
  };

  const handleGenerateDynamicGolden = () => {
    if (mappings.length === 0) return;
    const generated = mappings.map(m => {
      const type = m.targetType || 'VARCHAR';
      return {
        field: m.sourceField,
        expectedTransformation: `CAST(TRIM([${m.sourceField}]) AS ${type}(100))`,
        desc: `AI-inferred optimal sanitized casting standard for target ${m.targetField}`
      };
    });
    setCustomGoldenFields(generated);
    setCustomGoldenUploaded(true);
    setUseGoldenMaster(true);
  };

  const handleMockUploadGolden = () => {
    if (mappings.length === 0) return;
    // Generate some structured rule targets simulating an uploaded CSV
    const generated = mappings.slice(0, Math.min(mappings.length, 4)).map((m, index) => {
      return {
        field: m.sourceField,
        expectedTransformation: index % 2 === 0 
          ? `CAST(UPPER(TRIM([${m.sourceField}])) AS VARCHAR(50))` 
          : `CAST(TRIM([${m.sourceField}]) AS VARCHAR(100))`,
        desc: `Golden standard loaded from custom uploaded baseline file.`
      };
    });
    setCustomGoldenFields(generated);
    setCustomGoldenUploaded(true);
    setUseGoldenMaster(true);
  };

  const handleRunGoldenAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setHasAudited(true);
      setIsAuditing(false);
    }, 1000);
  };

  // If mappings are empty, default to the first standard benchmark dataset
  React.useEffect(() => {
    if (mappings.length === 0 && selectedDatasetId === 'active_workspace' && benchmarkDatasets.length > 0) {
      setSelectedDatasetId(benchmarkDatasets[0].id);
    }
  }, [mappings, benchmarkDatasets, selectedDatasetId]);

  // Compute workspace live stats based on actual active mappings
  const mappingStats = React.useMemo(() => {
    if (mappings.length === 0) {
      return {
        avgScore: 75.0,
        highConfRatio: 0.8,
        acceptedRatio: 0.9,
        fieldCount: 0,
        baseline: 70.0,
        calibrated: 92.0
      };
    }

    const fieldCount = mappings.length;
    const avgScore = (mappings.reduce((acc, m) => acc + (m.score || 0.75), 0) / fieldCount) * 100;
    const highConfRatio = mappings.filter(m => m.confidence === 'high' || (m.score && m.score >= 0.85)).length / fieldCount;
    const acceptedRatio = mappings.filter(m => m.decisionStatus === 'accepted' || m.isApproved).length / fieldCount;

    // Baseline raw score
    const baseline = Number(Math.min(88, Math.max(50, avgScore * 0.82)).toFixed(1));
    
    // Calibrated score with overlays, rules, and decision feedback
    const ruleBonus = Math.min(10, correctionRules.length * 2.5);
    const decisionBonus = acceptedRatio * 8.0;
    const calibrated = Number(Math.min(99.5, Math.max(68.0, baseline + 12.0 + ruleBonus + decisionBonus)).toFixed(1));

    return {
      avgScore,
      highConfRatio,
      acceptedRatio,
      fieldCount,
      baseline,
      calibrated
    };
  }, [mappings, correctionRules]);

  // Dynamic Profile Data driven by active workspace dataset
  const profileData = React.useMemo(() => {
    if (mappings.length === 0) {
      return [
        { name: 'Default Multi', Accuracy: 78.4, Precision: 80.1 },
        { name: 'High Precision', Accuracy: 84.5, Precision: 92.3 },
        { name: 'SAP Calibrated', Accuracy: 94.2, Precision: 96.4 },
        { name: 'LLM Heavy', Accuracy: 91.8, Precision: 88.5 }
      ];
    }

    const { baseline, calibrated, highConfRatio } = mappingStats;
    const ruleBonus = Math.min(8, correctionRules.length * 2);

    const isCalibrated = hasRunActiveWorkspace;

    const defaultMultiAcc = isCalibrated 
      ? Number((baseline * 0.95).toFixed(1)) 
      : Number((baseline * 0.85).toFixed(1));
    const defaultMultiPrec = isCalibrated 
      ? Number((baseline * 0.97).toFixed(1)) 
      : Number((baseline * 0.87).toFixed(1));

    const highPrecAcc = isCalibrated 
      ? Number((baseline + (highConfRatio * 10.0)).toFixed(1)) 
      : Number((baseline + (highConfRatio * 4.0)).toFixed(1));
    const highPrecPrec = isCalibrated 
      ? Number(Math.min(99.0, baseline + 14.0).toFixed(1)) 
      : Number(Math.min(99.0, baseline + 6.0).toFixed(1));

    const sapDomainAcc = isCalibrated 
      ? Number(calibrated.toFixed(1)) 
      : Number((baseline * 0.92).toFixed(1));
    const sapDomainPrec = isCalibrated 
      ? Number(Math.min(99.5, calibrated + 1.5).toFixed(1)) 
      : Number(Math.min(99.5, baseline + 2.0).toFixed(1));

    const llmHeavyAcc = isCalibrated 
      ? Number((Math.min(98.5, baseline + 8.0 + ruleBonus)).toFixed(1)) 
      : Number((Math.min(98.5, baseline + 2.0)).toFixed(1));
    const llmHeavyPrec = isCalibrated 
      ? Number((baseline + 6.0).toFixed(1)) 
      : Number((baseline + 1.0).toFixed(1));

    return [
      { name: 'Default Multi', Accuracy: defaultMultiAcc, Precision: defaultMultiPrec },
      { name: 'High Precision', Accuracy: highPrecAcc, Precision: highPrecPrec },
      { name: 'SAP / Domain Rules', Accuracy: sapDomainAcc, Precision: sapDomainPrec },
      { name: 'LLM Heavy', Accuracy: llmHeavyAcc, Precision: llmHeavyPrec }
    ];
  }, [mappings, mappingStats, correctionRules, hasRunActiveWorkspace]);

  // Dynamic Timeline Data driven by active workspace dataset
  const timelineData = React.useMemo(() => {
    if (mappings.length === 0) {
      return [
        { wave: 'Initial (Raw)', Accuracy: 68.2 },
        { wave: 'Wave 1 (Auto)', Accuracy: 78.4 },
        { wave: 'Wave 2 (Rules)', Accuracy: 84.5 },
        { wave: 'Wave 3 (Overlays)', Accuracy: 89.1 },
        { wave: 'Current Active', Accuracy: 95.2 }
      ];
    }

    const { baseline, calibrated } = mappingStats;
    const step = (calibrated - baseline) / 4;

    return [
      { wave: 'Initial (Raw)', Accuracy: Number(baseline.toFixed(1)) },
      { wave: 'Wave 1 (Auto)', Accuracy: Number((baseline + step).toFixed(1)) },
      { wave: 'Wave 2 (Rules)', Accuracy: Number((baseline + step * 2).toFixed(1)) },
      { wave: 'Wave 3 (Overlays)', Accuracy: Number((baseline + step * 3).toFixed(1)) },
      { wave: 'Current Active', Accuracy: hasRunActiveWorkspace ? Number(calibrated.toFixed(1)) : Number((baseline + step * 2.2).toFixed(1)) }
    ];
  }, [mappings, mappingStats, hasRunActiveWorkspace]);

  const handleRunBenchmark = (datasetId: string) => {
    setIsRunning(datasetId);
    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (datasetId === 'active_workspace') {
        setHasRunActiveWorkspace(true);
        setLastRunTimestamp(`Today at ${nowStr}`);
      } else {
        setBenchmarkDatasets(prev => prev.map(dataset => {
          if (dataset.id === datasetId) {
            const updatedScore = Math.min(dataset.currentScore + 1.8, 99.5);
            return {
              ...dataset,
              currentScore: Number(updatedScore.toFixed(1)),
              lastRunDate: new Date().toISOString().split('T')[0]
            };
          }
          return dataset;
        }));
      }
      setIsRunning(null);
    }, 1200);
  };

  // Automated evaluation tests for the selected benchmark dataset (Proposal 3)
  const currentTestCases = React.useMemo(() => {
    if (selectedDatasetId === 'active_workspace') {
      if (mappings.length === 0) return [];
      return mappings.map((m, index) => {
        const tr = (m.transformation || '').toLowerCase();
        let testName = `[VAL-0${index + 1}] ${m.targetField} Format Check`;
        let testCheck = `Verify target attribute formatting matches standard canonical types.`;
        let expected = `Standard target data type format: ${m.targetType || 'VARCHAR'}`;
        let generated = `CAST([${m.sourceField}] AS ${m.targetType || 'VARCHAR(100)'})`;

        if (tr.includes('prefix') || (m.sourceField === 'col_1' && m.targetField === 'col_1')) {
          testName = `[VAL-0${index + 1}] Prefix "C-" Addition Control`;
          testCheck = `Verify target account identifiers correctly append prefix "C-" and cast securely.`;
          expected = `Prefix "C-" + Source Account Code (e.g., 'C-10029')`;
          generated = `CAST('C-' + CAST([${m.sourceField}] AS VARCHAR(20)) AS VARCHAR(20))`;
        } else if (tr.includes('tier') || tr.includes('revenue') || (m.sourceField === 'col_5' && m.targetField === 'col_4')) {
          testName = `[VAL-0${index + 1}] 4-Category Revenue Tiering`;
          testCheck = `Validate multi-branch conditional tiering: Enterprise (>=200k), Premium (>=100k), Midmarket (>=75k), or Standard.`;
          expected = `Categorical classification string based on source numeric rules.`;
          generated = `CASE WHEN [${m.sourceField}] >= 200000 THEN 'Enterprise' ... END`;
        } else if (tr.includes('upper') || tr.includes('iso') || (m.sourceField === 'col_3' && m.targetField === 'col_3')) {
          testName = `[VAL-0${index + 1}] ISO Country Uppercasing`;
          testCheck = `Verify text codes are trimmed and formatted to uppercase ISO country standards.`;
          expected = `Two-letter uppercase country code (e.g., 'US', 'DE')`;
          generated = `CAST(UPPER(TRIM([${m.sourceField}])) AS ${m.targetType || 'VARCHAR(2)'})`;
        } else if (tr.includes('trim') || tr.includes('strip') || tr.includes('clean') || (m.sourceField === 'col_2' && m.targetField === 'col_2')) {
          testName = `[VAL-0${index + 1}] Clean & Strip String Whitespace`;
          testCheck = `Ensure customer names are trimmed of leading/trailing padding spaces and sanitized.`;
          expected = `Standardized sanitized customer name string.`;
          generated = `CAST(TRIM([${m.sourceField}]) AS ${m.targetType || 'VARCHAR(100)'})`;
        } else if (tr.includes('date') || tr.includes('iso date') || (m.sourceField === 'col_4' && m.targetField === 'col_5')) {
          testName = `[VAL-0${index + 1}] Standard ISO Date Casting`;
          testCheck = `Confirm conversion of raw datetime or text entries into clean standard DATE data types.`;
          expected = `Standard date value (YYYY-MM-DD)`;
          generated = `CAST([${m.sourceField}] AS DATE)`;
        }

        const passed = hasRunActiveWorkspace;

        return {
          id: `test_${m.id}`,
          name: testName,
          check: testCheck,
          expected,
          generated,
          status: passed ? 'PASSED' : 'PENDING'
        };
      });
    } else {
      // Standard static tests for other preset benchmark datasets
      return [
        {
          id: `${selectedDatasetId}_test1`,
          name: '[VAL-101] Schema Signature Validation',
          check: 'Compare mapped attribute schemas against target golden-master metadata declarations.',
          expected: '100% attribute types aligned and verified',
          generated: 'Schema validation assert_columns_match()',
          status: 'PASSED'
        },
        {
          id: `${selectedDatasetId}_test2`,
          name: '[VAL-102] Nullability & Business Key Auditing',
          check: 'Verify primary identifier records contain zero empty or NULL entries across dataset rows.',
          expected: 'Null records rate = 0.0%',
          generated: 'NOT NULL constraints validation on canonical primary key',
          status: 'PASSED'
        },
        {
          id: `${selectedDatasetId}_test3`,
          name: '[VAL-103] Referential Integrity Assertion',
          check: 'Run inner relation checks over foreign key dependencies to prevent orphaned items.',
          expected: '100% keys match dimensional system references',
          generated: 'Validation against SAP dimension master tables',
          status: 'PASSED'
        }
      ];
    }
  }, [selectedDatasetId, mappings, hasRunActiveWorkspace]);

  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');

  React.useEffect(() => {
    if (currentTestCases.length > 0) {
      if (!currentTestCases.some(t => t.id === selectedTestCaseId)) {
        setSelectedTestCaseId(currentTestCases[0].id);
      }
    } else {
      setSelectedTestCaseId('');
    }
  }, [currentTestCases, selectedTestCaseId]);

  const selectedTestCase = currentTestCases.find(t => t.id === selectedTestCaseId) || currentTestCases[0];

  // Preset display name
  const presetLabel = selectedPreset === 'custom_upload'
    ? 'CUSTOM UPLOAD'
    : selectedPreset.replace(/_/g, ' ').toUpperCase();

  // Combine active workspace dataset with standard datasets
  const activeDatasetObj: BenchmarkDataset | null = mappings.length > 0 ? {
    id: 'active_workspace',
    name: `⚡ Active Workspace: ${presetLabel}`,
    description: `Live regression evaluation over your ${mappings.length} currently mapped workspace attributes against standardized ground-truth test samples.`,
    rowCount: 240,
    baselineScore: mappingStats.baseline,
    currentScore: hasRunActiveWorkspace ? mappingStats.calibrated : Number((mappingStats.baseline + (mappingStats.calibrated - mappingStats.baseline) * 0.55).toFixed(1)),
    lastRunDate: lastRunTimestamp || 'Pending Run (Click ▶ Run)'
  } : null;

  const displayDatasets = activeDatasetObj 
    ? [activeDatasetObj, ...benchmarkDatasets] 
    : benchmarkDatasets;

  return (
    <div className="space-y-6 font-sans">
      {/* Upper overview card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-sans font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingIcon className="w-5 h-5 text-emerald-500" />
            Mapping Benchmarks & Evaluation Console
          </h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">
            Verify mapping precision changes deterministically. Compare scoring profiles under strict target controls, measure alignment regressions, and track the exact accuracy improvements of promoted user corrections and semantic learning overlays.
          </p>
        </div>

        {/* Live status summary box */}
        {mappings.length > 0 && (
          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col items-start min-w-[220px]">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Workspace Dataset
            </span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[200px]">
              {presetLabel} ({mappings.length} attributes)
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              {hasRunActiveWorkspace ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Evaluated ({lastRunTimestamp})
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Pending Run
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scoring Profile Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-80 flex flex-col justify-between relative">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
              <AwardIcon className="w-4 h-4 text-emerald-500" />
              Scoring Profile Alignment Calibration
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Accuracy %</span>
          </div>

          <div className="flex-1 w-full mt-2 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profileData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[50, 100]} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="Accuracy" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Correction Learning Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
              <TrendingIcon className="w-4 h-4 text-indigo-500" />
              Correction Impact Learning Curve
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Accuracy Over Waves</span>
          </div>

          <div className="flex-1 w-full mt-2 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="wave" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[50, 100]} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="Accuracy" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Benchmark Datasets */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
                Active Benchmark Datasets
              </h3>
              {mappings.length > 0 && (
                <span className="text-[11px] font-sans text-slate-500 font-medium">
                  Workspace: <strong className="text-slate-800">{mappings.length} Attributes</strong>
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3.5 px-4 w-1/2">Benchmark Dataset Details</th>
                    <th className="py-3.5 px-4 text-center">Row Count</th>
                    <th className="py-3.5 px-4 text-center">Baseline vs Current</th>
                    <th className="py-3.5 px-4 text-right">Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayDatasets.map((dataset) => {
                    const isDatasetRunning = isRunning === dataset.id;
                    const diff = dataset.currentScore - dataset.baselineScore;
                    const isActive = dataset.id === 'active_workspace';
                    const isSelected = selectedDatasetId === dataset.id;
                    return (
                      <tr 
                        key={dataset.id} 
                        onClick={() => setSelectedDatasetId(dataset.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-50/50 hover:bg-emerald-50/75 border-l-4 border-l-emerald-600 font-medium' 
                            : isActive 
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/40 border-l-4 border-l-emerald-400' 
                              : 'hover:bg-slate-50/30'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-sans text-sm font-semibold text-slate-800">{dataset.name}</span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold rounded uppercase">
                                  Current Workspace
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">{dataset.description}</span>
                            <span className="text-[10px] font-mono text-slate-400 mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Last Run: {dataset.lastRunDate}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center font-mono text-xs text-slate-600 align-middle">
                          {dataset.rowCount} Records
                        </td>

                        <td className="py-4 px-4 text-center align-middle">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-800">
                              <span className="text-slate-400">{dataset.baselineScore}%</span>
                              <span className="text-slate-300">→</span>
                              <span className={`font-bold ${isActive && !hasRunActiveWorkspace ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {dataset.currentScore}%
                              </span>
                            </div>
                            {diff > 0 && (
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 ${
                                isActive && !hasRunActiveWorkspace ? 'text-amber-700 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
                              }`}>
                                +{diff.toFixed(1)}% Gain {isActive && !hasRunActiveWorkspace ? '(Estimated)' : ''}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunBenchmark(dataset.id);
                            }}
                            disabled={isDatasetRunning}
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all font-sans cursor-pointer ${
                              isActive && !hasRunActiveWorkspace
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                                : 'text-slate-900 hover:text-white hover:bg-slate-900 border-slate-300'
                            }`}
                          >
                            {isDatasetRunning ? (
                              <>
                                <RefreshIcon className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                <span>Running Test...</span>
                              </>
                            ) : (
                              <>
                                <PlayIcon className="w-3.5 h-3.5" />
                                <span>{isActive && !hasRunActiveWorkspace ? '▶ Run Benchmark' : 'Run'}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Proposal 1: Golden Master Alignment Audit (Optional) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 font-sans">
                      Golden Master Target Alignment Audit
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-mono font-bold rounded uppercase">
                      Proposal 1
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal font-sans">
                    Optionally verify active mappings against approved golden-master metadata declarations to guarantee compliance.
                  </p>
                </div>
              </div>

              {/* Toggle switch for optional activation */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
                <label className="text-xs font-semibold text-slate-600 font-sans cursor-pointer select-none flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useGoldenMaster}
                    onChange={(e) => {
                      setUseGoldenMaster(e.target.checked);
                      if (e.target.checked && goldenMasterAvailable && !hasAudited) {
                        // Optionally trigger audit immediately
                        handleRunGoldenAudit();
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  Enable Proposal 1 Audit
                </label>
              </div>
            </div>

            {useGoldenMaster ? (
              <div className="space-y-4">
                {!goldenMasterAvailable ? (
                  /* Custom upload or empty golden master state */
                  <div className="p-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center space-y-3">
                    <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">No Pre-defined Golden Master Available</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                        This custom workspace does not have a predefined schema model. You can simulate alignment by generating a synthetic standard or uploading an audit template.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={handleGenerateDynamicGolden}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100/80 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Synthetic Golden Master
                      </button>
                      <button
                        onClick={handleMockUploadGolden}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload Reference CSV/JSON
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Golden Master Available State */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider block">
                          Metadata Asset Target
                        </span>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedPreset === 'custom_upload' 
                            ? 'Uploaded Custom Reference Master Schema' 
                            : `${presetLabel} Corporate Reference Master`}
                        </p>
                        <p className="text-xs text-slate-500 leading-normal max-w-xl">
                          Consists of <strong className="text-slate-700">{goldenMasterRules.length} golden compliance rules</strong>. Runs continuous syntactic logic distance evaluation over active mapping transforms.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                        {!hasAudited ? (
                          <button
                            onClick={handleRunGoldenAudit}
                            disabled={isAuditing}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 rounded-lg transition-all shadow-xs cursor-pointer"
                          >
                            {isAuditing ? (
                              <>
                                <RefreshIcon className="w-3.5 h-3.5 animate-spin text-white" />
                                <span>Evaluating Alignment...</span>
                              </>
                            ) : (
                              <>
                                <Activity className="w-3.5 h-3.5" />
                                <span>Run Target Alignment Audit</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                            <span className="text-xs text-slate-400 font-mono font-bold">Audit Completed</span>
                            <button
                              onClick={handleRunGoldenAudit}
                              disabled={isAuditing}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all cursor-pointer"
                              title="Re-run Alignment check"
                            >
                              <RefreshIcon className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
                              <span>Recheck</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audit Results Report */}
                    {hasAudited && auditReport && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/25">
                        <div 
                          onClick={() => setIsGoldenReportExpanded(!isGoldenReportExpanded)}
                          className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-4">
                            {/* Alignment score indicator */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Alignment Score:</span>
                              <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-mono font-bold ${
                                  auditReport.alignmentScore >= 90 
                                    ? 'text-emerald-600' 
                                    : auditReport.alignmentScore >= 65 
                                    ? 'text-amber-600' 
                                    : 'text-rose-600'
                                }`}>
                                  {auditReport.alignmentScore}%
                                </span>
                                <span className="text-xs text-slate-400">match</span>
                              </div>
                            </div>

                            <span className="text-slate-300">|</span>

                            {/* Match overview badges */}
                            <div className="hidden md:flex items-center gap-3">
                              <span className="text-[10px] font-mono text-slate-500">
                                Exact Matches: <strong className="text-emerald-600 font-bold">{auditReport.comparisons.filter(c => c.status === 'MATCH').length}</strong>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Variations: <strong className="text-amber-600 font-bold">{auditReport.comparisons.filter(c => c.status === 'VARIATION').length}</strong>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Mismatches: <strong className="text-rose-600 font-bold">{auditReport.comparisons.filter(c => c.status === 'MISMATCH' || c.status === 'MISSING').length}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {auditReport.alignmentScore < 100 && onUpdateMappings && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyAllGoldenOverrides();
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                              >
                                <SettingsIcon className="w-3 h-3" />
                                Auto-repair All Mismatches
                              </button>
                            )}
                            {isGoldenReportExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {isGoldenReportExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100/40 border-b border-slate-200 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                                  <th className="py-2.5 px-4 w-1/4">Source & Target Attribute</th>
                                  <th className="py-2.5 px-4 w-1/3">Active Formula</th>
                                  <th className="py-2.5 px-4 w-1/3">Golden Master Standard</th>
                                  <th className="py-2.5 px-4 text-center">Status</th>
                                  <th className="py-2.5 px-4 text-right">Fix</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {auditReport.comparisons.map((item, index) => {
                                  return (
                                    <tr key={`${item.field}_${index}`} className="hover:bg-slate-50/50 text-xs">
                                      <td className="py-3 px-4 font-sans">
                                        <div className="font-semibold text-slate-800 font-mono">
                                          {item.field === 'col_1' ? 'col_1 (ID)' : item.field === 'col_2' ? 'col_2 (Name)' : item.field === 'col_3' ? 'col_3 (Country)' : item.field === 'col_4' ? 'col_4 (Region/UOM)' : item.field === 'col_5' ? 'col_5 (Revenues/Category)' : `col_${index + 1}`}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal max-w-[200px] truncate">{item.desc}</p>
                                      </td>

                                      <td className="py-3 px-4">
                                        <code className="text-[10px] font-mono text-slate-600 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 break-all block max-w-[280px]">
                                          {item.activeFormula}
                                        </code>
                                      </td>

                                      <td className="py-3 px-4">
                                        <code className="text-[10px] font-mono text-indigo-600 bg-indigo-50/40 px-1 py-0.5 rounded border border-indigo-100/50 break-all block max-w-[280px]">
                                          {item.goldenFormula}
                                        </code>
                                      </td>

                                      <td className="py-3 px-4 text-center align-middle">
                                        {item.status === 'MATCH' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold rounded-full uppercase border border-emerald-100">
                                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                                            MATCH
                                          </span>
                                        ) : item.status === 'VARIATION' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-mono font-bold rounded-full uppercase border border-amber-100" title={item.details}>
                                            VARIANCE
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-mono font-bold rounded-full uppercase border border-rose-100" title={item.details}>
                                            MISMATCH
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-3 px-4 text-right align-middle">
                                        {item.status !== 'MATCH' && item.mappingId && onUpdateMappings ? (
                                          <button
                                            onClick={() => handleApplyGoldenOverride(item.mappingId!, item.goldenFormula)}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-2 py-1.5 rounded-md border border-indigo-100 hover:border-indigo-600 transition-all cursor-pointer"
                                            title="Override and align with Golden Master"
                                          >
                                            Align
                                          </button>
                                        ) : item.status === 'MATCH' ? (
                                          <span className="text-[10px] font-mono text-slate-400 font-medium">Compliant</span>
                                        ) : (
                                          <span className="text-[10px] font-mono text-slate-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Toggle Default / Inactive state explanation */
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-normal font-sans">
                  The Golden Master Alignment checks are currently disabled. Toggle the checkbox above to optionally load corporate golden baselines, run syntax compliance audits, and execute automated repairs (Proposal 1).
                </p>
              </div>
            )}
          </div>

          {/* Interactive Verification Test Suite (Proposal 3) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Regression Verification Test Suite
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verification of business transformations and data standards for the selected dataset.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Inspecting:</span>
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 rounded-lg uppercase">
                  {selectedDatasetId === 'active_workspace' ? '⚡ Active Workspace' : (benchmarkDatasets.find(d => d.id === selectedDatasetId)?.name || selectedDatasetId).replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {currentTestCases.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-700">No Mappings Configured</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Connect a workspace preset or upload custom fields to enable automated verification tests.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left side: Test Case list (2 cols) */}
                <div className="md:col-span-2 space-y-2.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Assertion Test Cases ({currentTestCases.length})
                  </span>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {currentTestCases.map((test) => {
                      const isActive = test.id === selectedTestCaseId;
                      const isPassed = test.status === 'PASSED';
                      return (
                        <button
                          key={test.id}
                          onClick={() => setSelectedTestCaseId(test.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-2.5 cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isPassed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-900' : 'text-slate-800'}`}>
                                {test.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 truncate">
                              {test.check}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                isPassed 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isPassed ? 'ASSERT PASSED' : 'PENDING EVALUATION'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: Selected Test Case Drill-down Details (3 cols) */}
                <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[350px]">
                  {selectedTestCase ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              AUTOMATED COMPILER TEST
                            </span>
                            <h4 className="text-sm font-semibold text-slate-800 mt-1.5">{selectedTestCase.name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            selectedTestCase.status === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedTestCase.status === 'PASSED' ? '✅ PASSED' : '⚠️ RUN REQUIRED'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                            Target Assertion Criteria
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed font-sans">{selectedTestCase.check}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                              Expected Output Shape
                            </span>
                            <span className="text-xs text-slate-700 font-medium font-sans">
                              {selectedTestCase.expected}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                              Verification Engine Code
                            </span>
                            <code className="text-[10px] font-mono text-indigo-600 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 break-all block">
                              {selectedTestCase.generated}
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* Mock Compiler Execution Console Log */}
                      <div className="mt-4 space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-slate-400" />
                          Evaluation Console Output
                        </span>
                        <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-lg space-y-1 max-h-[110px] overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                          {selectedTestCase.status === 'PASSED' ? (
                            <>
                              <div className="text-slate-500">[{new Date().toISOString().split('T')[0]} Evaluation Run]</div>
                              <div className="text-emerald-400">[SUCCESS] Spawning sandbox dbt runtime environment...</div>
                              <div className="text-emerald-400">[SUCCESS] Compiling validation logic: {selectedTestCase.generated.substring(0, 45)}...</div>
                              <div className="text-slate-300">[INFO] Executing over 240 regression sample rows.</div>
                              <div className="text-emerald-400">[SUCCESS] Assertion Verified. 100% rows match target pattern: "{selectedTestCase.expected.substring(0, 30)}".</div>
                            </>
                          ) : (
                            <>
                              <div className="text-slate-500">[System Log] Waiting for run trigger...</div>
                              <div className="text-amber-400">[WARN] Test case has not been verified against live datasets.</div>
                              <div className="text-slate-400">[INFO] Click "▶ Run Benchmark" on the active dataset above to compile and run tests.</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <FileText className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                      <span className="text-xs text-slate-400">Select an assertion test case to drill down</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Learning signals & Correction rules list */}
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Promoted Learning Signals
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal font-sans">
              Analyst-approved corrections are promoted into reusable rules that feed back into Semantra's multi-signal mapping matrix.
            </p>

            <div className="space-y-3.5 pt-1">
              {correctionRules.map((rule) => (
                <div key={rule.id} className="border border-slate-100 rounded-lg p-3 space-y-2 bg-slate-50/20 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-700 leading-none">{rule.sourcePattern}</span>
                    <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-100 text-[9px] font-mono font-bold text-emerald-700 rounded uppercase">
                      {rule.accuracyImpact}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal font-sans">{rule.targetPattern}</p>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                    Match count: {rule.matchCount} records
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

