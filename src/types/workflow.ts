/**
 * Workflow automation types for the visual workflow builder.
 */

export type TriggerType =
  | 'risk_added'
  | 'risk_score_above'
  | 'issue_added'
  | 'issue_blocked'
  | 'milestone_missed'
  | 'milestone_due_soon'
  | 'meeting_saved'
  | 'budget_threshold'
  | 'task_overdue'
  | 'weekly_schedule'
  | 'daily_schedule'
  | 'manual';

export type ActionType =
  | 'ai_analyze'
  | 'ai_generate_report'
  | 'ai_suggest_mitigation'
  | 'ai_extract_actions'
  | 'add_risk'
  | 'add_issue'
  | 'add_action_item'
  | 'update_module'
  | 'notify'
  | 'send_to_chat';

export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';

export interface WorkflowTriggerConfig {
  type: TriggerType;
  label: string;
  description: string;
  icon: string;
  color: string;
  params?: Record<string, { type: 'string' | 'number' | 'select'; label: string; options?: string[] }>;
}

export interface WorkflowActionConfig {
  type: ActionType;
  label: string;
  description: string;
  icon: string;
  color: string;
  params?: Record<string, { type: 'string' | 'number' | 'select'; label: string; options?: string[] }>;
}

export interface WorkflowConditionConfig {
  field: string;
  operator: ConditionOperator;
  value: string | number;
}

// Node data stored in React Flow
export interface TriggerNodeData {
  [key: string]: unknown;
  nodeType: 'trigger';
  triggerType: TriggerType;
  label: string;
  config: Record<string, unknown>;
}

export interface ActionNodeData {
  [key: string]: unknown;
  nodeType: 'action';
  actionType: ActionType;
  label: string;
  config: Record<string, unknown>;
}

export interface ConditionNodeData {
  [key: string]: unknown;
  nodeType: 'condition';
  label: string;
  field: string;
  operator: ConditionOperator;
  value: string | number;
}

export interface AgentNodeData {
  [key: string]: unknown;
  nodeType: 'agent';
  agentRole: string;
  label: string;
  systemPrompt: string;
}

export type WorkflowNodeData = TriggerNodeData | ActionNodeData | ConditionNodeData | AgentNodeData;

// Persisted workflow
export interface Workflow {
  id: string;
  name: string;
  description: string;
  projectId: string;
  enabled: boolean;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// Catalog of available nodes
export const TRIGGER_CATALOG: WorkflowTriggerConfig[] = [
  { type: 'risk_added', label: 'Risk Added', description: 'When a new risk is added to the register', icon: '🔴', color: '#ef4444' },
  { type: 'risk_score_above', label: 'Risk Score Above', description: 'When a risk severity exceeds a threshold', icon: '⚠️', color: '#f59e0b' },
  { type: 'issue_added', label: 'Issue Created', description: 'When a new issue is logged', icon: '🔵', color: '#3b82f6' },
  { type: 'issue_blocked', label: 'Issue Blocked', description: 'When an issue status changes to blocked', icon: '🚫', color: '#dc2626' },
  { type: 'milestone_missed', label: 'Milestone Missed', description: 'When a milestone passes its due date', icon: '📅', color: '#f97316' },
  { type: 'milestone_due_soon', label: 'Milestone Due Soon', description: 'When a milestone is approaching (< 7 days)', icon: '⏰', color: '#eab308' },
  { type: 'meeting_saved', label: 'Meeting Saved', description: 'When meeting notes are saved', icon: '📝', color: '#8b5cf6' },
  { type: 'budget_threshold', label: 'Budget Threshold', description: 'When budget usage exceeds a percentage', icon: '💰', color: '#10b981' },
  { type: 'weekly_schedule', label: 'Weekly Schedule', description: 'Runs once every week', icon: '🗓️', color: '#6366f1' },
  { type: 'daily_schedule', label: 'Daily Schedule', description: 'Runs once every day', icon: '☀️', color: '#0ea5e9' },
  { type: 'manual', label: 'Manual Trigger', description: 'Run manually by clicking a button', icon: '▶️', color: '#64748b' },
];

export const ACTION_CATALOG: WorkflowActionConfig[] = [
  { type: 'ai_analyze', label: 'AI Analyze', description: 'Run AI analysis on project data', icon: '🤖', color: '#8b5cf6' },
  { type: 'ai_generate_report', label: 'Generate Report', description: 'Auto-generate a status report', icon: '📊', color: '#6366f1' },
  { type: 'ai_suggest_mitigation', label: 'Suggest Mitigation', description: 'AI suggests risk mitigation strategy', icon: '🛡️', color: '#10b981' },
  { type: 'ai_extract_actions', label: 'Extract Actions', description: 'Extract action items from meeting notes', icon: '✅', color: '#0ea5e9' },
  { type: 'add_risk', label: 'Add Risk', description: 'Create a new risk entry', icon: '➕', color: '#ef4444' },
  { type: 'add_issue', label: 'Add Issue', description: 'Create a new issue entry', icon: '➕', color: '#3b82f6' },
  { type: 'add_action_item', label: 'Add Action Item', description: 'Create a new action item', icon: '➕', color: '#f59e0b' },
  { type: 'notify', label: 'Notify', description: 'Send a notification to the PM', icon: '🔔', color: '#f97316' },
  { type: 'send_to_chat', label: 'Send to Chat', description: 'Post a message to the AI co-pilot chat', icon: '💬', color: '#8b5cf6' },
];
