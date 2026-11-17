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
  { id: 'romance', label: 'Romance', icon: '💖', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'action', label: 'Action', icon: '🔥', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'conflict', label: 'Conflict', icon: '🔷', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'drama', label: 'Drama', icon: '🎭', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'suspense', label: 'Suspense', icon: '➕', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'mystery', label: 'Mystery', icon: '🔷', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'cliffhanger', label: 'Cliffhanger', icon: '🎭', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
  { id: 'emotion', label: 'Emotion', icon: '💔', bg: 'bg-[#ECECEE]', text: 'text-[#27272A]' },
];

export const ReviewDesk: React.FC<ReviewDeskProps> = ({
  dataset,
  decisions,
  setDecisions,
  setActiveTab,
}) => {
  const [selectedPid, setSelectedPid] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'single' | 'montage' | 'attention' | 'flagged' | 'disputed' | 'approved' | 'rejected'>('all');
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Video playback simulation
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

    if (nextDecision === 'accept') {
      setToastMessage(`Promo ${pid} approved! Added to Pending Export.`);
    } else {
      setToastMessage(`Approval cleared for ${pid}.`);
    }
    setTimeout(() => {
      setToastMessage((cur) => (cur?.includes(pid) ? null : cur));
    }, 4500);

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
      setDecisions((prev) => ({ ...prev, [pid]: '' }));
      setToastMessage(`Rejection cleared for ${pid}.`);
      setTimeout(() => {
        setToastMessage((cur) => (cur?.includes(pid) ? null : cur));
      }, 4500);
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
    setToastMessage(`Promo ${pid} rejected (Logged in Feature 2 Failures).`);
    setTimeout(() => {
      setToastMessage((cur) => (cur?.includes(pid) ? null : cur));
    }, 4500);

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
    <div className="space-y-6 pb-20 font-sans select-none">
      {/* 1. TOP HEADER & METRIC CARDS (TwelveLabs Unified Theme) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight">
            Promo Review
          </h1>
          <p className="text-sm font-normal text-[#52525A] mt-1">
            {dataset?.show || 'I Married a Broken Soldier. He was a Duke'} • 50 Episodes
          </p>
        </div>

        {/* 3 Metric Cards in TwelveLabs rounded card aesthetic */}
        <div className="flex items-center gap-3">
          {/* Card 1: Candidates */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl px-5 py-3 shadow-xs flex items-center gap-3.5 min-w-[136px]">
            <Film className="w-5 h-5 text-[#18181B]" />
            <div>
              <div className="text-2xl font-bold font-mono text-[#18181B] leading-none">
                {totalCount.toString().padStart(2, '0')}
              </div>
              <div className="text-xs font-medium text-[#52525A] mt-1">Candidates</div>
            </div>
          </div>

          {/* Card 2: High Attention */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl px-5 py-3 shadow-xs flex items-center gap-3.5 min-w-[136px]">
            <Star className="w-5 h-5 text-[#B45309] fill-[#F59E0B]" />
            <div>
              <div className="text-2xl font-bold font-mono text-[#18181B] leading-none">
                {highAttentionCount.toString().padStart(2, '0')}
              </div>
              <div className="text-xs font-medium text-[#52525A] mt-1">High Attention</div>
            </div>
          </div>

          {/* Card 3: Pending Export */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl px-5 py-3 shadow-xs flex items-center gap-3.5 min-w-[136px]">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
            <div>
              <div className="text-2xl font-bold font-mono text-[#18181B] leading-none">
                {approvedCount.toString().padStart(2, '0')}
              </div>
              <div className="text-xs font-medium text-[#52525A] mt-1">Pending Export</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER AND SEARCH TOOLBAR (TwelveLabs Minimalist Input Style) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by dialogue, episode..."
              className="bg-[#F8F8FA] border border-[#E5E5EA] hover:border-[#D1D1D6] rounded-xl pl-9 pr-4 py-2 text-xs text-[#18181B] placeholder-[#8E8E93] focus:outline-none focus:border-[#18181B] focus:bg-white w-56 sm:w-64 shadow-xs transition-colors"
            />
          </div>

          {/* Episode Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedEpisode}
              onChange={(e) => setSelectedEpisode(e.target.value)}
              className="bg-[#F8F8FA] border border-[#E5E5EA] hover:border-[#D1D1D6] rounded-xl px-4 py-2 text-xs font-medium text-[#27272A] shadow-xs cursor-pointer focus:outline-none focus:border-[#18181B] focus:bg-white pr-7 appearance-none transition-colors"
            >
              <option value="all">All Episodes</option>
              {episodesList.map((ep) => (
                <option key={ep} value={ep.toString()}>
                  Episode {ep.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#8E8E93] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Signal Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedSignal}
              onChange={(e) => setSelectedSignal(e.target.value)}
              className="bg-[#F8F8FA] border border-[#E5E5EA] hover:border-[#D1D1D6] rounded-xl px-4 py-2 text-xs font-medium text-[#27272A] shadow-xs cursor-pointer focus:outline-none focus:border-[#18181B] focus:bg-white pr-7 appearance-none transition-colors"
            >
              {SIGNALS.map((sig) => (
                <option key={sig.id} value={sig.id}>
                  {sig.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#8E8E93] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#F8F8FA] border border-[#E5E5EA] hover:border-[#D1D1D6] rounded-xl px-4 py-2 text-xs font-medium text-[#27272A] shadow-xs cursor-pointer focus:outline-none focus:border-[#18181B] focus:bg-white pr-7 appearance-none transition-colors"
            >
              <option value="score">Sort by: Score</option>
              <option value="attention">Sort by: Attention</option>
              <option value="episode">Sort by: Episode</option>
              <option value="duration">Sort by: Duration</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#8E8E93] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Pagination on Right */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#71717A]">
          <span>
            {filteredPromos.length > 0 ? selectedIndex + 1 : 0} of {filteredPromos.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => selectedIndex > 0 && setSelectedPid(filteredPromos[selectedIndex - 1].pid)}
              disabled={selectedIndex <= 0}
              className="p-1.5 rounded-lg bg-[#F8F8FA] border border-[#E5E5EA] hover:bg-[#ECECEE] text-[#18181B] disabled:opacity-40 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => selectedIndex < filteredPromos.length - 1 && setSelectedPid(filteredPromos[selectedIndex + 1].pid)}
              disabled={selectedIndex >= filteredPromos.length - 1}
              className="p-1.5 rounded-lg bg-[#F8F8FA] border border-[#E5E5EA] hover:bg-[#ECECEE] text-[#18181B] disabled:opacity-40 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (2-COLUMN LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: RANKED CANDIDATE CARDS (38% width) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 max-h-[820px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-300">
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
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer relative shadow-xs ${
                  isSelected
                    ? 'border-2 border-[#18181B] ring-1 ring-[#18181B]/15 shadow-sm'
                    : 'border-[#E5E5EA] hover:border-[#8E8E93]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Rank Pill & Episode Duration */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#18181B] text-white'
                        : 'bg-[#ECECEE] text-[#18181B]'
                    }`}>
                      #{p.rank || idx + 1}
                    </div>
                    <span className="text-xs text-[#52525A] font-semibold">
                      Ep. {s.episode.toString().padStart(2, '0')} • {Math.round(p.duration)}s
                    </span>
                    {p.kind === 'montage' || (p.segments && p.segments.length > 1) ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#F0F0F2] text-[#18181B] border border-[#E0E0E4]">
                        Montage ({p.segments?.length || 2} clips)
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-[#ECECEE] text-[#52525A]">
                        Single Cut
                      </span>
                    )}
                  </div>

                  {/* Top Right: Score Badge in TwelveLabs Sleek Pill */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#ECECEE] text-[#18181B] font-mono font-bold text-xs border border-[#E0E0E4]">
                      <TrendingUp className="w-3 h-3 text-[#18181B]" />
                      <span>{scoreVal}/100</span>
                    </span>
                  </div>
                </div>

                {/* Hook Line Quote */}
                <div className="mt-2.5 mb-3">
                  <h3 className="font-semibold text-[15px] text-[#18181B] line-clamp-2 leading-snug tracking-tight">
                    "{getHookText(p)}"
                  </h3>
                </div>

                {/* Bottom Row: Category Pills & Decision Indicators */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Primary Signal Pill */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#ECECEE] text-[#27272A]">
                      <span>{sig.icon}</span>
                      <span>{sig.label}</span>
                    </span>

                    {/* Decision Badge directly on card */}
                    {decisionState === 'accept' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3 h-3 text-emerald-700" /> Approved
                      </span>
                    )}
                    {decisionState === 'reject' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <X className="w-3 h-3 text-rose-700" /> Rejected
                      </span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspaceView('trace');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#18181B] bg-[#ECECEE] hover:bg-[#E0E0E4] px-2.5 py-0.5 rounded-md border border-[#D1D1D6] transition-colors cursor-pointer"
                        title="View Feature 6 Decision Trace"
                      >
                        <Sparkles className="w-3 h-3 text-[#18181B]" />
                        <span>Trace</span>
                      </button>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#18181B]"></span>
                        <span>Selected</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT PANEL: SELECTED PROMO DETAILS & SCREENPLAY REVIEW (62% width) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-[#E5E5EA] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          {selectedPromo ? (
            <>
              {/* Header: Promo #, Hook Title, Episode, and Overall Score */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#71717A]">
                      <Star className="w-3.5 h-3.5 fill-current text-[#B45309]" />
                      <span>Promo #{selectedPromo.rank || selectedIndex + 1}</span>
                    </div>

                    {/* Status Pill */}
                    {decisions[selectedPromo.pid] === 'accept' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <Check className="w-3 h-3 text-emerald-700" /> Approved for Export
                      </span>
                    )}
                    {decisions[selectedPromo.pid] === 'reject' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                        <X className="w-3 h-3 text-rose-700" /> Rejected
                      </span>
                    )}
                    {!decisions[selectedPromo.pid] && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECECEE] text-[#52525A]">
                        Pending Review
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#18181B] mt-1 tracking-tight leading-snug">
                    "{getHookText(selectedPromo)}"
                  </h2>
                  <div className="flex items-center gap-2 text-sm font-medium text-[#52525A] mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      📁 Episode {s0?.episode.toString().padStart(2, '0') || '02'}
                    </span>
                    <span>•</span>
                    <span>Duration: {Math.round(selectedPromo.duration)} seconds</span>
                    <span>•</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                      selectedPromo.kind === 'montage' || (selectedPromo.segments && selectedPromo.segments.length > 1)
                        ? 'bg-[#F0F0F2] text-[#18181B] border-[#E0E0E4]'
                        : 'bg-[#ECECEE] text-[#52525A] border-[#D1D1D6]'
                    }`}>
                      {selectedPromo.kind === 'montage' || (selectedPromo.segments && selectedPromo.segments.length > 1)
                        ? `Montage (${selectedPromo.segments?.length || 2} Segments)`
                        : 'Continuous Single Cut'}
                    </span>
                  </div>
                </div>

                {/* Score Pill in TwelveLabs Sleek Gray */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setWorkspaceView(workspaceView === 'trace' ? 'review' : 'trace')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                      workspaceView === 'trace'
                        ? 'bg-[#18181B] text-white border-[#18181B] shadow-xs'
                        : 'bg-[#F0F0F2] hover:bg-[#E4E4E8] text-[#27272A] border-[#E0E0E4]'
                    }`}
                    title="Click to view full Feature 6 Explainability Decision Trace"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{workspaceView === 'trace' ? '← Back to Screenplay' : '✦ Feature 6: Explain Decision'}</span>
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#ECECEE] text-[#18181B] font-mono font-bold text-lg border border-[#E0E0E4]">
                    <TrendingUp className="w-4 h-4 text-[#18181B]" />
                    <span>{promoScore}/100</span>
                  </div>
                </div>
              </div>

              {/* Toast Feedback Notification Banner */}
              {toastMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 font-medium shadow-xs transition-all">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{toastMessage}</span>
                  </div>
                  {selectedIndex < filteredPromos.length - 1 && (
                    <button
                      onClick={() => setSelectedPid(filteredPromos[selectedIndex + 1].pid)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Next Promo</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* View Switcher Tabs: Video/Teleprompter vs Feature 6 Explainability */}
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkspaceView('review')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                      workspaceView === 'review'
                        ? 'bg-[#18181B] text-white shadow-xs'
                        : 'text-[#27272A] hover:bg-[#F0F0F2] border border-[#E5E5EA]'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Video & Screenplay Review</span>
                  </button>

                  <button
                    onClick={() => setWorkspaceView('trace')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer border ${
                      workspaceView === 'trace'
                        ? 'bg-[#18181B] text-white shadow-xs'
                        : 'text-[#27272A] hover:bg-[#F0F0F2] border-[#E5E5EA]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Feature 6: Decision Trace & AI Reasoning</span>
                    <span className="bg-[#ECECEE] text-[#18181B] text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                      6 Audits
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-[#71717A] hidden sm:flex items-center gap-2">
                  <span>Candidate: <code className="font-mono text-[#18181B] font-bold">{selectedPromo.pid}</code></span>
                </div>
              </div>

              {workspaceView === 'trace' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#F8F8FA] border border-[#E5E5EA] rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#ECECEE] flex items-center justify-center text-[#18181B]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#18181B] block">
                          Feature 6 Active: Full AI Decision Trace & Explainability Engine
                        </span>
                        <span className="text-[11px] text-[#71717A]">
                          Audit of selection rationale, 6 dramatic signals, rubric judging breakdown, and judge consensus.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setWorkspaceView('review')}
                      className="text-xs font-semibold text-[#18181B] bg-white hover:bg-[#ECECEE] px-3.5 py-1.5 rounded-xl border border-[#D1D1D6] transition-colors cursor-pointer shadow-xs"
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
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* 16:9 Video Player matching TwelveLabs dark minimalist player */}
                    <div className="md:col-span-7 relative bg-[#0F0F11] border border-[#27272A] rounded-2xl overflow-hidden aspect-[16/10] flex flex-col justify-between shadow-xs">
                      {/* Period Drama Cinematic Backdrop */}
                      <div className="absolute inset-0 bg-cover bg-center flex items-center justify-center overflow-hidden bg-stone-900">
                        <img
                          src="/duke_juliana_preview.jpg"
                          alt="Duke and Juliana promo scene"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Centered Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-12 h-12 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-md transform transition-transform hover:scale-105 cursor-pointer border border-white/20"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Video Top Details */}
                      <div className="relative z-10 p-3 flex justify-between items-center text-[10px] font-mono text-white/90">
                        <span className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md">
                          E{s0?.episode.toString().padStart(2, '0')} · {s0 ? fmtTime(s0.start) : '0:00'}
                        </span>
                        <span className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md text-amber-400 font-semibold">
                          Safe 3s Cut
                        </span>
                      </div>

                      {/* Video Bottom Player Controls Bar */}
                      <div className="relative z-10 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-xs text-white">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>{fmtTime(playbackTime)}</span>
                          <span>/</span>
                          <span className="text-white/60">{fmtTime(selectedPromo.duration)}</span>
                        </div>

                        <div className="flex items-center gap-3 text-white/90">
                          <Volume2 className="w-4 h-4 cursor-pointer hover:text-white" />
                          <Maximize2 className="w-4 h-4 cursor-pointer hover:text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: "Why this promo works?" & Rubric Scores Grid */}
                    <div className="md:col-span-5 space-y-3.5">
                      {/* Why this promo works? Callout Card */}
                      <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-2xl p-4 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#18181B] uppercase tracking-wider">
                          <Lightbulb className="w-4 h-4 text-[#B45309]" />
                          <span>Why this promo works?</span>
                        </div>
                        <p className="text-[13px] text-[#27272A] leading-relaxed">
                          {selectedPromo.why || 'A sudden rejection creates immediate emotional conflict and ends with a cliffhanger.'}
                        </p>
                      </div>

                      {/* 5 Compact Rubric Score Cards in TwelveLabs subtle gray */}
                      <div className="space-y-2">
                        {/* Top Row: Hook, Cliffhanger, Clarity (3 cards) */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Hook */}
                          <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#52525A] flex-shrink-0" />
                            <div>
                              <div className="text-[11px] text-[#52525A] font-semibold uppercase tracking-wider">Hook</div>
                              <div className="text-sm font-bold font-mono text-[#18181B]">
                                {selectedPromo.scores?.hook_3s?.toFixed(0) || '5'} / 5
                              </div>
                            </div>
                          </div>

                          {/* Cliffhanger */}
                          <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center gap-2">
                            <span className="text-sm font-bold text-[#52525A] flex-shrink-0">?</span>
                            <div>
                              <div className="text-[11px] text-[#52525A] font-semibold uppercase tracking-wider">Cliff</div>
                              <div className="text-sm font-bold font-mono text-[#18181B]">
                                {selectedPromo.scores?.cliffhanger?.toFixed(0) || '5'} / 5
                              </div>
                            </div>
                          </div>

                          {/* Clarity */}
                          <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#52525A] flex-shrink-0" />
                            <div>
                              <div className="text-[11px] text-[#52525A] font-semibold uppercase tracking-wider">Clarity</div>
                              <div className="text-sm font-bold font-mono text-[#18181B]">
                                {selectedPromo.scores?.standalone?.toFixed(0) || '4'} / 5
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Intensity, Relevance (2 cards) */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Intensity */}
                          <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#52525A] flex-shrink-0" />
                            <div>
                              <div className="text-[11px] text-[#52525A] font-semibold uppercase tracking-wider">Intensity</div>
                              <div className="text-sm font-bold font-mono text-[#18181B]">
                                {selectedPromo.scores?.intensity?.toFixed(0) || '5'} / 5
                              </div>
                            </div>
                          </div>

                          {/* Relevance */}
                          <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-2.5 flex items-center gap-2">
                            <Star className="w-4 h-4 text-[#52525A] flex-shrink-0" />
                            <div>
                              <div className="text-[11px] text-[#52525A] font-semibold uppercase tracking-wider">Relevance</div>
                              <div className="text-sm font-bold font-mono text-[#18181B]">
                                {selectedPromo.scores?.plot_relevance?.toFixed(0) || '4'} / 5
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Feature 6 Action Button */}
                        <button
                          onClick={() => setWorkspaceView('trace')}
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-[#18181B] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Feature 6 Decision Trace (6 Audits) →</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Scrubber Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#18181B]">
                        <Clock className="w-3.5 h-3.5 text-[#71717A]" />
                        <span>Timeline</span>
                      </div>
                      <span className="font-mono text-xs text-[#71717A]">
                        {s0 ? fmtTime(s0.start) : '00:00:00'} – {sEnd ? fmtTime(sEnd.end) : '00:00:45'} ({Math.round(selectedPromo.duration)}s)
                      </span>
                    </div>

                    <div className="relative w-full h-2 bg-[#ECECEE] rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-[#18181B] rounded-full transition-all"
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Screenplay Preview Box */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#18181B]">
                        <FileText className="w-3.5 h-3.5 text-[#71717A]" />
                        <span>Screenplay Preview</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#71717A]">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#18181B]"></span>
                          <span>Hook (0–3s)</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#8E8E93]"></span>
                          <span>Cliffhanger</span>
                        </span>
                      </div>
                    </div>

                    {/* Screenplay Box in TwelveLabs Clean Gray */}
                    <div className="bg-[#F8F8FA] border border-[#E5E5EA] rounded-2xl p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-neutral-300">
                      {excerptLines.length === 0 ? (
                        <div className="space-y-1.5">
                          <div className="p-1 rounded text-[#18181B] flex items-center gap-3">
                            <span className="text-[#8E8E93] select-none w-4 text-right">1</span>
                            <span className="bg-[#ECECEE] px-1.5 py-0.5 rounded text-[#18181B] font-medium">
                              JULIANA: I cannot marry you, Juliana.
                            </span>
                          </div>
                          <div className="p-1 text-[#52525A] flex items-center gap-3">
                            <span className="text-[#8E8E93] select-none w-4 text-right">2</span>
                            <span>DUKE: What?!</span>
                          </div>
                          <div className="p-1 text-[#52525A] flex items-center gap-3">
                            <span className="text-[#8E8E93] select-none w-4 text-right">3</span>
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
                                isHighlighted ? 'ring-2 ring-[#18181B] bg-[#ECECEE] shadow-xs' : ''
                              }`}
                            >
                              <span className="text-[#8E8E93] select-none w-4 text-right flex-shrink-0">
                                {idx + 1}
                              </span>
                              {isHook ? (
                                <span className="bg-[#ECECEE] px-1.5 py-0.5 rounded text-[#18181B] font-medium border border-[#D1D1D6]">
                                  {lineStr}
                                </span>
                              ) : isCliff ? (
                                <span className="bg-[#F0F0F2] px-1.5 py-0.5 rounded text-[#18181B] font-medium border border-[#D1D1D6]">
                                  {lineStr}
                                </span>
                              ) : (
                                <span className="text-[#52525A]">{lineStr}</span>
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

              {/* Action / Decision Footer matching TwelveLabs Theme */}
              <div className="pt-3 flex items-center justify-between gap-4 flex-wrap border-t border-[#E5E5EA]">
                {/* Keyboard Shortcuts Hint */}
                <div className="flex items-center gap-3.5 text-xs text-[#52525A]">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-2 py-0.5 rounded-md bg-[#18181B] text-white font-mono text-xs font-bold shadow-2xs">J</kbd>
                    <span className="font-medium text-[#27272A]">Previous</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-2 py-0.5 rounded-md bg-[#18181B] text-white font-mono text-xs font-bold shadow-2xs">K</kbd>
                    <span className="font-medium text-[#27272A]">Next</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-2 py-0.5 rounded-md bg-[#18181B] text-white font-mono text-xs font-bold shadow-2xs">A</kbd>
                    <span className="font-medium text-[#27272A]">Approve</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-2 py-0.5 rounded-md bg-[#18181B] text-white font-mono text-xs font-bold shadow-2xs">R</kbd>
                    <span className="font-medium text-[#27272A]">Reject</span>
                  </span>
                </div>

                {/* Approve & Reject Buttons (TwelveLabs Modern Styling) */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenReject}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      decisions[selectedPromo.pid] === 'reject'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-rose-100'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>{decisions[selectedPromo.pid] === 'reject' ? 'Rejected ✕' : 'Reject'}</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all cursor-pointer ${
                      decisions[selectedPromo.pid] === 'accept'
                        ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                        : 'bg-[#18181B] hover:bg-black'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{decisions[selectedPromo.pid] === 'accept' ? 'Approved ✓' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-[#8E8E93] font-mono text-xs">
              No candidate selected.
            </div>
          )}
        </div>
      </div>

      {/* Human Editorial Rejection Reason Modal (Feature 2) */}
      {rejectModalOpen && selectedPromo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-xl max-w-md w-full p-6 text-[#18181B] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#18181B] flex items-center gap-2">
                  <X className="w-4 h-4 text-red-600" />
                  Editorial Rejection Feedback
                </h3>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  Candidate #{selectedPromo.rank} · PID: {selectedPromo.pid} · Ep. {selectedPromo.segments[0]?.episode}
                </p>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-[#8E8E93] hover:text-[#18181B] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#52525A] mb-1.5">
                  Rejection Reason Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full text-xs bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-2.5 font-medium text-[#18181B] focus:outline-none focus:border-[#18181B] cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#52525A] mb-1.5">
                  Reviewer Notes / Critique <span className="text-[#8E8E93] font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this promo doesn't work for social feeds..."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  className="w-full text-xs bg-[#F8F8FA] border border-[#E5E5EA] rounded-xl p-3 text-[#18181B] placeholder-[#8E8E93] focus:outline-none focus:border-[#18181B] resize-none font-sans"
                />
              </div>

              <div className="p-3 bg-[#F8F8FA] rounded-xl border border-[#E5E5EA] text-[11px] text-[#71717A] leading-relaxed">
                <span className="font-semibold text-[#18181B]">Audit Separation:</span> Human editorial rejections are stored separately from automated validation failures in the Failure Analysis dashboard.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs text-[#71717A] hover:text-[#18181B] font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
