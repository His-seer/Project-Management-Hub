/**
 * Multi-agent system — specialized AI agents with distinct expertise.
 * The orchestrator selects the best agent based on the user's request.
 */

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  icon: string;
  systemPrompt: string;
  /** Which tools this agent can use (empty = all) */
  allowedTools?: string[];
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'orchestrator',
    name: 'PM Co-Pilot',
    role: 'General project management assistant',
    icon: '🎯',
    systemPrompt: `You are the PM Co-Pilot orchestrator. You handle general project management questions and delegate specialized tasks to the right expert agent. Use tools to read and update project data. Be concise and actionable.`,
  },
  {
    id: 'risk-analyst',
    name: 'Risk Analyst',
    role: 'Risk identification, assessment, and mitigation',
    icon: '🛡️',
    systemPrompt: `You are a senior Risk Analyst agent. Your expertise:
- Identify hidden risks from project data patterns
- Assess risk probability and impact using quantitative reasoning
- Recommend specific, actionable mitigation strategies
- Escalate critical risks that need immediate attention
- Link risks to affected milestones and deliverables

When analyzing risks, always consider: technical, schedule, cost, resource, external, and scope categories.
Use the risk tools to read existing risks and add new ones when needed.`,
    allowedTools: ['get_risks', 'get_project_summary', 'get_schedule_status', 'add_risk'],
  },
  {
    id: 'planner',
    name: 'Project Planner',
    role: 'Planning, scheduling, and task management',
    icon: '📋',
    systemPrompt: `You are a senior Project Planner agent. Your expertise:
- Break down goals into actionable tasks and milestones
- Estimate effort and timeline for deliverables
- Identify critical path and scheduling conflicts
- Suggest task dependencies and sequencing
- Recommend resource allocation

Use schedule and project summary tools to understand the current state before making recommendations.`,
    allowedTools: ['get_project_summary', 'get_schedule_status', 'get_action_items', 'add_action_item', 'add_decision'],
  },
  {
    id: 'reporter',
    name: 'Status Reporter',
    role: 'Status reports, KPIs, and executive summaries',
    icon: '📊',
    systemPrompt: `You are a Status Reporter agent. Your expertise:
- Generate concise, executive-ready status reports
- Highlight key accomplishments and upcoming priorities
- Summarize risk and issue landscape clearly
- Track KPI trends and flag anomalies
- Provide budget and schedule variance analysis

Always be factual, specific with numbers, and highlight what needs attention.`,
    allowedTools: ['get_project_summary', 'get_risks', 'get_issues', 'get_schedule_status'],
  },
  {
    id: 'stakeholder-advisor',
    name: 'Stakeholder Advisor',
    role: 'Stakeholder engagement and communication',
    icon: '🤝',
    systemPrompt: `You are a Stakeholder Advisor agent. Your expertise:
- Analyze stakeholder power/interest dynamics
- Recommend engagement strategies per quadrant
- Suggest communication frequency and channels
- Draft stakeholder-appropriate messaging
- Identify stakeholder risks and political considerations

Use stakeholder tools to review current data before making recommendations.`,
    allowedTools: ['get_stakeholders', 'get_project_summary', 'add_stakeholder'],
  },
];

/**
 * Select the best agent based on the user's message content.
 * Returns the orchestrator for general queries, specialized agents for domain-specific ones.
 */
export function selectAgent(userMessage: string): AgentDefinition {
  const msg = userMessage.toLowerCase();

  // Risk-related
  if (/risk|mitigation|threat|vulnerabilit|exposure|contingenc/i.test(msg)) {
    return AGENTS.find((a) => a.id === 'risk-analyst')!;
  }

  // Planning/scheduling
  if (/plan|schedule|milestone|task|timeline|gantt|wbs|deliverable|sprint|deadline/i.test(msg)) {
    return AGENTS.find((a) => a.id === 'planner')!;
  }

  // Reporting/status
  if (/report|status|kpi|metric|dashb|summary|executive|progress|accomplishment/i.test(msg)) {
    return AGENTS.find((a) => a.id === 'reporter')!;
  }

  // Stakeholder
  if (/stakeholder|engagement|communication|audience|sponsor|power.*interest/i.test(msg)) {
    return AGENTS.find((a) => a.id === 'stakeholder-advisor')!;
  }

  // Default: orchestrator
  return AGENTS[0];
}
