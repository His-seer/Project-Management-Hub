'use client';

import { useState } from 'react';
import { useAtlassianStore } from '@/stores/useAtlassianStore';
import { useAiStore, ANTHROPIC_MODELS, GOOGLE_MODELS, OPENAI_MODELS } from '@/stores/useAiStore';
import type { AiProvider } from '@/stores/useAiStore';
import { DataManagement } from '@/components/shared/DataManagement';
import { Settings, Link2, Unlink, Bot } from 'lucide-react';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  openai: 'OpenAI',
};

const PROVIDER_ENV_VARS: Record<AiProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  openai: 'OPENAI_API_KEY',
};

const PROVIDER_MODELS: Record<AiProvider, { value: string; label: string }[]> = {
  anthropic: ANTHROPIC_MODELS,
  google: GOOGLE_MODELS,
  openai: OPENAI_MODELS,
};

export default function SettingsPage() {
  const atlassian = useAtlassianStore();
  const [baseUrl, setBaseUrl] = useState(atlassian.baseUrl);
  const [email, setEmail] = useState(atlassian.email);
  const [apiToken, setApiToken] = useState(atlassian.apiToken);

  const ai = useAiStore();

  const handleSaveAtlassian = () => {
    atlassian.setCredentials(baseUrl, email, apiToken);
  };

  const selectedModel =
    ai.provider === 'anthropic'
      ? ai.anthropicModel
      : ai.provider === 'google'
      ? ai.googleModel
      : ai.openaiModel;

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

      {/* AI Provider */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Bot size={18} />
          AI Provider
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose which AI provider powers the AI features in this app. Preferences are saved
          automatically.
        </p>

        {/* Provider segmented control */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
          {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => ai.setProvider(p)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                ai.provider === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Model dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => ai.setModel(ai.provider, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {PROVIDER_MODELS[ai.provider].map((m) => (
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
              {PROVIDER_ENV_VARS[ai.provider]}
            </code>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Add your key to <code className="font-mono">.env.local</code> to enable this provider.
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
