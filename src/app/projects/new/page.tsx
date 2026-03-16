'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const steps = [
  'Basic Info',
  'Charter',
  'Team Setup',
  'Jira Board',
  'Initial Risks',
  'Review',
];

export default function NewProjectWizard() {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);
  const updateModule = useProjectStore((s) => s.updateModule);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const [step, setStep] = useState(0);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 2: Charter
  const [vision, setVision] = useState('');
  const [objectives, setObjectives] = useState('');
  const [scope, setScope] = useState('');

  // Step 3: Team
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string }[]>([
    { name: '', role: '' },
  ]);

  // Step 4: Jira
  const [jiraBoardId, setJiraBoardId] = useState('');
  const [jiraBoardName, setJiraBoardName] = useState('');

  // Step 5: Risks
  const [initialRisks, setInitialRisks] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
  ]);

  const canNext = () => {
    if (step === 0) return name.trim() !== '' && startDate !== '' && endDate !== '';
    return true;
  };

  const handleCreate = () => {
    const projectId = addProject(name, description, startDate, endDate);

    // Save charter
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

    // Save team as resources
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
    }

    // Save RACI seed from team
    if (resources.length > 0) {
      updateModule(projectId, 'raci', {
        roles: resources.map((r) => ({ id: r.id, name: r.name, title: r.role })),
        activities: [],
        matrix: {},
      });
    }

    // Save Jira board link
    if (jiraBoardId) {
      updateMeta(projectId, { jiraBoardId, jiraBoardName });
    }

    // Save initial risks
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
    if (risks.length > 0) {
      updateModule(projectId, 'risks', risks);
    }

    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Project</h1>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    i < step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">{steps[step]}</span>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
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
                rows={2}
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

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Charter</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">You can fill in more details later in the Charter module.</p>
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
                rows={3}
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

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Setup</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add team members. They will seed your RACI matrix.</p>
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
                  placeholder="Name"
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
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
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

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Link Jira Board</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Optional. Connect your Jira board to sync sprints and issues. You can configure Atlassian credentials in Settings.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jira Board ID
              </label>
              <input
                type="text"
                value={jiraBoardId}
                onChange={(e) => setJiraBoardId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 42"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Board Name
              </label>
              <input
                type="text"
                value={jiraBoardName}
                onChange={(e) => setJiraBoardName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., My Scrum Board"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Initial Risk Assessment</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Identify your top risks upfront. You can add more later.</p>
            {initialRisks.map((r, i) => (
              <div key={i} className="space-y-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                  placeholder="Description / impact"
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

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Create</h2>
            <div className="space-y-3">
              <ReviewItem label="Project Name" value={name} />
              <ReviewItem label="Description" value={description || '—'} />
              <ReviewItem label="Dates" value={`${startDate} → ${endDate}`} />
              <ReviewItem label="Vision" value={vision || '—'} />
              <ReviewItem label="Objectives" value={objectives || '—'} />
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
              <ReviewItem label="Jira Board" value={jiraBoardName || 'Not linked'} />
              <ReviewItem
                label="Initial Risks"
                value={
                  initialRisks.filter((r) => r.title).length > 0
                    ? initialRisks
                        .filter((r) => r.title)
                        .map((r) => r.title)
                        .join(', ')
                    : 'None'
                }
              />
            </div>
          </div>
        )}
        </div>{/* end step content */}
      </div>{/* end scrollable area */}

      {/* Sticky Navigation Footer */}
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
    <div className="flex items-start gap-3">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900 dark:text-white whitespace-pre-line">{value}</span>
    </div>
  );
}
