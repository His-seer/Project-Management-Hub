import type { Project } from '@/types';

export interface ModuleCompleteness {
  module: string;
  label: string;
  complete: boolean;
  percentage: number;
}

export function calculateCompleteness(project: Project): ModuleCompleteness[] {
  const p = project;
  return [
    {
      module: 'charter',
      label: 'Project Charter',
      complete: !!p.charter.vision && p.charter.objectives.length > 0,
      percentage: getCharterPct(p),
    },
    {
      module: 'plan',
      label: 'Project Plan',
      complete: !!p.plan.purpose && p.plan.deliverables.length > 0,
      percentage: getPlanPct(p),
    },
    {
      module: 'gantt',
      label: 'Gantt Chart',
      complete: p.gantt.tasks.length > 0,
      percentage: p.gantt.tasks.length > 0 ? 100 : 0,
    },
    {
      module: 'wbs',
      label: 'Work Breakdown Structure',
      complete: p.wbs.length > 0,
      percentage: p.wbs.length > 0 ? 100 : 0,
    },
    {
      module: 'raci',
      label: 'RACI Matrix',
      complete: p.raci.roles.length > 0 && p.raci.activities.length > 0,
      percentage: p.raci.roles.length > 0 && p.raci.activities.length > 0 ? 100 : 0,
    },
    {
      module: 'risks',
      label: 'Risk Register',
      complete: p.risks.length > 0,
      percentage: p.risks.length > 0 ? 100 : 0,
    },
    {
      module: 'issues',
      label: 'Issue Tracker',
      complete: true,
      percentage: 100,
    },
    {
      module: 'changes',
      label: 'Change Management',
      complete: true,
      percentage: 100,
    },
    {
      module: 'resources',
      label: 'Resource Planning',
      complete: p.resources.length > 0,
      percentage: p.resources.length > 0 ? 100 : 0,
    },
    {
      module: 'estimates',
      label: 'Project Estimates',
      complete: p.estimates.length > 0,
      percentage: p.estimates.length > 0 ? 100 : 0,
    },
    {
      module: 'kpi',
      label: 'KPI Dashboard',
      complete: p.kpis.length > 0,
      percentage: p.kpis.length > 0 ? 100 : 0,
    },
    {
      module: 'roadmap',
      label: 'Product Roadmap',
      complete: p.roadmap.length > 0,
      percentage: p.roadmap.length > 0 ? 100 : 0,
    },
    {
      module: 'governance',
      label: 'Governance',
      complete: p.governance.principles.length > 0,
      percentage: p.governance.principles.length > 0 ? 100 : 0,
    },
    {
      module: 'funding',
      label: 'Funding / Feasibility',
      complete: p.funding.totalBudget > 0,
      percentage: p.funding.totalBudget > 0 ? 100 : 0,
    },
    {
      module: 'stakeholders',
      label: 'Stakeholder Register',
      complete: p.stakeholders.length > 0,
      percentage: p.stakeholders.length > 0 ? 100 : 0,
    },
    {
      module: 'communications',
      label: 'Communication Plan',
      complete: p.communications.length > 0,
      percentage: p.communications.length > 0 ? 100 : 0,
    },
    {
      module: 'meetings',
      label: 'Meeting Minutes',
      complete: true,
      percentage: 100,
    },
    {
      module: 'lessons',
      label: 'Lessons Learned',
      complete: true,
      percentage: 100,
    },
    {
      module: 'decisions',
      label: 'Decision Log',
      complete: (project.decisions?.length ?? 0) > 0,
      percentage: (project.decisions?.length ?? 0) > 0 ? 100 : 0,
    },
    {
      module: 'assumptions',
      label: 'Assumptions Log',
      complete: (project.assumptions?.length ?? 0) > 0,
      percentage: (project.assumptions?.length ?? 0) > 0 ? 100 : 0,
    },
    {
      module: 'statusReports',
      label: 'Status Reports',
      complete: (project.statusReports?.length ?? 0) > 0,
      percentage: (project.statusReports?.length ?? 0) > 0 ? 100 : 0,
    },
    {
      module: 'actions',
      label: 'Action Items',
      complete: true,
      percentage: 100,
    },
  ];
}

function getCharterPct(p: Project): number {
  let score = 0;
  const total = 5;
  if (p.charter.vision) score++;
  if (p.charter.objectives.length > 0) score++;
  if (p.charter.scope) score++;
  if (p.charter.successCriteria.length > 0) score++;
  if (p.charter.sponsors.length > 0) score++;
  return Math.round((score / total) * 100);
}

function getPlanPct(p: Project): number {
  let score = 0;
  const total = 4;
  if (p.plan.purpose) score++;
  if (p.plan.goals.length > 0) score++;
  if (p.plan.deliverables.length > 0) score++;
  if (p.plan.milestones.length > 0) score++;
  return Math.round((score / total) * 100);
}

export function overallCompleteness(project: Project): number {
  const items = calculateCompleteness(project);
  const total = items.reduce((sum, i) => sum + i.percentage, 0);
  return Math.round(total / items.length);
}
