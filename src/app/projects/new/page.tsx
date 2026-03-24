'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { newProjectTourSteps, TOUR_KEYS } from '@/lib/tours';
const TourStarter = dynamic(() => import('@/components/tour/TourStarter').then((m) => ({ default: m.TourStarter })), { ssr: false });
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import apiFetch from '@/lib/apiFetch';
import { readSseStream, parseAiJson } from '@/lib/aiUtils';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Upload,
  Loader2,
  X,
  Lightbulb,
  Users,
  AlertTriangle,
  FileText,
  Wand2,
} from 'lucide-react';

const steps = ['Quick Start', 'Basic Info', 'Charter', 'Team Setup', 'Initial Risks', 'Review'];

interface AiProjectData {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  vision?: string;
  objectives?: string[];
  scope?: string;
  teamRoles?: { role: string; reason: string }[];
  risks?: { title: string; description: string }[];
}

export default function NewProjectWizard() {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);
  const updateModule = useProjectStore((s) => s.updateModule);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const [step, setStep] = useState(0);

  // AI Quick Start state
  const [aiPrompt, setAiPrompt] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiUsed, setAiUsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 2: Charter
  const [vision, setVision] = useState('');
  const [objectives, setObjectives] = useState('');
  const [scope, setScope] = useState('');
  const [charterLoading, setCharterLoading] = useState(false);

  // Step 3: Team
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string }[]>([
    { name: '', role: '' },
  ]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [suggestedRoles, setSuggestedRoles] = useState<{ role: string; reason: string }[]>([]);

  // Step 4: Jira
  const [jiraBoardId, setJiraBoardId] = useState('');
  const [jiraBoardName, setJiraBoardName] = useState('');

  // Step 5: Risks
  const [initialRisks, setInitialRisks] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
  ]);
  const [risksLoading, setRisksLoading] = useState(false);

  // ── AI Quick Start ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const text = await file.text();
    setAiPrompt(text.slice(0, 8000)); // cap at 8k chars
  };

  const runAiQuickStart = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await apiFetch('/api/ai/project/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, mode: 'full' }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const raw = await readSseStream(res);
      const data: AiProjectData = parseAiJson(raw);

      if (data.name) setName(data.name);
      if (data.description) setDescription(data.description);
      if (data.startDate) setStartDate(data.startDate);
      if (data.endDate) setEndDate(data.endDate);
      if (data.vision) setVision(data.vision);
      if (data.objectives?.length) setObjectives(data.objectives.join('\n'));
      if (data.scope) setScope(data.scope);
      if (data.teamRoles?.length) {
        setSuggestedRoles(data.teamRoles);
        const mapped = data.teamRoles.map((r) => ({ name: '', role: r.role }));
        setTeamMembers(mapped.length > 0 ? mapped : [{ name: '', role: '' }]);
      }
      if (data.risks?.length) {
        setInitialRisks(data.risks.slice(0, 5));
      }
      setAiUsed(true);
      setStep(1); // jump to Basic Info to review
    } catch {
      setAiError('AI failed to parse your project. Please try a different description.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Per-step AI helpers ─────────────────────────────────────────────────────
  const runCharterAi = async () => {
    if (!name && !description && !aiPrompt) return;
    setCharterLoading(true);
    try {
      const context = `Project: ${name}\nDescription: ${description}\nOriginal brief: ${aiPrompt}`;
      const res = await apiFetch('/api/ai/project/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: context, mode: 'charter' }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const raw = await readSseStream(res);
      const data: AiProjectData = parseAiJson(raw);
      if (data.vision) setVision(data.vision);
      if (data.objectives?.length) setObjectives(data.objectives.join('\n'));
      if (data.scope) setScope(data.scope);
    } catch {
      // silently fail — user can still type manually
    } finally {
      setCharterLoading(false);
    }
  };

  const runTeamAi = async () => {
    setTeamLoading(true);
    try {
      const context = `Project: ${name}\nDescription: ${description}\nVision: ${vision}\nScope: ${scope}`;
      const res = await apiFetch('/api/ai/project/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: context, mode: 'team' }),
      });
      if (!res.ok) throw new Error();
      const raw = await readSseStream(res);
      const data: AiProjectData = parseAiJson(raw);
      if (data.teamRoles?.length) {
        setSuggestedRoles(data.teamRoles);
        setTeamMembers(data.teamRoles.map((r) => ({ name: '', role: r.role })));
      }
    } catch {
      // silent
    } finally {
      setTeamLoading(false);
    }
  };

  const runRisksAi = async () => {
    setRisksLoading(true);
    try {
      const context = `Project: ${name}\nDescription: ${description}\nScope: ${scope}\nObjectives: ${objectives}`;
      const res = await apiFetch('/api/ai/project/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: context, mode: 'risks' }),
      });
      if (!res.ok) throw new Error();
      const raw = await readSseStream(res);
      const data: AiProjectData = parseAiJson(raw);
      if (data.risks?.length) {
        setInitialRisks(data.risks.slice(0, 5));
      }
    } catch {
      // silent
    } finally {
      setRisksLoading(false);
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return true; // Quick Start is always skippable
    if (step === 1) return name.trim() !== '' && startDate !== '' && endDate !== '';
    return true;
  };

  const handleCreate = () => {
    const projectId = addProject(name, description, startDate, endDate);

    if (vision || objectives || scope) {
      updateModule(projectId, 'charter', {
        documentVersion: '1.0',
        documentOwner: '',
        issueDate: '',
        executiveSummary: '',
        projectPurpose: '',
        vision,
        objectives: objectives.split('\n').filter(Boolean),
        businessObjectives: [],
        technologyObjectives: [],
        scope,
        outOfScope: '',
        assumptions: [],
        constraints: [],
        qualityStandards: [],
        qualityAssurance: '',
        successCriteria: [],
        sponsors: [],
        approvals: [],
        approvalDate: '',
      });
    }

    const resources = teamMembers
      .filter((m) => m.name.trim())
      .map((m, i) => ({
        id: `res-${i}`,
        name: m.name,
        role: m.role,
        email: '',
        allocationPercent: 100,
        costRate: 0,
        assignedTaskIds: [],
        availability: 'available' as const,
      }));
    if (resources.length > 0) {
      updateModule(projectId, 'resources', resources);
      updateModule(projectId, 'raci', {
        roles: resources.map((r) => ({ id: r.id, name: r.name, title: r.role })),
        activities: [],
        matrix: {},
      });
    }

    if (jiraBoardId) updateMeta(projectId, { jiraBoardId, jiraBoardName });

    const risks = initialRisks
      .filter((r) => r.title.trim())
      .map((r, i) => ({
        id: `risk-${i}`,
        title: r.title,
        description: r.description,
        category: 'General',
        probability: 3 as const,
        impact: 3 as const,
        severity: 9,
        owner: '',
        mitigationStrategy: '',
        contingencyPlan: '',
        status: 'open' as const,
        linkedWbsIds: [],
        linkedTaskIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    if (risks.length > 0) updateModule(projectId, 'risks', risks);

    router.push(`/projects/${projectId}`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <TourStarter steps={newProjectTourSteps} tourKey={TOUR_KEYS.NEW_PROJECT} />
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New Project</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Use AI Quick Start to fill everything in seconds, or fill manually step by step.
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8 flex-wrap" data-tour="wizard-steps">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i === 0
                    ? 'bg-purple-600 text-white'
                    : i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {i === 0 ? <Sparkles size={14} /> : i < step ? <Check size={14} /> : i}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${i < step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400 font-medium">{steps[step]}</span>
          {aiUsed && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
              <Sparkles size={10} /> AI-assisted
            </span>
          )}
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">

          {/* ── STEP 0: AI Quick Start ── */}
          {step === 0 && (
            <div className="space-y-5" data-tour="ai-quickstart">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Quick Start</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Describe your project in plain English or upload a brief doc. AI will fill in all the steps for you instantly.
                  </p>
                </div>
              </div>

              {/* What AI will fill */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: FileText, label: 'Project name & description' },
                  { icon: Lightbulb, label: 'Vision, objectives & scope' },
                  { icon: Users, label: 'Suggested team roles' },
                  { icon: AlertTriangle, label: 'Top 5 risks identified' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Icon size={14} className="text-purple-500 flex-shrink-0" />
                    <span className="text-xs text-purple-800 dark:text-purple-300">{label}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Describe your project
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="e.g. We are building a new e-commerce platform for a retail client. The project runs from April to September 2026. It involves redesigning the website, integrating payment systems, and migrating legacy data..."
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                <span className="text-xs text-gray-400">or upload a document</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              </div>

              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.text"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors text-sm text-gray-600 dark:text-gray-400"
                >
                  <Upload size={16} />
                  {uploadedFileName ? (
                    <span className="text-purple-600 dark:text-purple-400 font-medium">{uploadedFileName}</span>
                  ) : (
                    'Upload project brief (.txt, .md)'
                  )}
                </button>
              </div>

              {aiError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <X size={14} />
                  {aiError}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={runAiQuickStart}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {aiLoading ? 'Analysing your project...' : 'Generate with AI'}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Skip — fill manually
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
                {aiUsed && (
                  <span className="text-xs text-purple-500 dark:text-purple-400 flex items-center gap-1">
                    <Sparkles size={12} /> AI-filled — review & edit
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Website Redesign"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief project description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Charter ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Charter</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">You can expand with AI or fill in more details later.</p>
                </div>
                <button
                  onClick={runCharterAi}
                  disabled={charterLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {charterLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {charterLoading ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vision</label>
                <textarea
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What does success look like?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objectives (one per line)
                </label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Objective 1&#10;Objective 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scope</label>
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What's included in this project?"
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Team Setup ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Setup</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add names to AI-suggested roles, or customise freely.</p>
                </div>
                <button
                  onClick={runTeamAi}
                  disabled={teamLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {teamLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {teamLoading ? 'Suggesting...' : 'Suggest roles'}
                </button>
              </div>

              {/* Suggested role cards */}
              {suggestedRoles.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                    💡 AI recommended these roles for your project:
                  </p>
                  <div className="space-y-1">
                    {suggestedRoles.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-200 w-36 flex-shrink-0">
                          {r.role}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{r.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamMembers.map((m, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setTeamMembers(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                  <input
                    type="text"
                    value={m.role}
                    onChange={(e) => {
                      const updated = [...teamMembers];
                      updated[i] = { ...updated[i], role: e.target.value };
                      setTeamMembers(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Role (e.g., Dev Lead)"
                  />
                  {teamMembers.length > 1 && (
                    <button
                      onClick={() => setTeamMembers(teamMembers.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setTeamMembers([...teamMembers, { name: '', role: '' }])}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add member
              </button>
            </div>
          )}

          {/* ── STEP 4: Risks ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Initial Risk Assessment</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Identify top risks upfront. AI can suggest them based on your project.</p>
                </div>
                <button
                  onClick={runRisksAi}
                  disabled={risksLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {risksLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {risksLoading ? 'Identifying...' : 'Suggest risks'}
                </button>
              </div>

              {initialRisks.map((r, i) => (
                <div key={i} className="space-y-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg relative">
                  {initialRisks.length > 1 && (
                    <button
                      onClick={() => setInitialRisks(initialRisks.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <input
                    type="text"
                    value={r.title}
                    onChange={(e) => {
                      const updated = [...initialRisks];
                      updated[i] = { ...updated[i], title: e.target.value };
                      setInitialRisks(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Risk ${i + 1} title`}
                  />
                  <input
                    type="text"
                    value={r.description}
                    onChange={(e) => {
                      const updated = [...initialRisks];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setInitialRisks(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Impact / likelihood description"
                  />
                </div>
              ))}
              {initialRisks.length < 5 && (
                <button
                  onClick={() => setInitialRisks([...initialRisks, { title: '', description: '' }])}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add risk
                </button>
              )}
            </div>
          )}

          {/* ── STEP 5: Review ── */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Create</h2>
              <div className="space-y-3">
                <ReviewItem label="Project Name" value={name} />
                <ReviewItem label="Description" value={description || '—'} />
                <ReviewItem label="Dates" value={`${startDate} → ${endDate}`} />
                <ReviewItem label="Vision" value={vision || '—'} />
                <ReviewItem
                  label="Objectives"
                  value={
                    objectives
                      ? objectives
                          .split('\n')
                          .filter(Boolean)
                          .map((o, i) => `${i + 1}. ${o}`)
                          .join('\n')
                      : '—'
                  }
                />
                <ReviewItem
                  label="Team"
                  value={
                    teamMembers.filter((m) => m.name).length > 0
                      ? teamMembers
                          .filter((m) => m.name)
                          .map((m) => `${m.name} (${m.role})`)
                          .join(', ')
                      : '—'
                  }
                />
                <ReviewItem
                  label="Initial Risks"
                  value={
                    initialRisks.filter((r) => r.title).length > 0
                      ? initialRisks
                          .filter((r) => r.title)
                          .map((r, i) => `${i + 1}. ${r.title}`)
                          .join('\n')
                      : 'None'
                  }
                />
              </div>
              {aiUsed && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-700 dark:text-purple-300">
                  <Sparkles size={12} />
                  This project was set up with AI assistance. All fields are editable — go back to make changes.
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <span className="text-xs text-gray-400">Step {step + 1} of {steps.length}</span>

          {step < steps.length - 1 ? (
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Check size={16} />
              Create Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-white whitespace-pre-line">{value}</span>
    </div>
  );
}
