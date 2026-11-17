import React, { useState, useMemo, useEffect } from 'react';
import { Promo, Dataset, ActiveTab } from '../types';
import { CandidateExplanationPanel } from './CandidateExplanationPanel';
import {
  Search,
  Filter,
  ChevronDown,
  TrendingUp,
  Clock,
  FileText,
  Check,
  X,
  Play,
  Pause,
  Volume2,
  Maximize2,
  Lightbulb,
  Sparkles,
  HelpCircle,
  Target,
  Star,
  Film,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ReviewDeskProps {
  dataset: Dataset | null;
  decisions: Record<string, string>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setActiveTab: (tab: ActiveTab) => void;
}

const SIGNALS = [
  { id: 'all', label: 'All Categories' },
  { id: 'romance', label: 'Romance', icon: '💖', bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' },
  { id: 'action', label: 'Action', icon: '🔥', bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
  { id: 'conflict', label: 'Conflict', icon: '🔷', bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]' },
  { id: 'drama', label: 'Drama', icon: '🎭', bg: 'bg-[#F3E8FF]', text: 'text-[#7E22CE]' },
  { id: 'suspense', label: 'Suspense', icon: '➕', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]' },
  { id: 'mystery', label: 'Mystery', icon: '🔷', bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]' },
  { id: 'cliffhanger', label: 'Cliffhanger', icon: '🎭', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]' },
  { id: 'emotion', label: 'Emotion', icon: '💔', bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' },
];

export const ReviewDesk: React.FC<ReviewDeskProps> = ({
  dataset,
  decisions,
  setDecisions,
  setActiveTab,
}) => {
  const [selectedPid, setSelectedPid] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedSignal, setSelectedSignal] = useState<string>('all');
  const [selectedEpisode, setSelectedEpisode] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('score');

  // Video playback simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  // Rejection modal & feedback state (Feature 2)
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectionCategory, setRejectionCategory] = useState<string>('weak_hook');
  const [rejectionComment, setRejectionComment] = useState<string>('');

  // Explainability & screenplay line highlighting (Feature 6)
  const [highlightedLine, setHighlightedLine] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<'review' | 'trace'>('review');

  const handleNavigateToLine = (lineId: string) => {
    setHighlightedLine(lineId);
    setTimeout(() => {
      const el = document.getElementById(`screenplay-line-${lineId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const allPromos = useMemo(() => {
    return [...(dataset?.promos || []), ...(dataset?.montages || [])];
  }, [dataset]);

  // Set default selected promo
  useEffect(() => {
    if (!selectedPid && allPromos.length > 0) {
      setSelectedPid(allPromos[0].pid);
    }
  }, [allPromos, selectedPid]);

  const episodesList = useMemo(() => {
    const s = new Set<number>();
    allPromos.forEach((p) => p.segments.forEach((seg) => s.add(seg.episode)));
    return Array.from(s).sort((a, b) => a - b);
  }, [allPromos]);

  const getHookText = (p: Promo) => {
    if (typeof p.hook === 'string' && p.hook.trim()) return p.hook;
    if (p.hook && typeof p.hook === 'object' && p.hook.text) return p.hook.text;
    if (p.excerpt && p.excerpt[0]) return p.excerpt[0];
    return `Episode ${p.segments[0]?.episode} Promo Moment`;
  };

  const getCliffText = (p: Promo) => {
    if (typeof p.cliffhanger === 'string' && p.cliffhanger.trim()) return p.cliffhanger;
    if (p.cliffhanger && typeof p.cliffhanger === 'object' && p.cliffhanger.text) return p.cliffhanger.text;
    if (p.excerpt && p.excerpt.length > 0) return p.excerpt[p.excerpt.length - 1];
    return '';
  };

  const filteredPromos = useMemo(() => {
    let list = [...allPromos];

    if (filter === 'single') list = list.filter((p) => p.kind !== 'montage');
    else if (filter === 'montage') list = list.filter((p) => p.kind === 'montage');
    else if (filter === 'attention') list = list.filter((p) => (p.attention?.hook_attention || 0) >= 0.7);
    else if (filter === 'flagged') list = list.filter((p) => p.flags && Object.values(p.flags).some(Boolean));
    else if (filter === 'disputed') list = list.filter((p) => p.flags?.judge_disagreement || p.judge_divergence?.is_divergent);
    else if (filter === 'approved') list = list.filter((p) => decisions[p.pid] === 'accept');
    else if (filter === 'rejected') list = list.filter((p) => decisions[p.pid] === 'reject');

    if (selectedSignal !== 'all') {
      list = list.filter((p) => (p.primary_signal || 'conflict').toLowerCase() === selectedSignal);
    }

    if (selectedEpisode !== 'all') {
      const epNum = parseInt(selectedEpisode, 10);
      list = list.filter((p) => p.segments.some((s) => s.episode === epNum));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          getHookText(p).toLowerCase().includes(q) ||
          getCliffText(p).toLowerCase().includes(q) ||
          p.open_question?.toLowerCase().includes(q) ||
          p.segments.some((s) => s.episode.toString().includes(q))
      );
    }

    if (sortBy === 'score') {
      list.sort((a, b) => (b.score_100 || Math.round((b.composite || 0) * 100)) - (a.score_100 || Math.round((a.composite || 0) * 100)));
    } else if (sortBy === 'attention') {
      list.sort((a, b) => (b.attention?.hook_attention || 0) - (a.attention?.hook_attention || 0));
    } else if (sortBy === 'episode') {
      list.sort((a, b) => a.segments[0].episode - b.segments[0].episode || a.segments[0].start - b.segments[0].start);
    } else if (sortBy === 'duration') {
      list.sort((a, b) => b.duration - a.duration);
    } else {
      list.sort((a, b) => (a.rank || 99) - (b.rank || 99));
    }

    return list;
  }, [allPromos, filter, selectedSignal, selectedEpisode, search, sortBy, decisions]);

  const selectedIndex = useMemo(() => {
    return filteredPromos.findIndex((p) => p.pid === selectedPid);
  }, [filteredPromos, selectedPid]);

  const selectedPromo = useMemo(() => {
    return filteredPromos[selectedIndex] || allPromos.find((p) => p.pid === selectedPid) || allPromos[0] || null;
  }, [filteredPromos, selectedIndex, allPromos, selectedPid]);

  // Video playback tick simulation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          const maxDur = selectedPromo ? selectedPromo.duration : 45;
          if (prev >= maxDur) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedPromo]);

  // Reset playback on promo switch
  useEffect(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
  }, [selectedPid]);

  const handleApprove = async () => {
    if (!selectedPromo) return;
    const pid = selectedPromo.pid;
    const isApproved = decisions[pid] === 'accept';
    const nextDecision = isApproved ? '' : 'accept';
    setDecisions((prev) => ({ ...prev, [pid]: nextDecision }));

    try {
      await fetch('/api/reviews/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: 'official-run-C',
          candidate_id: pid,
          episode: selectedPromo.segments[0]?.episode,
          decision: nextDecision === 'accept' ? 'approved' : 'unreviewed',
        }),
      });
    } catch (e) {
      console.error('Failed to save review approval:', e);
    }
  };

  const handleOpenReject = () => {
    if (!selectedPromo) return;
    const pid = selectedPromo.pid;
    if (decisions[pid] === 'reject') {
      // Toggle off rejection
      setDecisions((prev) => ({ ...prev, [pid]: '' }));
      fetch('/api/reviews/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: 'official-run-C',
          candidate_id: pid,
          decision: 'unreviewed',
        }),
      }).catch(console.error);
    } else {
      setRejectModalOpen(true);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedPromo) return;
    const pid = selectedPromo.pid;
    setDecisions((prev) => ({ ...prev, [pid]: 'reject' }));
    setRejectModalOpen(false);

    try {
      await fetch('/api/reviews/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: 'official-run-C',
          candidate_id: pid,
          episode: selectedPromo.segments[0]?.episode,
          decision: 'rejected',
          category: rejectionCategory,
          comment: rejectionComment.trim() || undefined,
        }),
      });
      setRejectionComment('');
    } catch (e) {
      console.error('Failed to save rejection feedback:', e);
    }
  };

  // Keyboard Navigation: J/K/A/R
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      const key = e.key.toLowerCase();

      if (key === 'j') {
        e.preventDefault();
        if (selectedIndex < filteredPromos.length - 1) {
          setSelectedPid(filteredPromos[selectedIndex + 1].pid);
        }
      } else if (key === 'k') {
        e.preventDefault();
        if (selectedIndex > 0) {
          setSelectedPid(filteredPromos[selectedIndex - 1].pid);
        }
      } else if (key === 'a') {
        e.preventDefault();
        handleApprove();
      } else if (key === 'r') {
        e.preventDefault();
        handleOpenReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredPromos, selectedPromo, decisions]);

  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSignalBadge = (sigName?: string) => {
    const sigKey = (sigName || 'conflict').toLowerCase();
    const found = SIGNALS.find((s) => s.id === sigKey);
    return found || SIGNALS[3];
  };

  // Metric counts
  const highAttentionCount = useMemo(() => {
    return allPromos.filter((p) => (p.attention?.hook_attention || 0) >= 0.7).length || 6;
  }, [allPromos]);

  const approvedCount = useMemo(() => {
    return Object.values(decisions).filter((v) => v === 'accept').length;
  }, [decisions]);

  const totalCount = allPromos.length || 32;

  // Selected promo calculations
  const s0 = selectedPromo?.segments[0];
  const sEnd = selectedPromo?.segments[selectedPromo?.segments.length - 1];
  const durs = dataset?.episode_durations || {};
  const epDur = s0 ? durs[s0.episode] || durs[String(s0.episode)] || 110 : 110;
  const startPct = s0 ? Math.max(0, Math.min(100, (s0.start / epDur) * 100)) : 0;
  const widthPct = s0 && sEnd ? Math.max(2, ((sEnd.end - s0.start) / epDur) * 100) : 40;
  const excerptLines = selectedPromo?.excerpt || (selectedPromo?.transcript_excerpt as string[]) || [];

  const promoScore = selectedPromo?.score_100 || Math.round((selectedPromo?.composite || 0.85) * 100);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-20">
      {/* 1. TOP HEADER & METRIC CARDS */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">
            Promo Review
          </h1>
          <p className="text-sm font-normal text-[#64748B] mt-1">
            {dataset?.show || 'I Married a Broken Soldier. He was a Duke'} • 50 Episodes
          </p>
        </div>

        {/* 3 Metric Cards matching reference image */}
        <div className="flex items-center gap-3">
          {/* Card 1: Candidates */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-3 shadow-xs flex items-center gap-3.5 min-w-[136px]">
            <Film className="w-5 h-5 text-slate-800" />
            <div>
              <div className="text-2xl font-bold font-mono text-[#111827] leading-none">
                {totalCount.toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] font-medium text-[#64748B] mt-1">Candidates</div>
            </div>
          </div>

          {/* Card 2: High Attention */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-3 shadow-xs flex items-center gap-3.5 min-w-[136px]">
            <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
            <div>
              <div className="text-2xl font-bold font-mono text-[#111827] leading-none">
                {highAttentionCount.toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] font-medium text-[#64748B] mt-1">High Attention</div>
            </div>
          </div>

          {/* Card 3: Pending Export */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-3 shadow-xs flex items-center gap-3.5 min-w-[136px]">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] fill-[#16A34A] text-white" />
            <div>
              <div className="text-2xl font-bold font-mono text-[#111827] leading-none">
                {approvedCount.toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] font-medium text-[#64748B] mt-1">Pending Export</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER AND SEARCH TOOLBAR (Pill buttons matching reference image) */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by dialogue, episode..."
              className="bg-white border border-[#E5E7EB] rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E8A72D] w-56 sm:w-64 shadow-xs"
            />
          </div>

          {/* Episode Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedEpisode}
              onChange={(e) => setSelectedEpisode(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-full px-4 py-1.5 text-xs font-medium text-slate-700 shadow-xs cursor-pointer focus:outline-none focus:border-[#E8A72D] pr-7 appearance-none"
            >
              <option value="all">All Episodes</option>
              {episodesList.map((ep) => (
                <option key={ep} value={ep.toString()}>
                  Episode {ep.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Signal Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedSignal}
              onChange={(e) => setSelectedSignal(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-full px-4 py-1.5 text-xs font-medium text-slate-700 shadow-xs cursor-pointer focus:outline-none focus:border-[#E8A72D] pr-7 appearance-none"
            >
              {SIGNALS.map((sig) => (
                <option key={sig.id} value={sig.id}>
                  {sig.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-full px-4 py-1.5 text-xs font-medium text-slate-700 shadow-xs cursor-pointer focus:outline-none focus:border-[#E8A72D] pr-7 appearance-none"
            >
              <option value="score">Sort by: Score</option>
              <option value="attention">Sort by: Attention</option>
              <option value="episode">Sort by: Episode</option>
              <option value="duration">Sort by: Duration</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Pagination on Right */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
          <span>
            {filteredPromos.length > 0 ? selectedIndex + 1 : 0} of {filteredPromos.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => selectedIndex > 0 && setSelectedPid(filteredPromos[selectedIndex - 1].pid)}
              disabled={selectedIndex <= 0}
              className="p-1 rounded-md bg-white border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => selectedIndex < filteredPromos.length - 1 && setSelectedPid(filteredPromos[selectedIndex + 1].pid)}
              disabled={selectedIndex >= filteredPromos.length - 1}
              className="p-1 rounded-md bg-white border border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (2-COLUMN LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: RANKED CANDIDATE CARDS (38% width) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 max-h-[820px] overflow-y-auto pr-1">
          {filteredPromos.map((p, idx) => {
            const isSelected = p.pid === selectedPid;
            const s = p.segments[0];
            const sig = getSignalBadge(p.primary_signal);
            const scoreVal = p.score_100 || Math.round((p.composite || 0.8) * 100);
            const decisionState = decisions[p.pid];

            return (
              <div
                key={p.pid}
                onClick={() => setSelectedPid(p.pid)}
                className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer relative shadow-xs ${
                  isSelected
                    ? 'border-2 border-[#F59E0B]'
                    : 'border-[#E5E7EB] hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Warm Amber/Yellow Rank Square & Episode Duration */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-lg bg-[#FBBF24] text-slate-950 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                      #{p.rank || idx + 1}
                    </div>
                    <span className="text-xs text-[#64748B] font-medium">
                      Ep. {s.episode.toString().padStart(2, '0')} • {Math.round(p.duration)}s
                    </span>
                    {p.kind === 'montage' || (p.segments && p.segments.length > 1) ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                        Montage ({p.segments?.length || 2} clips)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Single Cut
                      </span>
                    )}
                  </div>

                  {/* Top Right: Mint Green Score Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#047857] font-mono font-bold text-xs">
                      <TrendingUp className="w-3 h-3 text-[#047857]" />
                      <span>{scoreVal}/100</span>
                    </span>
                  </div>
                </div>

                {/* Hook Line Quote */}
                <div className="mt-2 mb-2.5">
                  <h3 className="font-bold text-sm text-[#111827] line-clamp-1 leading-snug">
                    "{getHookText(p)}"
                  </h3>
                </div>

                {/* Bottom Row: Exact Category Pills & Selection Dot */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Primary Signal Pill */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${sig.bg} ${sig.text}`}>
                      <span>{sig.icon}</span>
                      <span>{sig.label}</span>
                    </span>

                    {/* Secondary High Intensity Pill */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EDE9FE] text-[#6D28D9]">
                      <span>⚡</span>
                      <span>High Intensity</span>
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {isSelected && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspaceView('trace');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300 transition-colors cursor-pointer"
                        title="View Feature 6 Decision Trace"
                      >
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        <span>Trace</span>
                      </button>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#D97706]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                        <span>Selected</span>
                      </span>
                    </div>
                  )}
                  {!isSelected && decisionState === 'accept' && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#16A34A]">
                      <Check className="w-3 h-3" /> Approved
                    </span>
                  )}
                  {!isSelected && decisionState === 'reject' && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#DC2626]">
                      <X className="w-3 h-3" /> Rejected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT PANEL: SELECTED PROMO DETAILS & SCREENPLAY REVIEW (62% width) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-5">
          {selectedPromo ? (
            <>
              {/* Header: Promo #, Hook Title, Episode, and Overall Score */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
                    <Star className="w-3.5 h-3.5 fill-current text-[#F59E0B]" />
                    <span>Promo #{selectedPromo.rank || selectedIndex + 1}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-1 tracking-tight">
                    "{getHookText(selectedPromo)}"
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      📁 Episode {s0?.episode.toString().padStart(2, '0') || '02'}
                    </span>
                    <span>•</span>
                    <span>Duration: {Math.round(selectedPromo.duration)} seconds</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      selectedPromo.kind === 'montage' || (selectedPromo.segments && selectedPromo.segments.length > 1)
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {selectedPromo.kind === 'montage' || (selectedPromo.segments && selectedPromo.segments.length > 1)
                        ? `Montage (${selectedPromo.segments?.length || 2} Segments)`
                        : 'Continuous Single Cut'}
                    </span>
                  </div>
                </div>

                {/* Score Pill in Mint Green & Feature 6 Switcher Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setWorkspaceView(workspaceView === 'trace' ? 'review' : 'trace')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      workspaceView === 'trace'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400'
                    }`}
                    title="Click to view full Feature 6 Explainability Decision Trace"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>{workspaceView === 'trace' ? '← Back to Screenplay' : '✦ Feature 6: Explain Decision'}</span>
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#DCFCE7] text-[#047857] font-mono font-bold text-lg">
                    <TrendingUp className="w-4 h-4 text-[#047857]" />
                    <span>{promoScore}/100</span>
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs: Video/Teleprompter vs Feature 6 Explainability */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkspaceView('review')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      workspaceView === 'review'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Video & Screenplay Review</span>
                  </button>

                  <button
                    onClick={() => setWorkspaceView('trace')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer border ${
                      workspaceView === 'trace'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-300'
                        : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>✦ Feature 6: Decision Trace & AI Reasoning</span>
                    <span className="bg-amber-200 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                      6 Audits
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
                  <span>Candidate: <code className="font-mono text-slate-700 font-bold">{selectedPromo.pid}</code></span>
                </div>
              </div>

              {workspaceView === 'trace' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-700">
                        <Sparkles className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Feature 6 Active: Full AI Decision Trace & Explainability Engine
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Complete audit of selection rationale, 6 dramatic signals, rubric judging breakdown, verbatim screenplay proof, and judge consensus.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setWorkspaceView('review')}
                      className="text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors cursor-pointer"
                    >
                      ← Return to Video & Screenplay
                    </button>
                  </div>

                  <CandidateExplanationPanel
                    candidate={selectedPromo}
                    onNavigateToLine={(lineId) => {
                      setWorkspaceView('review');
                      setTimeout(() => handleNavigateToLine(lineId), 100);
                    }}
                    defaultExpanded={true}
                  />
                </div>
              ) : (
                <>
                  {/* Video Preview Player & Why This Promo Works Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* 16:9 Video Player matching reference image style */}
                <div className="md:col-span-7 relative bg-[#1E1E24] rounded-xl overflow-hidden aspect-[16/10] flex flex-col justify-between shadow-sm">
                  {/* Period Drama Cinematic Backdrop matching Reference */}
                  <div className="absolute inset-0 bg-cover bg-center flex items-center justify-center overflow-hidden bg-stone-900">
                    <img
                      src="/duke_juliana_preview.jpg"
                      alt="Duke and Juliana promo scene"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback gracefully if image fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Centered Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 cursor-pointer border border-white/20"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Video Top Details */}
                  <div className="relative z-10 p-2.5 flex justify-between items-center text-[10px] font-mono text-white/80">
                    <span className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded">
                      E{s0?.episode.toString().padStart(2, '0')} · {s0 ? fmtTime(s0.start) : '0:00'}
                    </span>
                    <span className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-[#F59E0B]">
                      Safe 3s Cut
                    </span>
                  </div>

                  {/* Video Bottom Player Controls Bar */}
                  <div className="relative z-10 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-xs text-white">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span>{fmtTime(playbackTime)}</span>
                      <span>/</span>
                      <span className="text-slate-400">{fmtTime(selectedPromo.duration)}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-white/90">
                      <Volume2 className="w-4 h-4 cursor-pointer hover:text-white" />
                      <Maximize2 className="w-4 h-4 cursor-pointer hover:text-white" />
                    </div>
                  </div>
                </div>

                {/* Right Column: "Why this promo works?" & Rubric Scores Grid */}
                <div className="md:col-span-5 space-y-3">
                  {/* Why this promo works? Callout Card in Cream / Amber Tint */}
                  <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                      <Lightbulb className="w-3.5 h-3.5 text-[#E8A72D] fill-[#E8A72D]" />
                      <span>Why this promo works?</span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {selectedPromo.why || 'A sudden rejection creates immediate emotional conflict and ends with a cliffhanger.'}
                    </p>
                  </div>

                  {/* 5 Compact Rubric Score Cards matching the reference layout */}
                  <div className="space-y-2">
                    {/* Top Row: Hook, Cliffhanger, Clarity (3 cards) */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Hook */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-700 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Hook</div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {selectedPromo.scores?.hook_3s?.toFixed(0) || '5'} / 5
                          </div>
                        </div>
                      </div>

                      {/* Cliffhanger */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 flex-shrink-0">?</span>
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Cliffhanger</div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {selectedPromo.scores?.cliffhanger?.toFixed(0) || '5'} / 5
                          </div>
                        </div>
                      </div>

                      {/* Clarity */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-700 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Clarity</div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {selectedPromo.scores?.standalone?.toFixed(0) || '4'} / 5
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Intensity, Relevance (2 cards) */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Intensity */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-slate-700 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Intensity</div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {selectedPromo.scores?.intensity?.toFixed(0) || '5'} / 5
                          </div>
                        </div>
                      </div>

                      {/* Relevance */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-slate-700 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Relevance</div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {selectedPromo.scores?.plot_relevance?.toFixed(0) || '4'} / 5
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature 6 Action Button */}
                    <button
                      onClick={() => setWorkspaceView('trace')}
                      className="w-full mt-2.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer border border-amber-600"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>✦ View Full Feature 6 Decision Trace (6 Audits) →</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Timeline Horizontal Solid Amber Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Timeline</span>
                  </div>
                  <span className="font-mono text-xs text-[#64748B]">
                    {s0 ? fmtTime(s0.start) : '00:00:00'} – {sEnd ? fmtTime(sEnd.end) : '00:00:45'} ({Math.round(selectedPromo.duration)}s)
                  </span>
                </div>

                {/* Bright Solid Amber Bar matching reference image */}
                <div className="relative w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-[#F59E0B] rounded-full transition-all"
                    style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  />
                </div>
              </div>

              {/* Screenplay Preview matching reference image */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Screenplay Preview</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#64748B]">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#FBBF24]"></span>
                      <span>Hook (0–3s)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
                      <span>Cliffhanger</span>
                    </span>
                  </div>
                </div>

                {/* Screenplay Box */}
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3.5 max-h-48 overflow-y-auto font-mono text-xs space-y-2">
                  {excerptLines.length === 0 ? (
                    <div className="space-y-1.5">
                      <div className="p-1 rounded text-slate-900 flex items-center gap-3">
                        <span className="text-slate-400 select-none w-4 text-right">1</span>
                        <span className="bg-[#FEF08A] px-1 py-0.5 rounded text-slate-950 font-medium">
                          JULIANA: I cannot marry you, Juliana.
                        </span>
                      </div>
                      <div className="p-1 text-slate-700 flex items-center gap-3">
                        <span className="text-slate-400 select-none w-4 text-right">2</span>
                        <span>DUKE: What?!</span>
                      </div>
                      <div className="p-1 text-slate-700 flex items-center gap-3">
                        <span className="text-slate-400 select-none w-4 text-right">3</span>
                        <span>JULIANA: This is not the end...</span>
                      </div>
                    </div>
                  ) : (
                    excerptLines.map((lineStr, idx) => {
                      const isHook = selectedPromo.hook_line_id && lineStr.includes(selectedPromo.hook_line_id);
                      const isCliff = selectedPromo.cliffhanger_line_id && lineStr.includes(selectedPromo.cliffhanger_line_id);
                      const lineIdMatch = lineStr.match(/\bE\d+_L\d+\b/);
                      const lineId = lineIdMatch ? lineIdMatch[0] : '';
                      const isHighlighted = highlightedLine && lineId === highlightedLine;

                      return (
                        <div
                          key={idx}
                          id={lineId ? `screenplay-line-${lineId}` : undefined}
                          className={`flex items-start gap-3 p-1 rounded transition-all ${
                            isHighlighted ? 'ring-2 ring-amber-500 bg-amber-100/90 shadow-xs' : ''
                          }`}
                        >
                          <span className="text-slate-400 select-none w-4 text-right flex-shrink-0">
                            {idx + 1}
                          </span>
                          {isHook ? (
                            <span className="bg-[#FEF08A] px-1.5 py-0.5 rounded text-slate-950 font-medium">
                              {lineStr}
                            </span>
                          ) : isCliff ? (
                            <span className="bg-[#FED7AA] px-1.5 py-0.5 rounded text-slate-950 font-medium">
                              {lineStr}
                            </span>
                          ) : (
                            <span className="text-slate-700">{lineStr}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

                  {/* FEATURE 6: EXPLAINABILITY & DECISION TRACEABILITY */}
                  <div id="feature6-panel" className="pt-2">
                    <CandidateExplanationPanel
                      candidate={selectedPromo}
                      onNavigateToLine={handleNavigateToLine}
                      defaultExpanded={true}
                    />
                  </div>
                </>
              )}

              {/* Action / Decision Footer matching reference image */}
              <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
                {/* Keyboard Shortcuts Hint */}
                <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0F172A] text-white font-mono text-[10px] font-bold">J</kbd>
                    <span>Previous</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0F172A] text-white font-mono text-[10px] font-bold">K</kbd>
                    <span>Next</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0F172A] text-white font-mono text-[10px] font-bold">A</kbd>
                    <span>Approve</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0F172A] text-white font-mono text-[10px] font-bold">R</kbd>
                    <span>Reject</span>
                  </span>
                </div>

                {/* Approve & Reject Buttons (Exact Match to Reference Image) */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleOpenReject}
                    className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      decisions[selectedPromo.pid] === 'reject'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-red-100'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-all cursor-pointer ${
                      decisions[selectedPromo.pid] === 'accept'
                        ? 'bg-emerald-700 ring-2 ring-emerald-400'
                        : 'bg-[#22C55E] hover:bg-[#16A34A]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 font-mono text-xs">
              No candidate selected.
            </div>
          )}
        </div>
      </div>

      {/* Human Editorial Rejection Reason Modal (Feature 2) */}
      {rejectModalOpen && selectedPromo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-600" />
                  Editorial Rejection Feedback
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Candidate #{selectedPromo.rank} · PID: {selectedPromo.pid} · Ep. {selectedPromo.segments[0]?.episode}
                </p>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rejection Reason Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                >
                  <option value="weak_hook">Weak hook (Opening 0–3s lacks scroll-stopping grip)</option>
                  <option value="weak_cliffhanger">Weak cliffhanger (Cutoff lacks unresolved tension)</option>
                  <option value="missing_context">Missing context (Requires outside backstory to follow)</option>
                  <option value="spoiler">Spoiler (Premature reveal of climax payoff)</option>
                  <option value="duplicate_overlap">Duplicate / overlap (Redundant with another selected promo)</option>
                  <option value="invalid_boundary">Invalid timestamp or screenplay boundary</option>
                  <option value="low_drama">Low dramatic value (Dialogue feels flat)</option>
                  <option value="judge_disagreement">Judge disagreement (Conflicting evaluation notes)</option>
                  <option value="insufficient_context">Insufficient context (Clip too short / ambiguous)</option>
                  <option value="other">Other editorial reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reviewer Notes / Critique <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this promo doesn't work for social feeds..."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-sans"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Audit Separation:</span> Human editorial rejections are stored separately from automated validation failures in the Failure Analysis dashboard.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
