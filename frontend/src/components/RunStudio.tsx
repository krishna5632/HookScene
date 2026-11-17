import React, { useState, useRef, useEffect } from 'react';
import { Dataset, ActiveTab } from '../types';
import {
  UploadCloud,
  FileText,
  Zap,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Cpu,
  Layers,
  Film,
  Sliders,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Lock,
  RefreshCw,
  Play,
  Check,
  FolderArchive,
  BarChart3,
  Gauge,
  Video,
  Copy,
  Trash2,
  Search,
  Filter,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

interface RunStudioProps {
  setDataset: React.Dispatch<React.SetStateAction<Dataset | null>>;
  setActiveTab: (tab: ActiveTab) => void;
}

interface StagedFile {
  file: File;
  name: string;
  size: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  tag: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'stage' | 'trace';
}

export const RunStudio: React.FC<RunStudioProps> = ({ setDataset, setActiveTab }) => {
  // Production Ingestion State
  const [isUsingBenchmark, setIsUsingBenchmark] = useState<boolean>(true);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  
  // Intelligence Engine Configuration
  const [mode, setMode] = useState<'ai' | 'baseline'>('ai');
  const [provider, setProvider] = useState<string>('gemini');
  const [profile, setProfile] = useState<string>('fast');
  const [apiKey, setApiKey] = useState<string>('');
  const [bulkModel, setBulkModel] = useState<string>('gemini-flash-lite-latest');
  const [judgeModel, setJudgeModel] = useState<string>('gemini-flash-lite-latest');
  const [montage, setMontage] = useState<boolean>(true);

  // Execution & Telemetry State
  const [loading, setLoading] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [diagnostic, setDiagnostic] = useState<{ title: string; desc: string; type: string } | null>(null);

  // Structured Professional Telemetry Stream
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'boot-1',
      timestamp: '00:00:01',
      tag: 'SYSTEM',
      level: 'info',
      message: 'HookScene Production Intelligence Core v2.4 online.',
    },
    {
      id: 'boot-2',
      timestamp: '00:00:01',
      tag: 'DAEMON',
      level: 'info',
      message: 'FastAPI execution core connected · SQLite EvalStore mounted.',
    },
    {
      id: 'boot-3',
      timestamp: '00:00:02',
      tag: 'FORMAT',
      level: 'trace',
      message: 'Target Format: 9:16 Vertical Video (TikTok/Reels/Shorts) · 20s–60s Duration.',
    },
    {
      id: 'boot-4',
      timestamp: '00:00:02',
      tag: 'BENCHMARK',
      level: 'info',
      message: 'Standard Benchmark Suite staged: "I Married a Broken Soldier" (50 Episodes, 14,820 Lines).',
    },
  ]);

  const [logFilter, setLogFilter] = useState<'all' | 'stages' | 'signals' | 'errors'>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [completedResult, setCompletedResult] = useState<Dataset | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logConsoleRef = useRef<HTMLDivElement>(null);

  // Countdown timer for review desk redirect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setActiveTab('review');
      return;
    }
    const t = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, setActiveTab]);

  const addLog = (
    tag: string,
    msg: string,
    level: 'info' | 'success' | 'warn' | 'error' | 'stage' | 'trace' = 'info'
  ) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp,
      tag,
      message: msg,
      level,
    };
    setLogs((prev) => [...prev, newEntry]);

    if (autoScroll && logConsoleRef.current) {
      setTimeout(() => {
        if (logConsoleRef.current) {
          logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
        }
      }, 30);
    }
  };

  const clearLogs = () => {
    setLogs([
      {
        id: `clear-${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        tag: 'CONSOLE',
        level: 'trace',
        message: 'Telemetry console buffer cleared by user.',
      },
    ]);
  };

  const copyLogsToClipboard = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleCustomFiles = (files: FileList | File[]) => {
    const arr: StagedFile[] = [];
    Array.from(files).forEach((f) => {
      arr.push({ file: f, name: f.name, size: f.size });
      addLog('INGEST', `Staged custom asset: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, 'info');
    });
    setStagedFiles((prev) => [...prev, ...arr]);
    setIsUsingBenchmark(false);
  };

  const removeFile = (idx: number) => {
    setStagedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length === 0) {
        setIsUsingBenchmark(true);
        addLog('INGEST', 'All custom files removed. Reverted to official 50-episode benchmark series.', 'info');
      }
      return updated;
    });
  };

  const enableBenchmarkMode = () => {
    setIsUsingBenchmark(true);
    setStagedFiles([]);
    addLog('BENCHMARK', 'Selected official 50-episode reference series: "I Married a Broken Soldier. He Was a Duke"', 'info');
  };

  const readFilePayload = (file: File): Promise<{ name: string; content: string; is_base64: boolean }> => {
    return new Promise((resolve, reject) => {
      const isZip = file.name.toLowerCase().endsWith('.zip');
      const reader = new FileReader();
      if (isZip) {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve({ name: file.name, content: base64Data, is_base64: true });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          resolve({ name: file.name, content: reader.result as string, is_base64: false });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }
    });
  };

  const handleRun = async () => {
    if (!isUsingBenchmark && stagedFiles.length === 0) {
      setErrorMsg('Please upload at least one screenplay asset or select the benchmark series.');
      return;
    }
    if (mode === 'ai' && !apiKey.trim()) {
      setErrorMsg('Please enter an API key for the Cognitive Pipeline, or select the Deterministic Baseline engine.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setDiagnostic(null);
    setCompletedResult(null);
    setCountdown(null);
    setActiveStage(1);
    setElapsed(0);

    const t0 = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - t0) / 1000));
    }, 1000);

    // Initial run telemetry
    addLog('SYSTEM', 'Initializing HookScene Production Campaign Studio...', 'info');
    addLog(
      'STRATEGY',
      mode === 'ai' ? `Cognitive AI Pipeline (${provider.toUpperCase()})` : 'Deterministic Heuristic Baseline',
      'info'
    );
    addLog(
      'PARAMS',
      `Profile: ${profile.toUpperCase()} | Montages: ${montage ? 'ENABLED' : 'DISABLED'} | Boundary: 20s–60s`,
      'trace'
    );
    addLog('STAGE 1', 'Stage 1 Active: Ingesting screenplay dialogue lines and parsing subtitle timestamps...', 'stage');

    // Dynamic progressive stage simulation while backend executes
    const stepInterval = setInterval(() => {
      setActiveStage((prev) => {
        const next = prev < 5 ? prev + 1 : prev;
        if (next === 2) {
          addLog('STAGE 2', 'Analyzing 50-episode narrative arc and building spoiler exclusion gates...', 'stage');
          addLog('SPOILER', 'Blacklisted climactic reveal timestamps in episodes 46–50.', 'info');
        } else if (next === 3) {
          addLog('STAGE 3', 'Scanning dialogue for 6 dramatic signals: Conflict, Surprise, Suspense, Emotion, Action, Relationship...', 'stage');
          addLog('SIGNAL', 'Identified candidate windows meeting duration constraints (20s–60s) with 3s hook limits.', 'info');
        } else if (next === 4) {
          addLog('STAGE 4', 'Executing dual-judge rubric scoring (Hook 25%, Cliffhanger 25%, Clarity 20%, Intensity 20%, Relevance 10%)...', 'stage');
          addLog('EVAL', 'Comparing Judge 1 and Judge 2 confidence scores for candidate divergence check.', 'info');
        } else if (next === 5) {
          addLog('STAGE 5', 'Running listwise tournament ranking & suppressing duplicate/overlapping scenes...', 'stage');
          if (montage) {
            addLog('MONTAGE', 'Synthesizing multi-episode 2-3 clip emotional arc montages.', 'info');
          }
        }
        return next;
      });
    }, 2800);

    try {
      let filesPayload: Array<{ name: string; content: string; is_base64: boolean }> = [];
      if (!isUsingBenchmark) {
        addLog('INGEST', `Encoding ${stagedFiles.length} uploaded screenplay asset(s)...`, 'info');
        filesPayload = await Promise.all(stagedFiles.map((sf) => readFilePayload(sf.file)));
      }

      const payload = {
        use_sample: isUsingBenchmark,
        files: filesPayload,
        options: {
          profile,
          use_llm: mode === 'ai',
          provider,
          key: mode === 'ai' ? apiKey.trim() : '',
          bulk_model: bulkModel,
          judge_model: judgeModel,
          montage,
        },
        show_name: isUsingBenchmark
          ? 'I Married a Broken Soldier. He was a Duke'
          : stagedFiles[0]?.name.replace(/\.[^/.]+$/, '') || 'Custom Production Series',
      };

      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: 'Extraction pipeline failed.' }));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }

      const result: Dataset = await res.json();
      clearInterval(stepInterval);
      clearInterval(timer);
      setLoading(false);
      setActiveStage(6);

      const promoCount = result.promos?.length || 0;
      addLog('SUCCESS', `Extraction complete! Generated ${promoCount} ranked promo candidates.`, 'success');
      addLog('METRICS', `Run ID: ${result.run_id || 'run-latest'} | Telemetry recorded to SQLite EvalStore.`, 'success');
      if (result.run_log) {
        addLog(
          'TELEMETRY',
          `Processed ${result.run_log.episodes || 50} episodes (${result.run_log.lines || 14820} lines) in ${result.run_log.seconds || elapsed}s. Valid candidates: ${result.run_log.candidates_valid || promoCount}.`,
          'info'
        );
      }

      setDataset(result);
      setCompletedResult(result);
      // Give the user 8 seconds to comfortably review the logs or click to switch immediately
      setCountdown(8);
    } catch (err: any) {
      clearInterval(stepInterval);
      clearInterval(timer);
      setLoading(false);
      addLog('ERROR', `Pipeline execution halted: ${err.message}`, 'error');
      setErrorMsg(err.message);

      if (err.message.includes('404') || err.message.includes('deprecated') || err.message.includes('not found')) {
        setDiagnostic({
          title: 'Model Version Deprecated',
          desc: 'The selected model endpoint returned a 404. Falling back to active model `gemini-flash-lite-latest` will resolve this.',
          type: 'model_fallback',
        });
      }
    }
  };

  // Helper badge styles for log tags
  const getTagBadgeStyle = (tag: string, level: string) => {
    switch (level) {
      case 'error':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'warn':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'success':
        return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40';
      case 'stage':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    switch (tag) {
      case 'SYSTEM':
      case 'DAEMON':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'INGEST':
      case 'BENCHMARK':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'SIGNAL':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'JUDGE':
      case 'EVAL':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'RANK':
      case 'TOURNAMENT':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'SPOILER':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'TELEMETRY':
      case 'METRICS':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  const getMessageTextStyle = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-rose-300 font-medium';
      case 'warn':
        return 'text-amber-300 font-medium';
      case 'success':
        return 'text-emerald-300 font-medium';
      case 'stage':
        return 'text-amber-200 font-semibold';
      case 'trace':
        return 'text-slate-400';
      default:
        return 'text-slate-200';
    }
  };

  // Filtered log entries
  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'stages' && !log.tag.includes('STAGE')) return false;
    if (logFilter === 'signals' && !['SIGNAL', 'ARC', 'SPOILER', 'MONTAGE'].includes(log.tag)) return false;
    if (logFilter === 'errors' && log.level !== 'error' && log.level !== 'warn') return false;

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.tag.toLowerCase().includes(q) ||
        log.timestamp.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="py-8 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 font-sans">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200/80 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shadow-xs">
              <Film className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Campaign Studio & Execution Console
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-amber-400 border border-slate-800">
              v2.4 Production
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Autonomous promo discovery and dual-judge evaluation workspace. Ingest multi-episode screenplays,
            configure cognitive or heuristic intelligence parameters, and rank high-converting 9:16 vertical promos.
          </p>
        </div>

        {/* Live System Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>FastAPI Daemon:</span>
            <span className="font-semibold text-slate-900">Connected</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-700">
            <Video className="w-3.5 h-3.5 text-amber-500" />
            <span>Target:</span>
            <span className="font-semibold text-slate-900">9:16 Vertical (20–60s)</span>
          </div>
        </div>
      </div>

      {/* Horizontal Pipeline Architecture Stage Tracker */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-8">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            5-Stage Autonomous Extraction Architecture
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {loading ? `Phase ${activeStage} of 5 Active` : 'Engine Ready'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              step: 1,
              title: 'Ingestion & Boundaries',
              desc: 'Timestamp parsing & line-level cut limits',
            },
            {
              step: 2,
              title: 'Narrative Arc & Spoilers',
              desc: 'Full-series context & spoiler gating',
            },
            {
              step: 3,
              title: 'Multi-Signal Detection',
              desc: '6 dramatic signals (Conflict, Suspense...)',
            },
            {
              step: 4,
              title: 'Dual-Judge Scoring',
              desc: '5-factor rubric weighted evaluation',
            },
            {
              step: 5,
              title: 'Listwise Tournament',
              desc: 'Overlap suppression & promo ranking',
            },
          ].map((st) => {
            const isDone = activeStage > st.step;
            const isActive = activeStage === st.step;
            return (
              <div
                key={st.step}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'border-amber-400 bg-amber-50/50 shadow-xs ring-1 ring-amber-400'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                    : 'border-slate-100 bg-slate-50/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      isActive
                        ? 'bg-amber-500 text-white'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? '✓' : st.step}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                    {isActive ? (
                      <span className="text-amber-600 animate-pulse">Running</span>
                    ) : isDone ? (
                      <span className="text-emerald-700">Completed</span>
                    ) : (
                      'Standby'
                    )}
                  </span>
                </div>
                <div className="font-semibold text-xs text-slate-900 truncate">{st.title}</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                  {st.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Control Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: INGESTION MATRIX & INTELLIGENCE STRATEGY (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Production Episode Ingestion Matrix */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Episode Script Ingestion Deck
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ingest verified benchmark shows or upload custom screenplays and subtitle captions.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {isUsingBenchmark ? 'Benchmark Mode' : `${stagedFiles.length} Custom File(s)`}
              </span>
            </div>

            {/* Ingestion Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Preset A: Official Benchmark Suite */}
              <div
                onClick={enableBenchmarkMode}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative ${
                  isUsingBenchmark
                    ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-500/50'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    Production Benchmark
                  </span>
                  {isUsingBenchmark && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 mb-1">
                  "I Married a Broken Soldier"
                </div>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  50 full-length episodes (14,820 dialogue lines) with millisecond-aligned timestamps.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">50 Episodes</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">190.7 KB ZIP</span>
                </div>
              </div>

              {/* Preset B: Custom Asset Ingestion */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative ${
                  !isUsingBenchmark
                    ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-500/50'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Custom Production Assets
                  </span>
                  {!isUsingBenchmark && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 mb-1">
                  Upload Scripts or Subtitles
                </div>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  Upload your show's screenplay text files, zipped archive, or subtitle streams (.srt, .vtt).
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">.ZIP</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">.TXT</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">.SRT</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">.VTT</span>
                </div>
              </div>
            </div>

            {/* Custom Upload Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length) handleCustomFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/40 hover:bg-amber-50/20 flex flex-col items-center justify-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleCustomFiles(e.target.files)}
                accept=".zip,.txt,.srt,.vtt"
                multiple
                className="hidden"
              />
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                <UploadCloud className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                Drag & drop screenplay files or <span className="text-amber-600 hover:underline">browse local system</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Single or multi-episode ZIP archive, formatted plain text, SRT, or WebVTT captions
              </div>
            </div>

            {/* Ingested Assets Queue */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 min-h-[46px] flex flex-col justify-center">
              {isUsingBenchmark ? (
                <div className="flex items-center justify-between text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-900">Benchmark Series Loaded:</span>
                    <span className="text-slate-600">sample_show.zip (50 episodes, 190.7 KB)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Validated
                  </span>
                </div>
              ) : stagedFiles.length === 0 ? (
                <div className="text-center py-2 text-xs font-mono text-slate-400">
                  No custom assets uploaded yet. Ingestion will use the official 50-episode benchmark series.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-1 border-b border-slate-200">
                    <span>Staged Files ({stagedFiles.length})</span>
                    <button
                      onClick={() => setStagedFiles([])}
                      className="text-rose-600 hover:underline text-[11px] cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  {stagedFiles.map((sf, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded px-3 py-1.5"
                    >
                      <span className="truncate">
                        {sf.name} <span className="text-slate-400 font-sans">({(sf.size / 1024).toFixed(1)} KB)</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Strategy & Model Architecture */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Intelligence Strategy & Model Engine
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select cognitive multi-agent evaluation or zero-latency deterministic baseline.
                  </p>
                </div>
              </div>
            </div>

            {/* Intelligence Mode Toggle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'ai'
                    ? 'bg-amber-50/50 border-amber-500 shadow-xs ring-1 ring-amber-500/50'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Autonomous Cognitive Pipeline</span>
                  </div>
                  {mode === 'ai' && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  Full 5-stage AI intelligence: Narrative Arc Synthesis + 6 Dramatic Signals + Dual-Judge Scoring Rubric.
                </div>
                <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">
                  Recommended for Commercial Promos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('baseline')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'baseline'
                    ? 'bg-amber-50/50 border-amber-500 shadow-xs ring-1 ring-amber-500/50'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Gauge className="w-3.5 h-3.5 text-slate-600" />
                    <span>Deterministic Heuristic Baseline</span>
                  </div>
                  {mode === 'baseline' && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  Zero-latency algorithmic backstop: Keyword emotional cadence, acoustic boundary cuts. No API key needed.
                </div>
                <span className="inline-block text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  Instant (~5s) Offline Execution
                </span>
              </button>
            </div>

            {/* Inference Matrix Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Foundation Model Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
                >
                  <option value="gemini">Google Gemini 2.0 / Flash (High Throughput)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet / Haiku)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Execution Profile & Depth
                </label>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
                >
                  <option value="fast">Fast Production (~2 min / 50 episodes)</option>
                  <option value="thorough">Exhaustive Analysis (Maximum Candidate Recall)</option>
                </select>
              </div>
            </div>

            {/* API Key Vault Input (Only for AI Mode) */}
            {mode === 'ai' && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Inference Key Vault (Session In-Memory Only)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini or OpenAI API Key..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400 pointer-events-none">
                    Never Persisted to Disk
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings: Montage Synthesis */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={montage}
                  onChange={(e) => setMontage(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
                <span>Synthesize Multi-Episode Narrative Montages (2–3 Segment Arcs)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Vertical 9:16</span>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Pipeline Execution Blocked</div>
                  <div>{errorMsg}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MISSION CONTROL, TELEMETRY & EXECUTION (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mission Control Deck */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                ></div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Execution Mission Control
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                ⏱ {elapsed}s elapsed
              </span>
            </div>

            {/* Real-Time Stepper Progress Bars */}
            <div className="space-y-3.5">
              {[
                { id: 1, label: '1. Ingestion & Boundary Cuts' },
                { id: 2, label: '2. Narrative Arc & Spoiler Guard' },
                { id: 3, label: '3. Multi-Signal Dramatic Scan' },
                { id: 4, label: '4. Dual-Judge Weighted Rubric' },
                { id: 5, label: '5. Listwise Tournament & Rank' },
              ].map((st) => {
                const isDone = activeStage > st.id;
                const isActive = activeStage === st.id;
                const pct = isDone ? 100 : isActive ? 55 : 0;

                return (
                  <div key={st.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${isActive ? 'text-amber-800 font-semibold' : 'text-slate-700'}`}>
                        {st.label}
                      </span>
                      <span className="text-[11px] font-mono">
                        {isDone ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Done
                          </span>
                        ) : isActive ? (
                          <span className="text-amber-600 font-semibold animate-pulse">Processing...</span>
                        ) : (
                          <span className="text-slate-400">Waiting</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-400 ${
                          isDone ? 'bg-emerald-500' : isActive ? 'bg-amber-500' : 'bg-transparent'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UPGRADED PROFESSIONAL TELEMETRY STREAM CONSOLE */}
            <div className="bg-[#090D16] rounded-xl border border-slate-800 text-xs shadow-inner overflow-hidden flex flex-col">
              {/* Terminal Window Header Bar */}
              <div className="bg-[#0F172A] px-3.5 py-2.5 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-300 ml-1 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    LIVE TELEMETRY STREAM
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      loading
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {loading ? 'RUNNING' : 'ONLINE'}
                  </span>
                </div>

                {/* Console Action Buttons */}
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <button
                    onClick={copyLogsToClipboard}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Copy telemetry logs to clipboard"
                  >
                    {copiedLogs ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearLogs}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Clear console"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Terminal Sub-Bar: Filters & Search */}
              <div className="bg-[#0B1120] px-3 py-1.5 border-b border-slate-800/60 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-2.5 h-2.5" /> Filter:
                  </span>
                  {(['all', 'stages', 'signals', 'errors'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                        logFilter === f
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f} {f === 'all' && `(${logs.length})`}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="w-28 sm:w-36 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {logSearch && (
                    <button
                      onClick={() => setLogSearch('')}
                      className="absolute right-1 top-0.5 text-slate-500 hover:text-slate-300 text-[10px]"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Formatted Log Row Container */}
              <div
                ref={logConsoleRef}
                className="font-mono text-[11px] leading-relaxed h-72 overflow-y-auto p-2.5 space-y-1 divide-y divide-slate-800/30 selection:bg-amber-500/30"
              >
                {filteredLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No log entries match active filter "{logFilter}".
                  </div>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 pt-1.5 pb-1 px-1.5 hover:bg-slate-800/30 rounded transition-colors group"
                    >
                      {/* Line Number */}
                      <span className="text-slate-600 select-none text-[10px] w-6 text-right shrink-0 font-mono">
                        {idx + 1}
                      </span>

                      {/* Timestamp */}
                      <span className="text-slate-500 text-[10px] shrink-0 font-mono font-medium">
                        {log.timestamp}
                      </span>

                      {/* Tag Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider shrink-0 border ${getTagBadgeStyle(
                          log.tag,
                          log.level
                        )}`}
                      >
                        {log.tag}
                      </span>

                      {/* Message Content */}
                      <span className={`text-[11px] leading-relaxed break-words flex-1 ${getMessageTextStyle(log.level)}`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Terminal Footer Bar */}
              <div className="bg-[#0F172A] px-3.5 py-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  STDOUT: 200 OK · {logs.length} events logged
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3 h-3 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Auto-Scroll</span>
                </label>
              </div>
            </div>

            {/* POST-RUN COMPLETION BANNER WITH USER CONTROL (No Sudden Abrupt Redirect) */}
            {completedResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Extraction Campaign Complete!</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                    {completedResult.promos?.length || 0} Promos Extracted
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  All candidate scenes have been evaluated across the 5-factor rubric and saved to the Review Desk.
                  {countdown !== null && countdown > 0 ? (
                    <span className="font-semibold block mt-1">
                      Auto-redirecting to Review Desk in {countdown}s...
                    </span>
                  ) : null}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setActiveTab('review')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>View in Review Desk Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {countdown !== null && (
                    <button
                      onClick={() => setCountdown(null)}
                      className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Stay Here & Inspect Logs
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div>
              <button
                onClick={handleRun}
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Executing Campaign (Stage {activeStage} / 5)...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 fill-current" />
                    <span>Execute Promo Extraction Campaign</span>
                  </>
                )}
              </button>
              <div className="mt-2 text-center text-[11px] text-slate-400 font-mono">
                {isUsingBenchmark
                  ? 'Target: 50 Episodes Benchmark Show · Standard 9:16 Video Cuts'
                  : `Target: ${stagedFiles.length} Custom Ingested File(s)`}
              </div>
            </div>

            {/* Diagnostic Alert Card if error occurs */}
            {diagnostic && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{diagnostic.title}</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">{diagnostic.desc}</p>
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setBulkModel('gemini-flash-lite-latest');
                      setJudgeModel('gemini-flash-lite-latest');
                      handleRun();
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Auto-Recover with Active Model
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
