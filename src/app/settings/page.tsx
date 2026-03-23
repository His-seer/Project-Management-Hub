'use client';

import { useState } from 'react';
import { useAtlassianStore } from '@/stores/useAtlassianStore';
import { useAiStore, GOOGLE_MODELS } from '@/stores/useAiStore';
import { DataManagement } from '@/components/shared/DataManagement';
import { Settings, Link2, Unlink, Bot } from 'lucide-react';

export default function SettingsPage() {
  const atlassian = useAtlassianStore();
  const [baseUrl, setBaseUrl] = useState(atlassian.baseUrl);
  const [email, setEmail] = useState(atlassian.email);
  const [apiToken, setApiToken] = useState(atlassian.apiToken);

  const ai = useAiStore();

  const handleSaveAtlassian = () => {
    atlassian.setCredentials(baseUrl, email, apiToken);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Settings size={24} />
        Settings
      </h1>

      {/* Atlassian Credentials */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Link2 size={18} />
          Atlassian Integration
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Connect to Jira and Confluence. Create an API token at{' '}
          <span className="text-blue-600">id.atlassian.com/manage-profile/security/api-tokens</span>
        </p>

        {atlassian.isConfigured && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400 flex items-center justify-between">
            <span>Connected to {atlassian.baseUrl}</span>
            <button
              onClick={() => atlassian.clearCredentials()}
              className="flex items-center gap-1 text-red-500 hover:text-red-700"
            >
              <Unlink size={14} />
              Disconnect
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Atlassian Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="https://your-domain.atlassian.net"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Token
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Your Atlassian API token"
            />
          </div>
          <button
            onClick={handleSaveAtlassian}
            disabled={!baseUrl || !email || !apiToken}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            Save Credentials
          </button>
        </div>
      </div>

      {/* AI Model */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Bot size={18} />
          AI Model
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose which Gemini model powers the AI features. Preferences are saved automatically.
        </p>

        {/* Model dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model
          </label>
          <select
            value={ai.model}
            onChange={(e) => ai.setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {GOOGLE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* API key hint */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Required env var:{' '}
            <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
              GOOGLE_API_KEY
            </code>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Add your key to <code className="font-mono">.env.local</code> or Vercel environment variables.
          </p>
        </div>
      </div>

      {/* Data Export/Import */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Data Management</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Export all projects as a JSON backup or import from a previous backup file.
        </p>
        <DataManagement />
      </div>
    </div>
  );
}
