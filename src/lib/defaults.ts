import type { Project, Charter, ProjectPlan, GanttData, RaciData, ChangeData, GovernanceData, FundingData } from '@/types';

export const defaultCharter: Charter = {
  documentVersion: '1.0',
  documentOwner: '',
  issueDate: '',
  executiveSummary: '',
  projectPurpose: '',
  vision: '',
  objectives: [],
  businessObjectives: [],
  technologyObjectives: [],
  scope: '',
  outOfScope: '',
  assumptions: [],
  constraints: [],
  qualityStandards: [],
  qualityAssurance: '',
  successCriteria: [],
  sponsors: [],
  approvals: [],
  approvalDate: '',
};

export const defaultPlan: ProjectPlan = {
  purpose: '',
  goals: [],
  deliverables: [],
  milestones: [],
  budget: [],
  qualityStandards: [],
  procurementNeeds: [],
};

export const defaultGantt: GanttData = { tasks: [] };

export const defaultRaci: RaciData = {
  roles: [],
  activities: [],
  matrix: {},
};

export const defaultChanges: ChangeData = {
  log: [],
  requests: [],
};

export const defaultGovernance: GovernanceData = {
  principles: [],
  roles: [],
  readinessScore: 0,
  maturityLevel: 0,
  approvedTools: [],
  decisionLog: [],
  complianceChecks: [],
};

export const defaultFunding: FundingData = {
  totalBudget: 0,
  phases: [],
  feasibilityNotes: '',
  partnerDetails: '',
  financialProjections: '',
};

export function createDefaultProject(meta: Project['meta']): Project {
  return {
    meta,
    charter: { ...defaultCharter },
    plan: { ...defaultPlan },
    gantt: { ...defaultGantt },
    wbs: [],
    raci: { ...defaultRaci },
    risks: [],
    issues: [],
    changes: { log: [], requests: [] },
    resources: [],
    estimates: [],
    kpis: [],
    roadmap: [],
    governance: { ...defaultGovernance },
    funding: { ...defaultFunding },
    stakeholders: [],
    communications: [],
    meetings: [],
    lessons: [],
    decisions: [],
    assumptions: [],
    statusReports: [],
    actionItems: [],
    auditLog: [],
    baselines: [],
  };
}
