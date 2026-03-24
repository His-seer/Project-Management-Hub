'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { learningTourSteps, TOUR_KEYS } from '@/lib/tours';
const TourStarter = dynamic(() => import('@/components/tour/TourStarter').then((m) => ({ default: m.TourStarter })), { ssr: false });
import {
  CATEGORIES,
  RESOURCES,
  LEARNING_PATHS,
  type ResourceCategory,
  type LearningResource,
} from '@/lib/pmResources';
import { parseAiJson, readSseStream } from '@/lib/aiUtils';
import { generateId } from '@/lib/ids';
import apiFetch from '@/lib/apiFetch';
import Link from 'next/link';
import {
  GraduationCap,
  ExternalLink,
  BookOpen,
  Video,
  Brain,
  FileText,
  Users,
  Wrench,
  Award,
  ChevronDown,
  ChevronRight,
  Clock,
  Search,
  Filter,
  Youtube,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Loader2,
  Play,
} from 'lucide-react';

// ── YouTube search result type ──
interface YTResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

// ── Bookmark type ──
interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  youtube_id?: string;
  description: string;
  provider: string;
  category: string;
  thumbnail: string;
  created_at: string;
}

// ── AI Recommendation type ──
interface AiRecommendation {
  topic: string;
  priority: string;
  reason: string;
  suggestedResources: string[];
  youtubeSearchTerms: string[];
}

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  course: BookOpen,
  article: FileText,
  video: Video,
  guide: FileText,
  tool: Wrench,
  community: Users,
  'practice-exam': Award,
  book: BookOpen,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function LearnPage() {
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all' | 'paths' | 'youtube' | 'ai-recs' | 'bookmarks'>('paths');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPath, setExpandedPath] = useState<string | null>(LEARNING_PATHS[0]?.id ?? null);

  // YouTube search
  const [ytQuery, setYtQuery] = useState('');
  const [ytResults, setYtResults] = useState<YTResult[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytPlayingId, setYtPlayingId] = useState<string | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // AI Recommendations
  const [aiRecs, setAiRecs] = useState<{ analysis: string; recommendations: AiRecommendation[] } | null>(null);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [aiRecsError, setAiRecsError] = useState('');

  // AI Resource Search
  const [aiSearchResults, setAiSearchResults] = useState<LearningResource[]>([]);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState('');

  // Load bookmarks on mount
  useEffect(() => {
    apiFetch('/api/bookmarks?userId=default')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBookmarks(data);
          setBookmarkIds(new Set(data.map((b: BookmarkItem) => b.youtube_id || b.url)));
        }
      })
      .catch(() => {});
  }, []);

  const searchYoutube = async () => {
    if (!ytQuery.trim()) return;
    setYtLoading(true);
    try {
      const res = await apiFetch(`/api/youtube?q=${encodeURIComponent(ytQuery)}&max=8`);
      const data = await res.json();
      setYtResults(data.results ?? []);
    } catch { setYtResults([]); }
    finally { setYtLoading(false); }
  };

  const addBookmark = async (item: { title: string; url: string; youtubeId?: string; description?: string; provider?: string; thumbnail?: string }) => {
    const id = generateId();
    const bookmark = { id, userId: 'default', title: item.title, url: item.url, youtubeId: item.youtubeId, description: item.description, provider: item.provider, category: 'saved', thumbnail: item.thumbnail };
    try {
      await apiFetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookmark) });
      setBookmarks((prev) => [{ ...bookmark, youtube_id: item.youtubeId, created_at: new Date().toISOString() } as BookmarkItem, ...prev]);
      setBookmarkIds((prev) => new Set([...prev, item.youtubeId || item.url]));
    } catch {}
  };

  const removeBookmark = async (id: string, key: string) => {
    try {
      await apiFetch('/api/bookmarks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      setBookmarkIds((prev) => { const s = new Set(prev); s.delete(key); return s; });
    } catch {}
  };

  const fetchAiRecommendations = async () => {
    setAiRecsLoading(true);
    setAiRecsError('');
    try {
      const historyRes = await apiFetch('/api/quiz?userId=default');
      const history = await historyRes.json();
      if (!Array.isArray(history) || history.length === 0) {
        setAiRecsError('Take at least one quiz first so the AI can analyze your weak areas.');
        return;
      }
      const res = await apiFetch('/api/learn/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizHistory: history.slice(0, 10) }),
      });
      const raw = await readSseStream(res);
      const data = parseAiJson<{ analysis: string; recommendations: AiRecommendation[] }>(raw);
      setAiRecs(data);
    } catch (err) {
      setAiRecsError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally { setAiRecsLoading(false); }
  };

  const searchAiResources = async (query: string) => {
    if (!query.trim()) return;
    setAiSearchLoading(true);
    setAiSearchQuery(query);
    try {
      const res = await apiFetch('/api/learn/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const raw = await readSseStream(res);
      const results = parseAiJson<Array<LearningResource & { estimatedMinutes?: number }>>(raw);
      setAiSearchResults(results.map((r) => ({
        ...r,
        id: generateId(),
        category: 'pm-fundamentals' as ResourceCategory,
        isFree: true,
        tags: [],
        durationMinutes: r.estimatedMinutes,
      })));
    } catch { setAiSearchResults([]); }
    finally { setAiSearchLoading(false); }
  };

  const isSpecialTab = ['paths', 'ai-recs', 'bookmarks'].includes(activeCategory);
  const filteredResources = RESOURCES.filter((r) => {
    if (isSpecialTab) return false;
    if (activeCategory !== 'all' && activeCategory !== 'youtube' && r.category !== activeCategory) return false;
    if (activeCategory === 'youtube' && r.category !== 'youtube') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)) ||
        r.provider.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Deduplicate by URL (some resources appear in multiple categories)
  const seenUrls = new Set<string>();
  const deduped = filteredResources.filter((r) => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <TourStarter steps={learningTourSteps} tourKey={TOUR_KEYS.LEARNING} />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <GraduationCap size={28} className="text-indigo-500" />
          PM Learning Hub
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Free resources to grow your project management skills. AI makes you productive — learning makes you exceptional.
        </p>
      </div>

      {/* Quiz Banner */}
      <Link href="/learn/quiz" data-tour="quiz-link" className="block mb-6 pm-card p-4 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Brain size={20} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Test Your Knowledge</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Take practice quizzes for PMP, CAPM, Agile, and PM fundamentals. Track your progress over time.</p>
            </div>
          </div>
          <span className="text-indigo-500 text-sm font-medium shrink-0">Start Quiz →</span>
        </div>
      </Link>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveCategory('all'); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) searchAiResources(searchQuery); }}
            placeholder="Search any PM topic — AI finds resources across the web..."
            className="field-input pl-9 w-full"
          />
        </div>
        <button
          onClick={() => searchAiResources(searchQuery)}
          disabled={!searchQuery.trim() || aiSearchLoading}
          className="btn-primary disabled:opacity-50 shrink-0"
        >
          {aiSearchLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          AI Search
        </button>
      </div>

      {/* AI Search Results */}
      {aiSearchResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              AI found resources for &ldquo;{aiSearchQuery}&rdquo;
            </h3>
            <button onClick={() => setAiSearchResults([])} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiSearchResults.map((res) => (
              <ResourceCard key={res.id} resource={res} />
            ))}
          </div>
        </div>
      )}

      {aiSearchLoading && (
        <div className="mb-6 pm-card p-6 text-center">
          <Loader2 size={20} className="mx-auto mb-2 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">AI is finding the best resources for &ldquo;{searchQuery}&rdquo;...</p>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton
          active={activeCategory === 'paths'}
          onClick={() => { setActiveCategory('paths'); setSearchQuery(''); }}
          label="🗺️ Learning Paths"
        />
        <TabButton
          active={activeCategory === 'all'}
          onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
          label="📋 All Resources"
        />
        <TabButton
          active={activeCategory === 'youtube'}
          onClick={() => setActiveCategory('youtube')}
          label="🎥 Video Search"
        />
        <TabButton
          active={activeCategory === 'ai-recs'}
          onClick={() => { setActiveCategory('ai-recs'); if (!aiRecs && !aiRecsLoading) fetchAiRecommendations(); }}
          label="✨ AI For You"
        />
        <TabButton
          active={activeCategory === 'bookmarks'}
          onClick={() => setActiveCategory('bookmarks')}
          label={`🔖 Saved (${bookmarks.length})`}
        />
        {CATEGORIES.map((cat) => (
          <TabButton
            key={cat.id}
            active={activeCategory === cat.id}
            onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
            label={`${cat.icon} ${cat.label}`}
          />
        ))}
      </div>

      {/* ── Video Search (inside youtube category tab) ── */}

      {/* ── AI Recommendations ── */}
      {activeCategory === 'ai-recs' && (
        <div className="space-y-4" data-tour="ai-recommendations">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500" /> Personalized Recommendations
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Based on your quiz performance — the AI identifies your weak areas and suggests targeted resources.</p>
            </div>
            <button onClick={fetchAiRecommendations} disabled={aiRecsLoading} className="btn-secondary text-xs disabled:opacity-50">
              {aiRecsLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Refresh
            </button>
          </div>

          {aiRecsError && <div className="pm-card p-4 border-amber-300 text-sm text-amber-700 dark:text-amber-400">{aiRecsError}</div>}

          {aiRecsLoading && (
            <div className="pm-card p-8 text-center">
              <Loader2 size={24} className="mx-auto mb-2 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">Analyzing your quiz performance...</p>
            </div>
          )}

          {aiRecs && !aiRecsLoading && (
            <>
              <div className="pm-card p-4 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-slate-700 dark:text-slate-300">{aiRecs.analysis}</p>
              </div>

              {aiRecs.recommendations.map((rec, i) => (
                <div key={i} className="pm-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : rec.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>{rec.priority} priority</span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{rec.topic}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{rec.reason}</p>
                  {rec.suggestedResources.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Suggested Resources:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rec.suggestedResources.map((r, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rec.youtubeSearchTerms.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Search YouTube for:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rec.youtubeSearchTerms.map((term, j) => (
                          <button
                            key={j}
                            onClick={() => { setActiveCategory('youtube'); setYtQuery(term); setYtLoading(true); apiFetch(`/api/youtube?q=${encodeURIComponent(term)}&max=8`).then(r => r.json()).then(d => setYtResults(d.results ?? [])).finally(() => setYtLoading(false)); }}
                            className="text-[10px] px-2 py-0.5 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                          >
                            🎥 {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Bookmarks ── */}
      {activeCategory === 'bookmarks' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bookmark size={18} className="text-indigo-500" /> Saved Resources
          </h2>

          {bookmarks.length === 0 ? (
            <div className="pm-card p-8 text-center">
              <Bookmark size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No saved resources yet.</p>
              <p className="text-xs text-slate-400 mt-1">Search for videos or browse resources and click the bookmark icon to save them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bookmarks.map((b) => (
                <div key={b.id} className="pm-card overflow-hidden group">
                  {b.youtube_id && (
                    <button onClick={() => setYtPlayingId(ytPlayingId === b.youtube_id ? null : b.youtube_id!)} className="relative w-full block" style={{ paddingBottom: '56.25%' }}>
                      {ytPlayingId === b.youtube_id ? (
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${b.youtube_id}?autoplay=1`}
                          title={b.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <>
                          <img src={b.thumbnail || `https://img.youtube.com/vi/${b.youtube_id}/maxresdefault.jpg`} alt={b.title} className="absolute top-0 left-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center"><Play size={20} fill="white" className="text-white ml-0.5" /></div>
                          </div>
                        </>
                      )}
                    </button>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{b.title}</h3>
                    {b.provider && <p className="text-[10px] text-slate-400 mt-0.5">{b.provider}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1">
                        <ExternalLink size={10} /> Open
                      </a>
                      <button onClick={() => removeBookmark(b.id, b.youtube_id || b.url)} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1">
                        <Trash2 size={10} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learning Paths */}
      {activeCategory === 'paths' && (
        <div className="space-y-4 mb-8" data-tour="learning-paths">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            🗺️ Guided Learning Paths
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Step-by-step roadmaps to build your PM skills and earn certifications.
          </p>

          {LEARNING_PATHS.map((path) => {
            const isExpanded = expandedPath === path.id;
            const totalHours = path.steps.reduce((s, step) => s + step.estimatedHours, 0);
            return (
              <div key={path.id} className="pm-card overflow-hidden">
                <button
                  onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{path.icon}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{path.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{path.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      ~{totalHours}h
                    </span>
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 px-4 pb-4">
                    {path.steps.map((step, i) => (
                      <div key={i} className="mt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">{step.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.description}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock size={10} className="text-slate-400" />
                              <span className="text-[10px] text-slate-400">~{step.estimatedHours}h</span>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {step.resourceIds.map((rid) => {
                                const res = RESOURCES.find((r) => r.id === rid);
                                if (!res) return null;
                                return <ResourceCard key={rid} resource={res} compact />;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resource Grid */}
      {!isSpecialTab && (
        <div>
          {activeCategory !== 'all' && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {CATEGORIES.find((c) => c.id === activeCategory)?.icon}{' '}
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {CATEGORIES.find((c) => c.id === activeCategory)?.description}
              </p>
            </div>
          )}

          {/* YouTube search bar — shown inside the Video Learning category */}
          {activeCategory === 'youtube' && (
            <div className="space-y-3 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-lg">
                  <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                  <input
                    type="text"
                    value={ytQuery}
                    onChange={(e) => setYtQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchYoutube()}
                    placeholder="Search PM videos... (e.g., risk management, agile scrum)"
                    className="field-input pl-9 w-full"
                  />
                </div>
                <button onClick={searchYoutube} disabled={ytLoading || !ytQuery.trim()} className="btn-primary disabled:opacity-50">
                  {ytLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Search
                </button>
                {ytResults.length > 0 && (
                  <button onClick={() => { setYtResults([]); setYtQuery(''); setYtPlayingId(null); }} className="btn-secondary">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['PMP exam prep', 'Scrum basics', 'Risk management', 'Earned value', 'Stakeholder engagement', 'Agile vs Waterfall', 'WBS tutorial', 'Critical path method'].map((term) => (
                  <button
                    key={term}
                    onClick={() => { setYtQuery(term); setYtLoading(true); apiFetch(`/api/youtube?q=${encodeURIComponent(term)}&max=8`).then(r => r.json()).then(d => setYtResults(d.results ?? [])).finally(() => setYtLoading(false)); }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* YouTube search results */}
              {ytResults.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ytResults.length} results for &ldquo;{ytQuery}&rdquo;</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ytResults.map((v) => (
                      <div key={v.id} className="pm-card overflow-hidden group">
                        {ytPlayingId === v.id ? (
                          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe className="absolute top-0 left-0 w-full h-full" src={`https://www.youtube.com/embed/${v.id}?autoplay=1`} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                          </div>
                        ) : (
                          <button onClick={() => setYtPlayingId(v.id)} className="relative w-full block" style={{ paddingBottom: '56.25%' }}>
                            <img src={v.thumbnail} alt={v.title} className="absolute top-0 left-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play size={20} fill="white" className="text-white ml-0.5" />
                              </div>
                            </div>
                          </button>
                        )}
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{v.title}</h3>
                          <p className="text-[10px] text-slate-400 mt-1">{v.channelTitle} · {new Date(v.publishedAt).toLocaleDateString()}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"><ExternalLink size={10} /> YouTube</a>
                            <button
                              onClick={() => bookmarkIds.has(v.id) ? removeBookmark(bookmarks.find(b => b.youtube_id === v.id)?.id ?? '', v.id) : addBookmark({ title: v.title, url: `https://www.youtube.com/watch?v=${v.id}`, youtubeId: v.id, description: v.description, provider: v.channelTitle, thumbnail: v.thumbnail })}
                              className={`text-[10px] flex items-center gap-1 ${bookmarkIds.has(v.id) ? 'text-indigo-500' : 'text-slate-400 hover:text-indigo-500'}`}
                            >
                              {bookmarkIds.has(v.id) ? <BookmarkCheck size={10} /> : <Bookmark size={10} />}
                              {bookmarkIds.has(v.id) ? 'Saved' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Curated Video Channels</h3>
                  </div>
                </>
              )}
            </div>
          )}

          {deduped.length === 0 && ytResults.length === 0 ? (
            <div className="pm-card p-8 text-center">
              <Search size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No resources found. Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deduped.map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer inspiration */}
      <div className="mt-12 text-center border-t border-slate-200 dark:border-slate-700 pt-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          &ldquo;The best project managers never stop learning.&rdquo;
        </p>
        <p className="text-xs text-slate-400 mt-1">
          AI amplifies your capabilities — but knowledge is what makes you irreplaceable.
        </p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function ResourceCard({ resource: r, compact = false }: { resource: LearningResource; compact?: boolean }) {
  const Icon = TYPE_ICONS[r.type] || FileText;
  const [showVideo, setShowVideo] = useState(false);

  if (compact) {
    return (
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
      >
        <Icon size={14} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">{r.title}</span>
        <span className="text-[9px] text-slate-400">{r.provider}</span>
        <ExternalLink size={10} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
      </a>
    );
  }

  return (
    <div className="pm-card hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group overflow-hidden">
      {/* Embedded YouTube video */}
      {r.youtubeId && showVideo && (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${r.youtubeId}?autoplay=1`}
            title={r.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* YouTube thumbnail (click to play) */}
      {r.youtubeId && !showVideo && (
        <button
          onClick={() => setShowVideo(true)}
          className="relative w-full block group/thumb"
          style={{ paddingBottom: '56.25%' }}
        >
          <img
            src={`https://img.youtube.com/vi/${r.youtubeId}/maxresdefault.jpg`}
            alt={r.title}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/40 flex items-center justify-center transition-colors">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1"><polygon points="5,3 19,12 5,21" /></svg>
            </div>
          </div>
          {r.durationMinutes && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
              {r.durationMinutes}min
            </span>
          )}
        </button>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
              {r.title}
            </h3>
          </div>
          <a href={r.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} className="text-slate-300 hover:text-indigo-400 shrink-0 mt-0.5" />
          </a>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{r.description}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{r.provider}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded ${DIFFICULTY_COLORS[r.difficulty]}`}>
            {r.difficulty}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{r.type}</span>
          {r.isFree && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">FREE</span>}
          {r.durationMinutes && !r.youtubeId && <span className="text-[10px] text-slate-400">{r.durationMinutes}min</span>}
        </div>
      </div>
    </div>
  );
}
