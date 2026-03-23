/**
 * Chat tool execution handlers.
 * Maps Gemini function call names to actual implementations that read/write project data.
 */

import { loadProject, saveModule } from '@/lib/dbHelpers';
import { generateId } from '@/lib/ids';
import type { Project, Risk, Issue, Stakeholder, ActionItem, Decision } from '@/types';
import { overallCompleteness } from '@/lib/completeness';

// ─── Tool Definitions (for Gemini function calling) ───

export const toolDeclarations = {
  function_declarations: [
    // READ TOOLS
    {
      name: 'get_project_summary',
      description: 'Get an overview of the project including status, health, completion, risk/issue counts, upcoming milestones, and budget.',
      parameters: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_risks',
      description: 'List current project risks with their severity, status, and owners.',
      parameters: {
        type: 'object' as const,
        properties: {
          status_filter: { type: 'string', description: 'Filter by status: open, closed, mitigating, or all', enum: ['open', 'closed', 'mitigating', 'all'] },
        },
      },
    },
    {
      name: 'get_issues',
      description: 'List current project issues with priority, status, and owners.',
      parameters: {
        type: 'object' as const,
        properties: {
          status_filter: { type: 'string', description: 'Filter: open, blocked, resolved, all', enum: ['open', 'blocked', 'resolved', 'all'] },
        },
      },
    },
    {
      name: 'get_schedule_status',
      description: 'Get milestones, their statuses, and overall schedule health.',
      parameters: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_stakeholders',
      description: 'List stakeholders with power/interest levels and engagement status.',
      parameters: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_action_items',
      description: 'List action items with their status, owners, and due dates.',
      parameters: {
        type: 'object' as const,
        properties: {
          status_filter: { type: 'string', enum: ['open', 'in-progress', 'done', 'all'] },
        },
      },
    },
    // WRITE TOOLS
    {
      name: 'add_risk',
      description: 'Add a new risk to the project risk register.',
      parameters: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Risk title' },
          description: { type: 'string', description: 'Risk description' },
          category: { type: 'string', enum: ['technical', 'schedule', 'cost', 'resource', 'external', 'scope', 'quality'] },
          probability: { type: 'integer', description: '1-5 scale' },
          impact: { type: 'integer', description: '1-5 scale' },
          owner: { type: 'string', description: 'Risk owner name' },
          mitigationStrategy: { type: 'string', description: 'Mitigation approach' },
        },
        required: ['title', 'category', 'probability', 'impact'],
      },
    },
    {
      name: 'add_issue',
      description: 'Add a new issue to the project issue tracker.',
      parameters: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          owner: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD format' },
        },
        required: ['title', 'priority'],
      },
    },
    {
      name: 'add_stakeholder',
      description: 'Add a new stakeholder to the register.',
      parameters: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          organization: { type: 'string' },
          power: { type: 'integer', description: '1-5 scale' },
          interest: { type: 'integer', description: '1-5 scale' },
          engagement: { type: 'string', enum: ['unaware', 'resistant', 'neutral', 'supportive', 'leading'] },
        },
        required: ['name', 'role'],
      },
    },
    {
      name: 'add_action_item',
      description: 'Create a new action item.',
      parameters: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' },
          owner: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD format' },
          source: { type: 'string', enum: ['meeting', 'risk', 'issue', 'decision', 'other'] },
        },
        required: ['title'],
      },
    },
    {
      name: 'add_decision',
      description: 'Log a project decision.',
      parameters: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          rationale: { type: 'string' },
          decidedBy: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    },
  ],
};

// ─── Tool Execution ───

export interface ToolResult {
  result: unknown;
  mutatedModules: string[];
}

export async function executeTool(
  projectId: string,
  project: Project,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (toolName) {
    // READ TOOLS
    case 'get_project_summary': {
      const pct = overallCompleteness(project);
      const openRisks = project.risks.filter((r) => r.status !== 'closed');
      const openIssues = project.issues.filter((i) => i.status !== 'closed' && i.status !== 'resolved');
      const upcomingMilestones = (project.plan.milestones ?? [])
        .filter((m) => m.status !== 'completed' && m.status !== 'missed')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5);
      return {
        result: {
          name: project.meta.name,
          description: project.meta.description,
          status: project.meta.status,
          health: project.meta.health,
          completeness: `${pct}%`,
          startDate: project.meta.startDate,
          targetEndDate: project.meta.targetEndDate,
          openRisks: openRisks.length,
          criticalRisks: openRisks.filter((r) => r.severity >= 15).length,
          openIssues: openIssues.length,
          blockedIssues: openIssues.filter((i) => i.status === 'blocked').length,
          teamSize: project.resources.length,
          totalBudget: project.funding.totalBudget,
          upcomingMilestones: upcomingMilestones.map((m) => ({ name: m.name, dueDate: m.dueDate, status: m.status })),
        },
        mutatedModules: [],
      };
    }

    case 'get_risks': {
      const filter = (args.status_filter as string) || 'all';
      let risks = project.risks;
      if (filter !== 'all') risks = risks.filter((r) => r.status === filter);
      return {
        result: risks.map((r) => ({
          id: r.id, title: r.title, category: r.category,
          probability: r.probability, impact: r.impact, severity: r.severity,
          status: r.status, owner: r.owner, mitigationStrategy: r.mitigationStrategy,
        })),
        mutatedModules: [],
      };
    }

    case 'get_issues': {
      const filter = (args.status_filter as string) || 'all';
      let issues = project.issues;
      if (filter === 'open') issues = issues.filter((i) => i.status === 'open' || i.status === 'in-progress');
      else if (filter === 'blocked') issues = issues.filter((i) => i.status === 'blocked');
      else if (filter === 'resolved') issues = issues.filter((i) => i.status === 'resolved' || i.status === 'closed');
      return {
        result: issues.map((i) => ({
          id: i.id, title: i.title, priority: i.priority,
          status: i.status, owner: i.owner, dueDate: i.dueDate,
        })),
        mutatedModules: [],
      };
    }

    case 'get_schedule_status': {
      const milestones = project.plan.milestones ?? [];
      const completed = milestones.filter((m) => m.status === 'completed').length;
      const missed = milestones.filter((m) => m.status === 'missed').length;
      return {
        result: {
          totalMilestones: milestones.length,
          completed, missed,
          upcoming: milestones.filter((m) => m.status !== 'completed' && m.status !== 'missed')
            .map((m) => ({ name: m.name, dueDate: m.dueDate, status: m.status })),
          ganttTaskCount: project.gantt.tasks.length,
        },
        mutatedModules: [],
      };
    }

    case 'get_stakeholders': {
      return {
        result: project.stakeholders.map((s) => ({
          name: s.name, role: s.role, organization: s.organization,
          power: s.power, interest: s.interest, engagement: s.engagement,
        })),
        mutatedModules: [],
      };
    }

    case 'get_action_items': {
      const filter = (args.status_filter as string) || 'all';
      let items = project.actionItems;
      if (filter !== 'all') items = items.filter((a) => a.status === filter);
      return {
        result: items.map((a) => ({
          id: a.id, title: a.title, owner: a.owner,
          dueDate: a.dueDate, status: a.status, source: a.source,
        })),
        mutatedModules: [],
      };
    }

    // WRITE TOOLS
    case 'add_risk': {
      const now = new Date().toISOString();
      const newRisk: Risk = {
        id: generateId(),
        title: (args.title as string) || 'Untitled Risk',
        description: (args.description as string) || '',
        category: (args.category as Risk['category']) || 'technical',
        probability: Math.min(5, Math.max(1, (args.probability as number) || 3)) as 1 | 2 | 3 | 4 | 5,
        impact: Math.min(5, Math.max(1, (args.impact as number) || 3)) as 1 | 2 | 3 | 4 | 5,
        severity: ((args.probability as number) || 3) * ((args.impact as number) || 3),
        owner: (args.owner as string) || '',
        mitigationStrategy: (args.mitigationStrategy as string) || '',
        contingencyPlan: '',
        status: 'open',
        linkedWbsIds: [],
        linkedTaskIds: [],
        linkedJiraKey: '',
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...project.risks, newRisk];
      await saveModule(projectId, 'risks', updated);
      return { result: { added: newRisk.title, id: newRisk.id, severity: newRisk.severity }, mutatedModules: ['risks'] };
    }

    case 'add_issue': {
      const nowIssue = new Date().toISOString();
      const newIssue: Issue = {
        id: generateId(),
        title: (args.title as string) || 'Untitled Issue',
        description: (args.description as string) || '',
        priority: (args.priority as Issue['priority']) || 'medium',
        owner: (args.owner as string) || '',
        status: 'open',
        resolution: '',
        linkedRiskId: '',
        linkedJiraKey: '',
        dueDate: (args.dueDate as string) || '',
        createdAt: nowIssue,
        updatedAt: nowIssue,
      };
      const updated = [...project.issues, newIssue];
      await saveModule(projectId, 'issues', updated);
      return { result: { added: newIssue.title, id: newIssue.id, priority: newIssue.priority }, mutatedModules: ['issues'] };
    }

    case 'add_stakeholder': {
      const newSh: Stakeholder = {
        id: generateId(),
        name: (args.name as string) || 'Unknown',
        role: (args.role as string) || '',
        organization: (args.organization as string) || '',
        power: Math.min(5, Math.max(1, (args.power as number) || 3)) as 1 | 2 | 3 | 4 | 5,
        interest: Math.min(5, Math.max(1, (args.interest as number) || 3)) as 1 | 2 | 3 | 4 | 5,
        engagement: (args.engagement as Stakeholder['engagement']) || 'neutral',
        communicationPreference: '',
        contactInfo: '',
      };
      const updated = [...project.stakeholders, newSh];
      await saveModule(projectId, 'stakeholders', updated);
      return { result: { added: newSh.name, id: newSh.id }, mutatedModules: ['stakeholders'] };
    }

    case 'add_action_item': {
      const newAi: ActionItem = {
        id: generateId(),
        title: (args.title as string) || 'Untitled Action',
        description: '',
        owner: (args.owner as string) || '',
        dueDate: (args.dueDate as string) || '',
        status: 'open',
        priority: 'medium',
        source: (args.source as ActionItem['source']) || 'other',
        sourceRef: '',
        createdAt: new Date().toISOString(),
      };
      const updated = [...project.actionItems, newAi];
      await saveModule(projectId, 'actionItems', updated);
      return { result: { added: newAi.title, id: newAi.id }, mutatedModules: ['actionItems'] };
    }

    case 'add_decision': {
      const newDec: Decision = {
        id: generateId(),
        date: new Date().toISOString().split('T')[0],
        title: (args.title as string) || 'Untitled Decision',
        description: (args.description as string) || '',
        rationale: (args.rationale as string) || '',
        optionsConsidered: '',
        decidedBy: (args.decidedBy as string) || '',
        impact: '',
        status: 'active',
        reviewDate: '',
      };
      const updated = [...project.decisions, newDec];
      await saveModule(projectId, 'decisions', updated);
      return { result: { added: newDec.title, id: newDec.id }, mutatedModules: ['decisions'] };
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` }, mutatedModules: [] };
  }
}
