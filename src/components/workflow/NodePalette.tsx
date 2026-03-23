'use client';

import { useState } from 'react';
import { TRIGGER_CATALOG, ACTION_CATALOG } from '@/types/workflow';
import { Zap, Cog, GitBranch, Bot, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string, data: Record<string, unknown>) => void;
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    triggers: true,
    actions: true,
    logic: true,
    agents: true,
  });

  const toggle = (section: string) =>
    setExpandedSections((s) => ({ ...s, [section]: !s[section] }));

  return (
    <div className="w-[220px] shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Node Palette</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">Drag nodes to the canvas</p>
      </div>

      {/* Triggers */}
      <Section
        title="Triggers"
        icon={<Zap size={13} className="text-amber-500" />}
        expanded={expandedSections.triggers}
        onToggle={() => toggle('triggers')}
      >
        {TRIGGER_CATALOG.map((t) => (
          <DraggableItem
            key={t.type}
            label={t.label}
            emoji={t.icon}
            description={t.description}
            onDragStart={(e) =>
              onDragStart(e, 'trigger', {
                nodeType: 'trigger',
                triggerType: t.type,
                label: t.label,
                config: {},
              })
            }
          />
        ))}
      </Section>

      {/* Actions */}
      <Section
        title="Actions"
        icon={<Cog size={13} className="text-indigo-500" />}
        expanded={expandedSections.actions}
        onToggle={() => toggle('actions')}
      >
        {ACTION_CATALOG.map((a) => (
          <DraggableItem
            key={a.type}
            label={a.label}
            emoji={a.icon}
            description={a.description}
            onDragStart={(e) =>
              onDragStart(e, 'action', {
                nodeType: 'action',
                actionType: a.type,
                label: a.label,
                config: {},
              })
            }
          />
        ))}
      </Section>

      {/* Logic */}
      <Section
        title="Logic"
        icon={<GitBranch size={13} className="text-emerald-500" />}
        expanded={expandedSections.logic}
        onToggle={() => toggle('logic')}
      >
        <DraggableItem
          label="If / Else"
          emoji="❓"
          description="Branch based on a condition"
          onDragStart={(e) =>
            onDragStart(e, 'condition', {
              nodeType: 'condition',
              label: 'If / Else',
              field: '',
              operator: 'greater_than',
              value: '',
            })
          }
        />
      </Section>

      {/* AI Agents */}
      <Section
        title="AI Agents"
        icon={<Bot size={13} className="text-violet-500" />}
        expanded={expandedSections.agents}
        onToggle={() => toggle('agents')}
      >
        {[
          { role: 'Risk Analyst', label: 'Risk Analyst', prompt: 'Analyze risks and suggest mitigations' },
          { role: 'Reporter', label: 'Reporter', prompt: 'Generate status reports and summaries' },
          { role: 'Planner', label: 'Planner', prompt: 'Break down goals into tasks and milestones' },
          { role: 'Stakeholder Advisor', label: 'Stakeholder Advisor', prompt: 'Recommend stakeholder engagement strategies' },
        ].map((agent) => (
          <DraggableItem
            key={agent.role}
            label={agent.label}
            emoji="🤖"
            description={agent.prompt}
            onDragStart={(e) =>
              onDragStart(e, 'agent', {
                nodeType: 'agent',
                agentRole: agent.role,
                label: agent.label,
                systemPrompt: agent.prompt,
              })
            }
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, icon, expanded, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        {icon}
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 text-left">{title}</span>
        {expanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
      </button>
      {expanded && <div className="pb-2 px-2 space-y-0.5">{children}</div>}
    </div>
  );
}

function DraggableItem({ label, emoji, description, onDragStart }: {
  label: string;
  emoji: string;
  description: string;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
      title={description}
    >
      <GripVertical size={10} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
      <span className="text-sm">{emoji}</span>
      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{label}</span>
    </div>
  );
}
