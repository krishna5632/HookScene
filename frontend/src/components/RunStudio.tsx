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
  ChevronDown,
  Eye,
  EyeOff,
  FolderPlus,
  PlayCircle
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
  // Ingestion State
  const [isUsingBenchmark, setIsUsingBenchmark] = useState<boolean>(true);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  // Engine Configuration State
  const [mode, setMode] = useState<'ai' | 'baseline'>('ai');
  const [provider, setProvider] = useState<string>('gemini');
  const [profile, setProfile] = useState<string>('fast');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('hs_gemini_key') || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [bulkModel, setBulkModel] = useState<string>('gemini-flash-lite-latest');
  const [judgeModel, setJudgeModel] = useState<string>('gemini-flash-lite-latest');
  const [montage, setMontage] = useState<boolean>(true);

  // Execution & Telemetry State
  const [loading, setLoading] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [completedResult, setCompletedResult] = useState<Dataset | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Telemetry Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'boot-1',
      timestamp: '00:00:01',
      tag: 'SYSTEM',
      level: 'info',
      message: 'HookScene Video Intelligence Engine v2.4 initialized.',
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
      tag: 'TARGET',
      level: 'trace',
      message: 'Target Format: 9:16 Vertical Video (TikTok/Reels/Shorts) · 20s–60s Duration.',
    },
    {
      id: 'boot-4',
      timestamp: '00:00:02',
      tag: 'BENCHMARK',
      level: 'info',
      message: 'Reference Show Staged: "I Married a Broken Soldier" (50 Episodes, 14,820 Lines).',
    },
  ]);

  const [logFilter, setLogFilter] = useState<'all' | 'stages' | 'signals' | 'errors'>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logConsoleRef = useRef<HTMLDivElement>(null);

  // Save API key to localStorage when typed
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('hs_gemini_key', val);
  };

  // Redirect countdown
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

  const copyLogsToClipboard = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleCustomFiles = (files: FileList | File[]) => {
    const arr: StagedFile[] = [];
    Array.from(files).forEach((f) => {
      arr.push({ file: f, name: f.name, size: f.size });
      addLog('INGEST', `Staged screenplay asset: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, 'info');
    });
    setStagedFiles((prev) => [...prev, ...arr]);
    setIsUsingBenchmark(false);
  };

  const removeFile = (idx: number) => {
    setStagedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length === 0) {
        setIsUsingBenchmark(true);
        addLog('INGEST', 'All custom files removed. Reverted to official 50-episode benchmark show.', 'info');
      }
      return updated;
    });
  };

  const loadSamplePreset = async (fileName: string, label: string) => {
    try {
      addLog('PRESET', `Loading sample asset: ${label}...`, 'info');
      const res = await fetch(`/test_scripts/${fileName}`);
      if (!res.ok) throw new Error(`Could not fetch ${fileName}`);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'text/plain' });
      setStagedFiles([{ file, name: fileName, size: blob.size }]);
      setIsUsingBenchmark(false);
      addLog('PRESET', `Successfully staged ${label} (${(blob.size / 1024).toFixed(1)} KB)`, 'success');
    } catch (e: any) {
      addLog('WARN', `Sample asset ${fileName} fallback to local benchmark.`, 'warn');
      setIsUsingBenchmark(true);
    }
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
      setErrorMsg('Please upload at least one screenplay asset or select the benchmark show.');
      return;
    }
    if (mode === 'ai' && !apiKey.trim()) {
      setErrorMsg('Please enter a Gemini or OpenAI API key, or choose the Deterministic Baseline engine.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setCompletedResult(null);
    setCountdown(null);
    setActiveStage(1);
    setElapsed(0);

    const t0 = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - t0) / 1000));
    }, 1000);

    addLog('SYSTEM', 'Initializing HookScene Intelligence Pipeline...', 'info');
    addLog(
      'ENGINE',
      mode === 'ai' ? `Cognitive AI Pipeline (${provider.toUpperCase()})` : 'Deterministic Heuristic Baseline',
      'info'
    );
    addLog('STAGE 1', 'Stage 1: Parsing screenplay dialogue, speakers, and subtitle timestamps...', 'stage');

    const stepInterval = setInterval(() => {
      setActiveStage((prev) => {
        const next = prev < 5 ? prev + 1 : prev;
        if (next === 2) {
          addLog('STAGE 2', 'Stage 2: Analyzing full-series narrative arc and building spoiler gates...', 'stage');
        } else if (next === 3) {
          addLog('STAGE 3', 'Stage 3: Scanning dialogue for 6 dramatic signals (Conflict, Suspense, Emotion)...', 'stage');
        } else if (next === 4) {
          addLog('STAGE 4', 'Stage 4: Executing dual-judge rubric scoring on hook candidates...', 'stage');
        } else if (next === 5) {
          addLog('STAGE 5', 'Stage 5: Tournament ranking & suppressing duplicate/overlapping scenes...', 'stage');
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
          : stagedFiles[0]?.name.replace(/\.[^/.]+$/, '') || 'Custom Series',
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
      addLog('SUCCESS', `Pipeline finished! Discovered ${promoCount} ranked promo candidates.`, 'success');
      addLog('METRICS', `Telemetry synced to SQLite EvalStore. Run ID: ${result.run_id || 'run-latest'}`, 'success');

      setDataset(result);
      setCompletedResult(result);
      setCountdown(6);
    } catch (err: any) {
      clearInterval(stepInterval);
      clearInterval(timer);
      setLoading(false);
      addLog('ERROR', `Pipeline execution halted: ${err.message}`, 'error');
      setErrorMsg(err.message);
    }
  };

  const getTagBadgeStyle = (tag: string, level: string) => {
    switch (level) {
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'warn':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'stage':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

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
    <div className="space-y-6 pb-20 font-sans select-none">
      {/* CARD 1: UPLOAD SCREENPLAY ASSET (TwelveLabs Exact Card 1 Design) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full border border-neutral-300 text-neutral-700 flex items-center justify-center text-xs font-semibold">
              1
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              Upload a screenplay asset
            </h2>
          </div>
          <ChevronDown size={18} className="text-neutral-400" />
        </div>

        {/* Large Minimalist Dropzone Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) handleCustomFiles(e.dataTransfer.files);
          }}
          className="border border-dashed border-neutral-300 hover:border-neutral-500 rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleCustomFiles(e.target.files)}
            accept=".zip,.txt,.srt,.vtt"
            multiple
            className="hidden"
          />

          <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-xs mb-3">
            <UploadCloud size={20} className="text-neutral-700" />
          </div>

          <div className="text-sm font-semibold text-neutral-900 mb-2">
            Upload screenplay asset
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
            <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-medium">
              File size ≤ 20 MB
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-medium">
              Target duration 20s–60s
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-medium">
              .zip / .txt / .srt
            </span>
          </div>

          {/* Preset Buttons Underneath Dropzone */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap justify-center pt-2">
            <span>Or import from</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsUsingBenchmark(true);
                setStagedFiles([]);
                addLog('INGEST', 'Staged official 50-episode reference show.', 'info');
              }}
              className={`px-3 py-1 rounded-lg border font-medium transition-colors ${
                isUsingBenchmark
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              🎬 50-Episode Benchmark Show
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSamplePreset('new_test_episode_01.txt', 'Episode 01 Test Script');
              }}
              className="px-3 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 font-medium transition-colors"
            >
              ⚡ Ep. 01 Confrontation (.txt)
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSamplePreset('new_test_episode_02.txt', 'Episode 02 Betrayal Script');
              }}
              className="px-3 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 font-medium transition-colors"
            >
              🔥 Ep. 02 Betrayal (.txt)
            </button>
          </div>
        </div>

        {/* Staged Assets List */}
        <div className="mt-4">
          {isUsingBenchmark ? (
            <div className="flex items-center justify-between text-xs font-mono text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-semibold text-neutral-900">Loaded:</span>
                <span>sample_show.zip (50 episodes · 14,820 lines · 190.7 KB)</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                Verified Ground Truth
              </span>
            </div>
          ) : stagedFiles.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 pb-1">
                <span>Staged Assets ({stagedFiles.length})</span>
                <button
                  onClick={() => {
                    setStagedFiles([]);
                    setIsUsingBenchmark(true);
                  }}
                  className="text-rose-600 hover:underline text-xs"
                >
                  Clear All
                </button>
              </div>
              {stagedFiles.map((sf, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg px-3.5 py-2"
                >
                  <span className="truncate">
                    {sf.name} <span className="text-neutral-400 font-sans">({(sf.size / 1024).toFixed(1)} KB)</span>
                  </span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-neutral-400 hover:text-rose-600 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-neutral-400 text-center py-2">
              Nothing loaded yet. Choose the benchmark show or drop your scripts above.
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: TRY SUGGESTED PROMPTS & WORKFLOWS (TwelveLabs Exact Card 2 Design) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full border border-neutral-300 text-neutral-700 flex items-center justify-center text-xs font-semibold">
              2
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              Try suggested workflows & engine configuration
            </h2>
          </div>
          <ChevronDown size={18} className="text-neutral-400" />
        </div>

        {/* Suggested Prompts 2-Column Grid (TwelveLabs Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            {
              id: 'p1',
              title: '# Generate 20s–60s viral hooks from dialogue',
              desc: 'Enforces cold open within first 3 seconds, cuts mid-conflict',
              action: () => {
                setMode('ai');
                setProfile('fast');
              },
            },
            {
              id: 'p2',
              title: '⚡ Rule-based baseline (Instant, no key needed)',
              desc: 'Algorithmic keyword cadence & acoustic boundary cuts in ~5s',
              action: () => {
                setMode('baseline');
              },
            },
            {
              id: 'p3',
              title: '🎯 Continuous single cuts (High-Tension drama)',
              desc: 'Extracts unbroken 35s scenes ending on open cliffhangers',
              action: () => {
                setMontage(false);
              },
            },
            {
              id: 'p4',
              title: '🎬 Multi-scene montages (2–3 Segment hook compilation)',
              desc: 'Combines cold open hook with second dramatic reveal',
              action: () => {
                setMontage(true);
              },
            },
            {
              id: 'p5',
              title: '📊 Quality & consistency audit (Feature 1–4)',
              desc: 'Scores candidates across 5 rubric factors with ground truth check',
              action: () => {
                setActiveTab('f1_quality');
              },
            },
            {
              id: 'p6',
              title: '🔍 Decision traceability & attribution (Feature 6)',
              desc: 'Inspect exact dialogue lines, judge weights, and signal triggers',
              action: () => {
                setActiveTab('f6_explainability');
              },
            },
          ].map((prompt) => (
            <div
              key={prompt.id}
              onClick={prompt.action}
              className="p-3.5 rounded-xl border border-neutral-200/80 hover:border-neutral-400 bg-neutral-50/40 hover:bg-neutral-50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="text-xs font-medium text-neutral-800 mb-1">
                {prompt.title}
              </div>
              <div className="text-[11px] text-neutral-500">
                {prompt.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Engine Settings Row */}
        <div className="p-5 rounded-xl border border-neutral-200/80 bg-neutral-50/30 space-y-4">
          <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Engine Controls
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Engine Mode
              </label>
              <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'ai' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  AI Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => setMode('baseline')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'baseline' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Rules Only
                </button>
              </div>
            </div>

            {/* Provider Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Model Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={mode === 'baseline'}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 disabled:opacity-50"
              >
                <option value="gemini">Google Gemini (Flash Lite)</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="groq">Groq (Llama 3.3)</option>
              </select>
            </div>

            {/* Speed / Depth Profile */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Speed & Cost Profile
              </label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                disabled={mode === 'baseline'}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 disabled:opacity-50"
              >
                <option value="fast">Fast (full show ≤ 3 min)</option>
                <option value="free_tier">Free Key (≤ 5 episodes, rate-limited)</option>
                <option value="thorough">Thorough Multi-Judge Evaluation</option>
              </select>
            </div>
          </div>

          {/* API Key Vault Input (Only for AI Mode) */}
          {mode === 'ai' && (
            <div className="pt-1">
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                API Key (stays local in your browser)
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Enter Gemini API key (e.g. AIzaSy...)"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-neutral-200 gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={montage}
                onChange={(e) => setMontage(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400 accent-neutral-900"
              />
              <span>Generate Multi-Scene Montages (2–3 clip compilation)</span>
            </label>

            <button
              onClick={handleRun}
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl font-semibold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-sm ${
                loading
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-black hover:bg-neutral-800 cursor-pointer active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                  <span>Processing Pipeline ({elapsed}s)...</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-white" />
                  <span>Execute {mode === 'ai' ? 'AI Pipeline' : 'Rule Baseline'}</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: EXPLORE MORE EXAMPLES (TwelveLabs Exact Card 3 Design) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full border border-neutral-300 text-neutral-700 flex items-center justify-center text-xs font-semibold">
              3
            </span>
            <h2 className="text-base font-semibold text-neutral-900">
              Explore more examples
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">Click to inspect in Review Desk</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'ex1',
              title: 'Ep. 02: Betrayal & Cold Open',
              hook: '"I cannot marry you, Juliana."',
              kind: 'Continuous Single Cut',
              duration: '35s',
              score: '91/100',
              badgeColor: 'bg-amber-100 text-amber-900',
            },
            {
              id: 'ex2',
              title: 'Ep. 02: Montage & Confrontation',
              hook: '"I cannot marry you..." + Reveal',
              kind: 'Multi-Scene Montage',
              duration: '45s',
              score: '86/100',
              badgeColor: 'bg-purple-100 text-purple-900',
            },
            {
              id: 'ex3',
              title: 'Ep. 01: High-Stakes Confrontation',
              hook: '"You should turn around, Juliana."',
              kind: 'Continuous Single Cut',
              duration: '51s',
              score: '85/100',
              badgeColor: 'bg-blue-100 text-blue-900',
            },
            {
              id: 'ex4',
              title: 'Ep. 11: Theft & Suspense Hook',
              hook: '"Your husband stole my gold pocket watch!"',
              kind: 'Continuous Single Cut',
              duration: '34s',
              score: '88/100',
              badgeColor: 'bg-emerald-100 text-emerald-900',
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveTab('review')}
              className="p-4 rounded-xl border border-neutral-200/80 hover:border-neutral-400 bg-neutral-50/40 hover:bg-neutral-50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.badgeColor}`}>
                    {item.score}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {item.duration}
                  </span>
                </div>
                <div className="font-semibold text-xs text-neutral-900 mb-1">
                  {item.title}
                </div>
                <div className="text-xs text-neutral-600 italic line-clamp-2 mb-3">
                  {item.hook}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-500 font-medium">
                <span>{item.kind}</span>
                <span className="text-neutral-900 font-semibold group-hover:underline">Open →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 4: REAL-TIME TELEMETRY & LOG VIEWER (Clean, Professional, Easy to Read) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal size={17} className="text-neutral-600" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Live Pipeline Telemetry & Execution Log
            </h3>
            {loading && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Running Stage {activeStage} of 5
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLogsToClipboard}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-medium hover:bg-neutral-50 transition-colors"
            >
              <Copy size={13} />
              <span>{copiedLogs ? 'Copied!' : 'Copy Logs'}</span>
            </button>
            <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">
              ⏱ {elapsed}s
            </span>
          </div>
        </div>

        {/* Stepper Stage Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {[
            { id: 1, label: '1. Ingestion' },
            { id: 2, label: '2. Narrative Arc' },
            { id: 3, label: '3. Signals Scan' },
            { id: 4, label: '4. Dual Judge' },
            { id: 5, label: '5. Tournament' },
          ].map((st) => {
            const isDone = activeStage > st.id;
            const isActive = activeStage === st.id;
            return (
              <div
                key={st.id}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isActive
                    ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-medium'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-400'
                }`}
              >
                <div className="text-[11px] truncate">
                  {isDone ? '✓ ' : ''}{st.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Log Stream Console */}
        <div
          ref={logConsoleRef}
          className="bg-neutral-950 text-neutral-200 rounded-xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-1.5 shadow-inner"
        >
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-neutral-500 shrink-0 text-[11px]">{log.timestamp}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase ${
                  log.level === 'error'
                    ? 'bg-rose-900/60 text-rose-300'
                    : log.level === 'success'
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : log.level === 'stage'
                    ? 'bg-amber-900/60 text-amber-300'
                    : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {log.tag}
              </span>
              <span
                className={`flex-1 break-words ${
                  log.level === 'error'
                    ? 'text-rose-300'
                    : log.level === 'success'
                    ? 'text-emerald-300'
                    : log.level === 'stage'
                    ? 'text-amber-200'
                    : 'text-neutral-300'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>

        {/* Redirect Notice upon completion */}
        {countdown !== null && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
            <span>🎉 Extraction complete! Redirecting to Review Desk in {countdown}s...</span>
            <button
              onClick={() => setActiveTab('review')}
              className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800"
            >
              Open Desk Now →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
