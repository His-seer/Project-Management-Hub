'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TriggerNodeData, ActionNodeData, ConditionNodeData, AgentNodeData } from '@/types/workflow';
import { Zap, Cog, GitBranch, Bot } from 'lucide-react';

// ─── Trigger Node ───
export const TriggerNode = memo(function TriggerNode({ data }: NodeProps) {
  const d = data as unknown as TriggerNodeData;
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 shadow-md min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={14} className="text-amber-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Trigger</span>
      </div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</div>
      {Object.keys(d.config || {}).length > 0 && (
        <div className="text-[10px] text-slate-500 mt-1">
          {Object.entries(d.config).map(([k, v]) => (
            <span key={k} className="mr-2">{k}: {String(v)}</span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
    </div>
  );
});

// ─── Action Node ───
export const ActionNode = memo(function ActionNode({ data }: NodeProps) {
  const d = data as unknown as ActionNodeData;
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600 shadow-md min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
      <div className="flex items-center gap-2 mb-1">
        <Cog size={14} className="text-indigo-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Action</span>
      </div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
    </div>
  );
});

// ─── Condition Node ───
export const ConditionNode = memo(function ConditionNode({ data }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600 shadow-md min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
      <div className="flex items-center gap-2 mb-1">
        <GitBranch size={14} className="text-emerald-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Condition</span>
      </div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</div>
      <div className="text-[10px] text-slate-500 mt-1">{d.field} {d.operator} {d.value}</div>
      <div className="flex justify-between mt-2">
        <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '30%' }} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
        <Handle type="source" position={Position.Bottom} id="no" style={{ left: '70%' }} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
      </div>
    </div>
  );
});

// ─── Agent Node ───
export const AgentNode = memo(function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-violet-400 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-600 shadow-md min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
      <div className="flex items-center gap-2 mb-1">
        <Bot size={14} className="text-violet-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">AI Agent</span>
      </div>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</div>
      <div className="text-[10px] text-slate-500 mt-1">{d.agentRole}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900" />
    </div>
  );
});

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  agent: AgentNode,
};
