'use client';

import { useState } from 'react';
import { useAtlassianStore } from '@/stores/useAtlassianStore';
import Link from 'next/link';
import { BookOpen, Search, ExternalLink, Plus, Settings, RefreshCw } from 'lucide-react';

interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  spaceName: string;
  url: string;
  lastModified: string;
}

export default function ConfluenceHubPage() {
  const { baseUrl, email, apiToken, isConfigured } = useAtlassianStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConfluencePage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkedPages, setLinkedPages] = useState<ConfluencePage[]>([]);
  const [pageContent, setPageContent] = useState<{ id: string; title: string; html: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSpaceKey, setNewSpaceKey] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isConfigured) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><BookOpen size={24} /> Confluence Hub</h1>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 max-w-lg">
          <p className="text-amber-800 dark:text-amber-300 mb-3">Connect your Atlassian account to enable Confluence integration.</p>
          <Link href="/settings" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Settings size={16} /> Go to Settings</Link>
        </div>
      </div>
    );
  }

  const headers: Record<string, string> = { 'x-confluence-base-url': baseUrl, 'x-confluence-email': email, 'x-confluence-token': apiToken };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/confluence/search?q=${encodeURIComponent(query)}`, { headers });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResults(json.pages);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Search failed'); }
    finally { setLoading(false); }
  };

  const handleViewPage = async (pageId: string) => {
    try {
      const res = await fetch(`/api/confluence/pages/${pageId}`, { headers });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setPageContent({ id: json.id, title: json.title, html: json.content });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load page'); }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSpaceKey.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/confluence/pages', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, spaceKey: newSpaceKey }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setShowCreate(false); setNewTitle('');
      setLinkedPages([...linkedPages, { id: json.id, title: json.title, spaceKey: newSpaceKey, spaceName: '', url: `${baseUrl}/wiki/spaces/${newSpaceKey}/pages/${json.id}`, lastModified: new Date().toISOString() }]);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Create failed'); }
    finally { setCreating(false); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><BookOpen size={24} /> Confluence Hub</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={14} /> Create Page</button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{error}</div>}

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Search Confluence</h2>
        <div className="flex gap-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search pages..." className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <button onClick={handleSearch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Search
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{page.title}</p><p className="text-xs text-gray-500">{page.spaceName} ({page.spaceKey})</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleViewPage(page.id)} className="text-xs text-blue-600 hover:underline">Preview</button>
                  <button onClick={() => { if (!linkedPages.find(p => p.id === page.id)) setLinkedPages([...linkedPages, page]); }} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded hover:bg-blue-100">Link</button>
                  <a href={page.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-gray-400 hover:text-gray-600" /></a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Pages */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Linked Pages ({linkedPages.length})</h2>
        {linkedPages.length === 0 ? (
          <p className="text-sm text-gray-400">No pages linked yet. Search and link pages above.</p>
        ) : (
          <div className="space-y-2">
            {linkedPages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{page.title}</p><p className="text-xs text-gray-500">{page.spaceKey}</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleViewPage(page.id)} className="text-xs text-blue-600 hover:underline">Preview</button>
                  <a href={page.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-gray-400" /></a>
                  <button onClick={() => setLinkedPages(linkedPages.filter(p => p.id !== page.id))} className="text-xs text-red-500">Unlink</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page Preview */}
      {pageContent && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pageContent.title}</h2>
            <button onClick={() => setPageContent(null)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
          </div>
          <div className="prose dark:prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: pageContent.html }} />
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Confluence Page</h2>
            <div className="space-y-3">
              <input type="text" value={newSpaceKey} onChange={(e) => setNewSpaceKey(e.target.value)} placeholder="Space key (e.g., PROJ)" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Page title" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newTitle || !newSpaceKey} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
