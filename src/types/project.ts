export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'cancelled';
export type ProjectHealth = 'green' | 'amber' | 'red';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  health: ProjectHealth;
  healthOverrideReason?: string;
  startDate: string;
  targetEndDate: string;
  jiraBoardId?: string;
  jiraBoardName?: string;
  confluenceSpaceKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  meta: ProjectMeta;
  charter: Charter;
  plan: ProjectPlan;
  gantt: GanttData;
  wbs: WbsNode[];
  raci: RaciData;
  risks: Risk[];
  issues: Issue[];
  changes: ChangeData;
  resources: Resource[];
  estimates: EstimateItem[];
  kpis: Kpi[];
  roadmap: RoadmapItem[];
  governance: GovernanceData;
  funding: FundingData;
  stakeholders: Stakeholder[];
  communications: CommunicationItem[];
  meetings: Meeting[];
  lessons: LessonLearned[];
  decisions: Decision[];
  assumptions: Assumption[];
  statusReports: StatusReport[];
  actionItems: ActionItem[];
  auditLog: AuditEntry[];
  baselines: BaselineSnapshot[];
}

// ─── Baseline Snapshots ───
export interface BaselineSnapshot {
  id: string;
  name: string;
  createdAt: string;
  milestones: Milestone[];
  budget: BudgetItem[];
  ganttTasks: GanttTask[];
  kpis: Kpi[];
}

// ─── Audit Trail ───
export interface AuditEntry {
  id: string;
  timestamp: string;
  module: string;
  summary: string;
}

// ─── Action Items ───
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  source: 'meeting' | 'risk' | 'issue' | 'decision' | 'other';
  sourceRef: string;
  createdAt: string;
}

// ─── Charter ───
export interface CharterApproval {
  id: string;
  role: string;
  name: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Charter {
  // Document Control
  documentVersion: string;
  documentOwner: string;
  issueDate: string;
  // Narrative
  executiveSummary: string;
  projectPurpose: string;
  vision: string;
  objectives: string[];
  businessObjectives: string[];
  technologyObjectives: string[];
  // Scope
  scope: string;
  outOfScope: string;
  assumptions: string[];
  constraints: string[];
  // Quality
  qualityStandards: string[];
  qualityAssurance: string;
  // Success
  successCriteria: string[];
  // Governance
  sponsors: string[];
  approvals: CharterApproval[];
  approvalDate: string;
}

// ─── Project Plan ───
export interface ProjectPlan {
  purpose: string;
  goals: string[];
  deliverables: Deliverable[];
  milestones: Milestone[];
  budget: BudgetItem[];
  qualityStandards: string[];
  procurementNeeds: string[];
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  acceptanceCriteria: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'delivered' | 'accepted';
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  status: 'upcoming' | 'on-track' | 'at-risk' | 'completed' | 'missed';
}

export interface BudgetItem {
  id: string;
  category: string;
  planned: number;
  actual: number;
  variance: number;
}

// ─── Gantt ───
export interface GanttData {
  tasks: GanttTask[];
}

export interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  assignee: string;
  dependencies: string[];
  wbsNodeId?: string;
  parentId?: string;
  color?: string;
}

// ─── WBS ───
export interface WbsNode {
  id: string;
  name: string;
  description: string;
  children: WbsNode[];
  linkedTaskIds: string[];
}

// ─── RACI ───
export interface RaciData {
  roles: RaciRole[];
  activities: RaciActivity[];
  matrix: Record<string, Record<string, 'R' | 'A' | 'C' | 'I' | ''>>;
}

export interface RaciRole {
  id: string;
  name: string;
  title: string;
}

export interface RaciActivity {
  id: string;
  name: string;
  category: string;
}

// ─── Risk Register ───
export interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  severity: number;
  owner: string;
  mitigationStrategy: string;
  contingencyPlan: string;
  status: 'open' | 'mitigating' | 'closed' | 'accepted';
  linkedWbsIds: string[];
  linkedTaskIds: string[];
  linkedJiraKey?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Issue Tracker ───
export interface Issue {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  owner: string;
  status: 'open' | 'in-progress' | 'blocked' | 'resolved' | 'closed';
  resolution: string;
  linkedRiskId?: string;
  linkedJiraKey?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Changes ───
export interface ChangeData {
  log: ChangeLogEntry[];
  requests: ChangeRequest[];
}

export interface ChangeLogEntry {
  id: string;
  version: string;
  date: string;
  description: string;
  author: string;
}

export interface ChangeRequest {
  id: string;
  name: string;
  requestedBy: string;
  date: string;
  description: string;
  reason: string;
  priority: Priority;
  impactOnDeliverables: string;
  costEvaluation: string;
  riskEvaluation: string;
  qualityEvaluation: string;
  durationImpact: string;
  status: 'pending' | 'accepted' | 'deferred' | 'rejected';
  approverComments: string;
  approvedBy?: string;
  approvalDate?: string;
  linkedJiraKey?: string;
  linkedRiskIds: string[];
}

// ─── Resources ───
export interface Resource {
  id: string;
  name: string;
  role: string;
  email: string;
  allocationPercent: number;
  costRate: number;
  assignedTaskIds: string[];
  availability: 'available' | 'partial' | 'unavailable';
}

// ─── Estimates ───
export interface EstimateItem {
  id: string;
  phase: string;
  item: string;
  hours: number;
  rate: number;
  materialCost: number;
  total: number;
}

// ─── KPI ───
export interface Kpi {
  id: string;
  name: string;
  category: string;
  target: number;
  actual: number;
  unit: string;
  trend: { date: string; value: number }[];
  status: 'on-track' | 'at-risk' | 'off-track';
}

// ─── Roadmap ───
export interface RoadmapItem {
  id: string;
  feature: string;
  description: string;
  quarter: string;
  status: 'planned' | 'in-progress' | 'completed' | 'deferred';
  priority: Priority;
  swimlane: string;
}

// ─── Governance ───
export interface GovernanceData {
  principles: string[];
  roles: GovernanceRole[];
  readinessScore: number;
  maturityLevel: 0 | 1 | 2 | 3 | 4 | 5;
  approvedTools: ApprovedTool[];
  decisionLog: DecisionEntry[];
  complianceChecks: ComplianceCheck[];
}

export interface GovernanceRole {
  id: string;
  entity: string;
  responsibilities: string;
  interactions: string;
  members: string[];
}

export interface ApprovedTool {
  id: string;
  name: string;
  purpose: string;
  guidelines: string;
}

export interface DecisionEntry {
  id: string;
  date: string;
  decision: string;
  rationale: string;
  madeBy: string;
  status: 'active' | 'superseded' | 'revoked';
}

export interface ComplianceCheck {
  id: string;
  area: string;
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-assessed';
  lastChecked: string;
}

// ─── Funding ───
export interface FundingData {
  totalBudget: number;
  phases: FundingPhase[];
  feasibilityNotes: string;
  partnerDetails: string;
  financialProjections: string;
}

export interface FundingPhase {
  id: string;
  name: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'planned' | 'approved' | 'disbursed' | 'completed';
}

// ─── Stakeholders ───
export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  organization: string;
  power: 1 | 2 | 3 | 4 | 5;
  interest: 1 | 2 | 3 | 4 | 5;
  engagement: 'unaware' | 'resistant' | 'neutral' | 'supportive' | 'leading';
  communicationPreference: string;
  contactInfo: string;
}

// ─── Communication Plan ───
export interface CommunicationItem {
  id: string;
  type: 'meeting' | 'report' | 'email' | 'presentation';
  name: string;
  audience: string;
  frequency: string;
  owner: string;
  channel: string;
  description: string;
  lastExecuted?: string;
  nextDue?: string;
}

// ─── Meetings ───
export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  agenda: string;
  notes: string;
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  confluencePageId?: string;
}

export interface MeetingDecision {
  id: string;
  decision: string;
  madeBy: string;
}

export interface MeetingActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'open' | 'in-progress' | 'done';
  escalateToIssue: boolean;
}

// ─── Lessons Learned ───
export interface LessonLearned {
  id: string;
  phase: string;
  category: 'process' | 'technical' | 'people' | 'tools' | 'communication';
  whatWorked: string;
  whatDidnt: string;
  recommendation: string;
  date: string;
}

// ─── Decisions (standalone log) ───
export interface Decision {
  id: string;
  date: string;
  title: string;
  description: string;
  rationale: string;
  optionsConsidered: string;
  decidedBy: string;
  impact: string;
  status: 'active' | 'superseded' | 'revoked';
  reviewDate: string;
}

// ─── Assumptions Log ───
export interface Assumption {
  id: string;
  assumption: string;
  category: 'technical' | 'business' | 'resource' | 'external' | 'regulatory';
  owner: string;
  validationMethod: string;
  targetValidationDate: string;
  validationStatus: 'unvalidated' | 'validated' | 'invalidated' | 'in-progress';
  impactIfInvalid: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
}

// ─── Status Report ───
export interface StatusReport {
  id: string;
  reportDate: string;
  reportingPeriod: string;
  preparedBy: string;
  overallStatus: 'green' | 'amber' | 'red';
  executiveSummary: string;
  accomplishments: string[];
  nextPeriodPlans: string[];
  risks: string;
  issues: string;
  budgetStatus: string;
  scheduleStatus: string;
  aiGenerated: boolean;
}
