/**
 * DB Helper Layer — translates between TypeScript Project interfaces and normalized Postgres tables.
 *
 * Two main operations:
 * 1. loadProject(id) — SELECT from all tables, reconstruct a Project object
 * 2. saveProject(id, project) — diff and upsert each module into its table
 *
 * Also: saveModule(id, module, data) — save only one module (efficient per-module sync)
 */

import sql, { pool } from '@/lib/db';
import type {
  Project, ProjectMeta, Charter, ProjectPlan, GanttData, WbsNode, RaciData,
  Risk, Issue, ChangeData, ChangeLogEntry, ChangeRequest, Resource, EstimateItem,
  Kpi, RoadmapItem, GovernanceData, FundingData, FundingPhase, Stakeholder,
  CommunicationItem, Meeting, LessonLearned, Decision, Assumption, StatusReport,
  ActionItem, AuditEntry, BaselineSnapshot, Deliverable, Milestone, BudgetItem,
} from '@/types';

// ─── Helpers ───
function jsonStr(v: unknown): string {
  return JSON.stringify(v);
}

// Generic upsert for array-based tables: delete removed rows, upsert remaining
async function syncArrayTable<T extends { id: string }>(
  tableName: string,
  projectId: string,
  items: T[],
  mapRow: (item: T, idx: number) => Record<string, unknown>,
) {
  // Get existing IDs
  const existing = await pool.query(`SELECT id FROM ${tableName} WHERE project_id = $1`, [projectId]);
  const existingIds = new Set(existing.rows.map((r) => r.id as string));
  const newIds = new Set(items.map((i) => i.id));

  // Delete removed
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await pool.query(`DELETE FROM ${tableName} WHERE project_id = $1 AND id = ANY($2)`, [projectId, toDelete]);
  }

  // Upsert each item
  for (let i = 0; i < items.length; i++) {
    const row = mapRow(items[i], i);
    const cols = Object.keys(row);
    const vals = Object.values(row);
    const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
    const updates = cols
      .filter((c) => c !== 'id' && c !== 'project_id')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');

    await pool.query(
      `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      vals,
    );
  }
}

// ─── LOAD PROJECT ───
export async function loadProject(projectId: string): Promise<Project | null> {
  const [projectRows] = await Promise.all([
    sql`SELECT * FROM projects WHERE id = ${projectId}`,
  ]);

  if (projectRows.length === 0) return null;
  const p = projectRows[0];

  // Load all related data in parallel
  const [
    charterRows, planRows, deliverableRows, milestoneRows, budgetRows,
    ganttRows, wbsRows, raciRows, riskRows, issueRows,
    changeLogRows, changeReqRows, resourceRows, estimateRows, kpiRows,
    roadmapRows, govRows, fundingRows, fundingPhaseRows, stakeholderRows,
    commRows, meetingRows, lessonRows, decisionRows, assumptionRows,
    statusReportRows, actionRows, auditRows, baselineRows,
  ] = await Promise.all([
    sql`SELECT data FROM charters WHERE project_id = ${projectId}`,
    sql`SELECT * FROM project_plans WHERE project_id = ${projectId}`,
    sql`SELECT * FROM deliverables WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM milestones WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM budget_items WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM gantt_tasks WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT nodes FROM wbs_data WHERE project_id = ${projectId}`,
    sql`SELECT data FROM raci_data WHERE project_id = ${projectId}`,
    sql`SELECT * FROM risks WHERE project_id = ${projectId} ORDER BY severity DESC`,
    sql`SELECT * FROM issues WHERE project_id = ${projectId} ORDER BY created_at DESC`,
    sql`SELECT * FROM change_log_entries WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM change_requests WHERE project_id = ${projectId} ORDER BY date DESC`,
    sql`SELECT * FROM resources WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM estimate_items WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM kpis WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM roadmap_items WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT data FROM governance_data WHERE project_id = ${projectId}`,
    sql`SELECT * FROM funding WHERE project_id = ${projectId}`,
    sql`SELECT * FROM funding_phases WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM stakeholders WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM communication_items WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM meetings WHERE project_id = ${projectId} ORDER BY date DESC`,
    sql`SELECT * FROM lessons_learned WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM decisions WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM assumptions WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM status_reports WHERE project_id = ${projectId} ORDER BY report_date DESC`,
    sql`SELECT * FROM action_items WHERE project_id = ${projectId} ORDER BY sort_order`,
    sql`SELECT * FROM audit_log WHERE project_id = ${projectId} ORDER BY timestamp DESC LIMIT 500`,
    sql`SELECT * FROM baseline_snapshots WHERE project_id = ${projectId} ORDER BY created_at DESC`,
  ]);

  const meta: ProjectMeta = {
    id: p.id as string,
    name: p.name as string,
    description: p.description as string,
    status: p.status as ProjectMeta['status'],
    health: p.health as ProjectMeta['health'],
    healthOverrideReason: (p.health_override_reason as string) || undefined,
    startDate: p.start_date as string,
    targetEndDate: p.target_end_date as string,
    jiraBoardId: (p.jira_board_id as string) || undefined,
    jiraBoardName: (p.jira_board_name as string) || undefined,
    confluenceSpaceKey: (p.confluence_space_key as string) || undefined,
    createdAt: (p.created_at as Date).toISOString(),
    updatedAt: (p.updated_at as Date).toISOString(),
  };

  const plan: ProjectPlan = planRows.length > 0
    ? {
        purpose: planRows[0].purpose as string,
        goals: planRows[0].goals as string[],
        deliverables: deliverableRows.map(rowToDeliverable),
        milestones: milestoneRows.map(rowToMilestone),
        budget: budgetRows.map(rowToBudget),
        qualityStandards: planRows[0].quality_standards as string[],
        procurementNeeds: planRows[0].procurement_needs as string[],
      }
    : { purpose: '', goals: [], deliverables: [], milestones: [], budget: [], qualityStandards: [], procurementNeeds: [] };

  const fundingData: FundingData = fundingRows.length > 0
    ? {
        totalBudget: Number(fundingRows[0].total_budget),
        phases: fundingPhaseRows.map(rowToFundingPhase),
        feasibilityNotes: fundingRows[0].feasibility_notes as string,
        partnerDetails: fundingRows[0].partner_details as string,
        financialProjections: fundingRows[0].financial_projections as string,
      }
    : { totalBudget: 0, phases: [], feasibilityNotes: '', partnerDetails: '', financialProjections: '' };

  const changes: ChangeData = {
    log: changeLogRows.map(rowToChangeLog),
    requests: changeReqRows.map(rowToChangeRequest),
  };

  return {
    meta,
    charter: (charterRows.length > 0 ? charterRows[0].data : {}) as Charter,
    plan,
    gantt: { tasks: ganttRows.map(rowToGanttTask) },
    wbs: (wbsRows.length > 0 ? wbsRows[0].nodes : []) as WbsNode[],
    raci: (raciRows.length > 0 ? raciRows[0].data : { roles: [], activities: [], matrix: {} }) as RaciData,
    risks: riskRows.map(rowToRisk),
    issues: issueRows.map(rowToIssue),
    changes,
    resources: resourceRows.map(rowToResource),
    estimates: estimateRows.map(rowToEstimate),
    kpis: kpiRows.map(rowToKpi),
    roadmap: roadmapRows.map(rowToRoadmap),
    governance: (govRows.length > 0 ? govRows[0].data : { principles: [], roles: [], readinessScore: 0, maturityLevel: 0, approvedTools: [], decisionLog: [], complianceChecks: [] }) as GovernanceData,
    funding: fundingData,
    stakeholders: stakeholderRows.map(rowToStakeholder),
    communications: commRows.map(rowToComm),
    meetings: meetingRows.map(rowToMeeting),
    lessons: lessonRows.map(rowToLesson),
    decisions: decisionRows.map(rowToDecision),
    assumptions: assumptionRows.map(rowToAssumption),
    statusReports: statusReportRows.map(rowToStatusReport),
    actionItems: actionRows.map(rowToActionItem),
    auditLog: auditRows.map(rowToAuditEntry),
    baselines: baselineRows.map(rowToBaseline),
  };
}

// ─── LOAD ALL PROJECTS ───
export async function loadAllProjects(): Promise<Record<string, Project>> {
  const rows = await sql`SELECT id FROM projects ORDER BY created_at ASC`;
  const result: Record<string, Project> = {};
  // Load projects in parallel (batch of 5 to not overwhelm connection pool)
  const ids = rows.map((r) => r.id as string);
  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const projects = await Promise.all(batch.map(loadProject));
    batch.forEach((id, idx) => {
      if (projects[idx]) result[id] = projects[idx]!;
    });
  }
  return result;
}

// ─── SAVE FULL PROJECT ───
export async function saveProject(projectId: string, project: Project): Promise<void> {
  const m = project.meta;

  // Upsert projects row
  await sql`
    INSERT INTO projects (id, name, description, status, health, health_override_reason,
      start_date, target_end_date, jira_board_id, jira_board_name, confluence_space_key,
      created_at, updated_at)
    VALUES (${m.id}, ${m.name}, ${m.description}, ${m.status}, ${m.health},
      ${m.healthOverrideReason ?? null}, ${m.startDate}, ${m.targetEndDate},
      ${m.jiraBoardId ?? null}, ${m.jiraBoardName ?? null}, ${m.confluenceSpaceKey ?? null},
      ${m.createdAt}, ${m.updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status,
      health = EXCLUDED.health, health_override_reason = EXCLUDED.health_override_reason,
      start_date = EXCLUDED.start_date, target_end_date = EXCLUDED.target_end_date,
      jira_board_id = EXCLUDED.jira_board_id, jira_board_name = EXCLUDED.jira_board_name,
      confluence_space_key = EXCLUDED.confluence_space_key, updated_at = EXCLUDED.updated_at
  `;

  // Save all modules in parallel
  await Promise.all([
    saveModule(projectId, 'charter', project.charter),
    saveModule(projectId, 'plan', project.plan),
    saveModule(projectId, 'gantt', project.gantt),
    saveModule(projectId, 'wbs', project.wbs),
    saveModule(projectId, 'raci', project.raci),
    saveModule(projectId, 'risks', project.risks),
    saveModule(projectId, 'issues', project.issues),
    saveModule(projectId, 'changes', project.changes),
    saveModule(projectId, 'resources', project.resources),
    saveModule(projectId, 'estimates', project.estimates),
    saveModule(projectId, 'kpis', project.kpis),
    saveModule(projectId, 'roadmap', project.roadmap),
    saveModule(projectId, 'governance', project.governance),
    saveModule(projectId, 'funding', project.funding),
    saveModule(projectId, 'stakeholders', project.stakeholders),
    saveModule(projectId, 'communications', project.communications),
    saveModule(projectId, 'meetings', project.meetings),
    saveModule(projectId, 'lessons', project.lessons),
    saveModule(projectId, 'decisions', project.decisions),
    saveModule(projectId, 'assumptions', project.assumptions),
    saveModule(projectId, 'statusReports', project.statusReports),
    saveModule(projectId, 'actionItems', project.actionItems),
    saveModule(projectId, 'auditLog', project.auditLog),
    saveModule(projectId, 'baselines', project.baselines),
  ]);
}

// ─── SAVE SINGLE MODULE ───
export async function saveModule<K extends keyof Project>(
  projectId: string,
  module: K,
  data: Project[K],
): Promise<void> {
  switch (module) {
    case 'meta': {
      const m = data as ProjectMeta;
      await sql`
        UPDATE projects SET
          name = ${m.name}, description = ${m.description}, status = ${m.status},
          health = ${m.health}, health_override_reason = ${m.healthOverrideReason ?? null},
          start_date = ${m.startDate}, target_end_date = ${m.targetEndDate},
          jira_board_id = ${m.jiraBoardId ?? null}, jira_board_name = ${m.jiraBoardName ?? null},
          confluence_space_key = ${m.confluenceSpaceKey ?? null}, updated_at = NOW()
        WHERE id = ${projectId}
      `;
      break;
    }

    case 'charter': {
      await sql`
        INSERT INTO charters (project_id, data) VALUES (${projectId}, ${jsonStr(data)}::jsonb)
        ON CONFLICT (project_id) DO UPDATE SET data = ${jsonStr(data)}::jsonb
      `;
      break;
    }

    case 'plan': {
      const plan = data as ProjectPlan;
      await sql`
        INSERT INTO project_plans (project_id, purpose, goals, quality_standards, procurement_needs)
        VALUES (${projectId}, ${plan.purpose}, ${jsonStr(plan.goals)}::jsonb,
          ${jsonStr(plan.qualityStandards)}::jsonb, ${jsonStr(plan.procurementNeeds)}::jsonb)
        ON CONFLICT (project_id) DO UPDATE SET
          purpose = EXCLUDED.purpose, goals = EXCLUDED.goals,
          quality_standards = EXCLUDED.quality_standards, procurement_needs = EXCLUDED.procurement_needs
      `;
      await syncArrayTable('deliverables', projectId, plan.deliverables, (d, i) => ({
        id: d.id, project_id: projectId, name: d.name, description: d.description,
        acceptance_criteria: d.acceptanceCriteria, due_date: d.dueDate, status: d.status, sort_order: i,
      }));
      await syncArrayTable('milestones', projectId, plan.milestones, (m, i) => ({
        id: m.id, project_id: projectId, name: m.name, due_date: m.dueDate, status: m.status, sort_order: i,
      }));
      await syncArrayTable('budget_items', projectId, plan.budget, (b, i) => ({
        id: b.id, project_id: projectId, category: b.category,
        planned: b.planned, actual: b.actual, variance: b.variance, sort_order: i,
      }));
      break;
    }

    case 'gantt': {
      const g = data as GanttData;
      await syncArrayTable('gantt_tasks', projectId, g.tasks, (t, i) => ({
        id: t.id, project_id: projectId, name: t.name, start_date: t.startDate,
        end_date: t.endDate, progress: t.progress, assignee: t.assignee,
        dependencies: jsonStr(t.dependencies), wbs_node_id: t.wbsNodeId ?? null,
        parent_id: t.parentId ?? null, color: t.color ?? null, sort_order: i,
      }));
      break;
    }

    case 'wbs': {
      await sql`
        INSERT INTO wbs_data (project_id, nodes) VALUES (${projectId}, ${jsonStr(data)}::jsonb)
        ON CONFLICT (project_id) DO UPDATE SET nodes = ${jsonStr(data)}::jsonb
      `;
      break;
    }

    case 'raci': {
      await sql`
        INSERT INTO raci_data (project_id, data) VALUES (${projectId}, ${jsonStr(data)}::jsonb)
        ON CONFLICT (project_id) DO UPDATE SET data = ${jsonStr(data)}::jsonb
      `;
      break;
    }

    case 'risks': {
      const risks = data as Risk[];
      await syncArrayTable('risks', projectId, risks, (r) => ({
        id: r.id, project_id: projectId, title: r.title, description: r.description,
        category: r.category, probability: r.probability, impact: r.impact, severity: r.severity,
        owner: r.owner, mitigation_strategy: r.mitigationStrategy, contingency_plan: r.contingencyPlan,
        status: r.status, linked_wbs_ids: jsonStr(r.linkedWbsIds), linked_task_ids: jsonStr(r.linkedTaskIds),
        linked_jira_key: r.linkedJiraKey ?? null, created_at: r.createdAt, updated_at: r.updatedAt,
      }));
      break;
    }

    case 'issues': {
      const issues = data as Issue[];
      await syncArrayTable('issues', projectId, issues, (i) => ({
        id: i.id, project_id: projectId, title: i.title, description: i.description,
        priority: i.priority, owner: i.owner, status: i.status, resolution: i.resolution,
        linked_risk_id: i.linkedRiskId ?? null, linked_jira_key: i.linkedJiraKey ?? null,
        due_date: i.dueDate, created_at: i.createdAt, updated_at: i.updatedAt,
      }));
      break;
    }

    case 'changes': {
      const c = data as ChangeData;
      await syncArrayTable('change_log_entries', projectId, c.log, (e, i) => ({
        id: e.id, project_id: projectId, version: e.version, date: e.date,
        description: e.description, author: e.author, sort_order: i,
      }));
      await syncArrayTable('change_requests', projectId, c.requests, (r) => ({
        id: r.id, project_id: projectId, name: r.name, requested_by: r.requestedBy,
        date: r.date, description: r.description, reason: r.reason, priority: r.priority,
        impact_on_deliverables: r.impactOnDeliverables, cost_evaluation: r.costEvaluation,
        risk_evaluation: r.riskEvaluation, quality_evaluation: r.qualityEvaluation,
        duration_impact: r.durationImpact, status: r.status, approver_comments: r.approverComments,
        approved_by: r.approvedBy ?? null, approval_date: r.approvalDate ?? null,
        linked_jira_key: r.linkedJiraKey ?? null, linked_risk_ids: jsonStr(r.linkedRiskIds),
      }));
      break;
    }

    case 'resources': {
      await syncArrayTable('resources', projectId, data as Resource[], (r, i) => ({
        id: r.id, project_id: projectId, name: r.name, role: r.role, email: r.email,
        allocation_percent: r.allocationPercent, cost_rate: r.costRate,
        assigned_task_ids: jsonStr(r.assignedTaskIds), availability: r.availability, sort_order: i,
      }));
      break;
    }

    case 'estimates': {
      await syncArrayTable('estimate_items', projectId, data as EstimateItem[], (e, i) => ({
        id: e.id, project_id: projectId, phase: e.phase, item: e.item,
        hours: e.hours, rate: e.rate, material_cost: e.materialCost, total: e.total, sort_order: i,
      }));
      break;
    }

    case 'kpis': {
      await syncArrayTable('kpis', projectId, data as Kpi[], (k, i) => ({
        id: k.id, project_id: projectId, name: k.name, category: k.category,
        target: k.target, actual: k.actual, unit: k.unit, trend: jsonStr(k.trend),
        status: k.status, sort_order: i,
      }));
      break;
    }

    case 'roadmap': {
      await syncArrayTable('roadmap_items', projectId, data as RoadmapItem[], (r, i) => ({
        id: r.id, project_id: projectId, feature: r.feature, description: r.description,
        quarter: r.quarter, status: r.status, priority: r.priority, swimlane: r.swimlane, sort_order: i,
      }));
      break;
    }

    case 'governance': {
      await sql`
        INSERT INTO governance_data (project_id, data) VALUES (${projectId}, ${jsonStr(data)}::jsonb)
        ON CONFLICT (project_id) DO UPDATE SET data = ${jsonStr(data)}::jsonb
      `;
      break;
    }

    case 'funding': {
      const f = data as FundingData;
      await sql`
        INSERT INTO funding (project_id, total_budget, feasibility_notes, partner_details, financial_projections)
        VALUES (${projectId}, ${f.totalBudget}, ${f.feasibilityNotes}, ${f.partnerDetails}, ${f.financialProjections})
        ON CONFLICT (project_id) DO UPDATE SET
          total_budget = EXCLUDED.total_budget, feasibility_notes = EXCLUDED.feasibility_notes,
          partner_details = EXCLUDED.partner_details, financial_projections = EXCLUDED.financial_projections
      `;
      await syncArrayTable('funding_phases', projectId, f.phases, (p, i) => ({
        id: p.id, project_id: projectId, name: p.name, amount: p.amount,
        start_date: p.startDate, end_date: p.endDate, status: p.status, sort_order: i,
      }));
      break;
    }

    case 'stakeholders': {
      await syncArrayTable('stakeholders', projectId, data as Stakeholder[], (s, i) => ({
        id: s.id, project_id: projectId, name: s.name, role: s.role, organization: s.organization,
        power: s.power, interest: s.interest, engagement: s.engagement,
        communication_preference: s.communicationPreference, contact_info: s.contactInfo, sort_order: i,
      }));
      break;
    }

    case 'communications': {
      await syncArrayTable('communication_items', projectId, data as CommunicationItem[], (c, i) => ({
        id: c.id, project_id: projectId, type: c.type, name: c.name, audience: c.audience,
        frequency: c.frequency, owner: c.owner, channel: c.channel, description: c.description,
        last_executed: c.lastExecuted ?? null, next_due: c.nextDue ?? null, sort_order: i,
      }));
      break;
    }

    case 'meetings': {
      await syncArrayTable('meetings', projectId, data as Meeting[], (m, i) => ({
        id: m.id, project_id: projectId, title: m.title, date: m.date,
        attendees: jsonStr(m.attendees), agenda: m.agenda, notes: m.notes,
        decisions: jsonStr(m.decisions), action_items: jsonStr(m.actionItems),
        confluence_page_id: m.confluencePageId ?? null, sort_order: i,
      }));
      break;
    }

    case 'lessons': {
      await syncArrayTable('lessons_learned', projectId, data as LessonLearned[], (l, i) => ({
        id: l.id, project_id: projectId, phase: l.phase, category: l.category,
        what_worked: l.whatWorked, what_didnt: l.whatDidnt, recommendation: l.recommendation,
        date: l.date, sort_order: i,
      }));
      break;
    }

    case 'decisions': {
      await syncArrayTable('decisions', projectId, data as Decision[], (d, i) => ({
        id: d.id, project_id: projectId, date: d.date, title: d.title, description: d.description,
        rationale: d.rationale, options_considered: d.optionsConsidered, decided_by: d.decidedBy,
        impact: d.impact, status: d.status, review_date: d.reviewDate, sort_order: i,
      }));
      break;
    }

    case 'assumptions': {
      await syncArrayTable('assumptions', projectId, data as Assumption[], (a, i) => ({
        id: a.id, project_id: projectId, assumption: a.assumption, category: a.category,
        owner: a.owner, validation_method: a.validationMethod,
        target_validation_date: a.targetValidationDate, validation_status: a.validationStatus,
        impact_if_invalid: a.impactIfInvalid, risk_level: a.riskLevel, notes: a.notes, sort_order: i,
      }));
      break;
    }

    case 'statusReports': {
      await syncArrayTable('status_reports', projectId, data as StatusReport[], (s, i) => ({
        id: s.id, project_id: projectId, report_date: s.reportDate,
        reporting_period: s.reportingPeriod, prepared_by: s.preparedBy,
        overall_status: s.overallStatus, executive_summary: s.executiveSummary,
        accomplishments: jsonStr(s.accomplishments), next_period_plans: jsonStr(s.nextPeriodPlans),
        risks_text: s.risks, issues_text: s.issues, budget_status: s.budgetStatus,
        schedule_status: s.scheduleStatus, ai_generated: s.aiGenerated, sort_order: i,
      }));
      break;
    }

    case 'actionItems': {
      await syncArrayTable('action_items', projectId, data as ActionItem[], (a, i) => ({
        id: a.id, project_id: projectId, title: a.title, description: a.description,
        owner: a.owner, due_date: a.dueDate, status: a.status, priority: a.priority,
        source: a.source, source_ref: a.sourceRef, created_at: a.createdAt, sort_order: i,
      }));
      break;
    }

    case 'auditLog': {
      const entries = data as AuditEntry[];
      // For audit log: append-only, just insert new entries
      const existing = await sql`SELECT id FROM audit_log WHERE project_id = ${projectId}`;
      const existingIds = new Set(existing.map((r) => r.id as string));
      const newEntries = entries.filter((e) => !existingIds.has(e.id));
      for (const e of newEntries) {
        await sql`
          INSERT INTO audit_log (id, project_id, timestamp, module, summary)
          VALUES (${e.id}, ${projectId}, ${e.timestamp}, ${e.module}, ${e.summary})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      // Trim to 500
      await sql`
        DELETE FROM audit_log WHERE project_id = ${projectId} AND id NOT IN (
          SELECT id FROM audit_log WHERE project_id = ${projectId} ORDER BY timestamp DESC LIMIT 500
        )
      `;
      break;
    }

    case 'baselines': {
      const baselines = data as BaselineSnapshot[];
      await syncArrayTable('baseline_snapshots', projectId, baselines, (b) => ({
        id: b.id, project_id: projectId, name: b.name, created_at: b.createdAt,
        snapshot_data: jsonStr({ milestones: b.milestones, budget: b.budget, ganttTasks: b.ganttTasks, kpis: b.kpis }),
      }));
      break;
    }
  }
}

// ─── DELETE PROJECT ───
export async function deleteProject(projectId: string): Promise<void> {
  // CASCADE handles all child tables
  await sql`DELETE FROM projects WHERE id = ${projectId}`;
}

// ─── Row → Interface mappers ───

function rowToDeliverable(r: Record<string, unknown>): Deliverable {
  return {
    id: r.id as string, name: r.name as string, description: r.description as string,
    acceptanceCriteria: r.acceptance_criteria as string, dueDate: r.due_date as string,
    status: r.status as Deliverable['status'],
  };
}

function rowToMilestone(r: Record<string, unknown>): Milestone {
  return { id: r.id as string, name: r.name as string, dueDate: r.due_date as string, status: r.status as Milestone['status'] };
}

function rowToBudget(r: Record<string, unknown>): BudgetItem {
  return {
    id: r.id as string, category: r.category as string,
    planned: Number(r.planned), actual: Number(r.actual), variance: Number(r.variance),
  };
}

function rowToGanttTask(r: Record<string, unknown>) {
  return {
    id: r.id as string, name: r.name as string, startDate: r.start_date as string,
    endDate: r.end_date as string, progress: Number(r.progress), assignee: r.assignee as string,
    dependencies: r.dependencies as string[], wbsNodeId: (r.wbs_node_id as string) || undefined,
    parentId: (r.parent_id as string) || undefined, color: (r.color as string) || undefined,
  };
}

function rowToRisk(r: Record<string, unknown>): Risk {
  return {
    id: r.id as string, title: r.title as string, description: r.description as string,
    category: r.category as string, probability: Number(r.probability) as Risk['probability'],
    impact: Number(r.impact) as Risk['impact'], severity: Number(r.severity),
    owner: r.owner as string, mitigationStrategy: r.mitigation_strategy as string,
    contingencyPlan: r.contingency_plan as string, status: r.status as Risk['status'],
    linkedWbsIds: r.linked_wbs_ids as string[], linkedTaskIds: r.linked_task_ids as string[],
    linkedJiraKey: (r.linked_jira_key as string) || undefined,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

function rowToIssue(r: Record<string, unknown>): Issue {
  return {
    id: r.id as string, title: r.title as string, description: r.description as string,
    priority: r.priority as Issue['priority'], owner: r.owner as string,
    status: r.status as Issue['status'], resolution: r.resolution as string,
    linkedRiskId: (r.linked_risk_id as string) || undefined,
    linkedJiraKey: (r.linked_jira_key as string) || undefined,
    dueDate: r.due_date as string, createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  };
}

function rowToChangeLog(r: Record<string, unknown>): ChangeLogEntry {
  return {
    id: r.id as string, version: r.version as string, date: r.date as string,
    description: r.description as string, author: r.author as string,
  };
}

function rowToChangeRequest(r: Record<string, unknown>): ChangeRequest {
  return {
    id: r.id as string, name: r.name as string, requestedBy: r.requested_by as string,
    date: r.date as string, description: r.description as string, reason: r.reason as string,
    priority: r.priority as ChangeRequest['priority'],
    impactOnDeliverables: r.impact_on_deliverables as string,
    costEvaluation: r.cost_evaluation as string, riskEvaluation: r.risk_evaluation as string,
    qualityEvaluation: r.quality_evaluation as string, durationImpact: r.duration_impact as string,
    status: r.status as ChangeRequest['status'], approverComments: r.approver_comments as string,
    approvedBy: (r.approved_by as string) || undefined,
    approvalDate: (r.approval_date as string) || undefined,
    linkedJiraKey: (r.linked_jira_key as string) || undefined,
    linkedRiskIds: r.linked_risk_ids as string[],
  };
}

function rowToResource(r: Record<string, unknown>): Resource {
  return {
    id: r.id as string, name: r.name as string, role: r.role as string, email: r.email as string,
    allocationPercent: Number(r.allocation_percent), costRate: Number(r.cost_rate),
    assignedTaskIds: r.assigned_task_ids as string[], availability: r.availability as Resource['availability'],
  };
}

function rowToEstimate(r: Record<string, unknown>): EstimateItem {
  return {
    id: r.id as string, phase: r.phase as string, item: r.item as string,
    hours: Number(r.hours), rate: Number(r.rate), materialCost: Number(r.material_cost), total: Number(r.total),
  };
}

function rowToKpi(r: Record<string, unknown>): Kpi {
  return {
    id: r.id as string, name: r.name as string, category: r.category as string,
    target: Number(r.target), actual: Number(r.actual), unit: r.unit as string,
    trend: r.trend as Kpi['trend'], status: r.status as Kpi['status'],
  };
}

function rowToRoadmap(r: Record<string, unknown>): RoadmapItem {
  return {
    id: r.id as string, feature: r.feature as string, description: r.description as string,
    quarter: r.quarter as string, status: r.status as RoadmapItem['status'],
    priority: r.priority as RoadmapItem['priority'], swimlane: r.swimlane as string,
  };
}

function rowToFundingPhase(r: Record<string, unknown>): FundingPhase {
  return {
    id: r.id as string, name: r.name as string, amount: Number(r.amount),
    startDate: r.start_date as string, endDate: r.end_date as string, status: r.status as FundingPhase['status'],
  };
}

function rowToStakeholder(r: Record<string, unknown>): Stakeholder {
  return {
    id: r.id as string, name: r.name as string, role: r.role as string,
    organization: r.organization as string, power: Number(r.power) as Stakeholder['power'],
    interest: Number(r.interest) as Stakeholder['interest'],
    engagement: r.engagement as Stakeholder['engagement'],
    communicationPreference: r.communication_preference as string, contactInfo: r.contact_info as string,
  };
}

function rowToComm(r: Record<string, unknown>): CommunicationItem {
  return {
    id: r.id as string, type: r.type as CommunicationItem['type'], name: r.name as string,
    audience: r.audience as string, frequency: r.frequency as string, owner: r.owner as string,
    channel: r.channel as string, description: r.description as string,
    lastExecuted: (r.last_executed as string) || undefined, nextDue: (r.next_due as string) || undefined,
  };
}

function rowToMeeting(r: Record<string, unknown>): Meeting {
  return {
    id: r.id as string, title: r.title as string, date: r.date as string,
    attendees: r.attendees as string[], agenda: r.agenda as string, notes: r.notes as string,
    decisions: r.decisions as Meeting['decisions'], actionItems: r.action_items as Meeting['actionItems'],
    confluencePageId: (r.confluence_page_id as string) || undefined,
  };
}

function rowToLesson(r: Record<string, unknown>): LessonLearned {
  return {
    id: r.id as string, phase: r.phase as string, category: r.category as LessonLearned['category'],
    whatWorked: r.what_worked as string, whatDidnt: r.what_didnt as string,
    recommendation: r.recommendation as string, date: r.date as string,
  };
}

function rowToDecision(r: Record<string, unknown>): Decision {
  return {
    id: r.id as string, date: r.date as string, title: r.title as string,
    description: r.description as string, rationale: r.rationale as string,
    optionsConsidered: r.options_considered as string, decidedBy: r.decided_by as string,
    impact: r.impact as string, status: r.status as Decision['status'], reviewDate: r.review_date as string,
  };
}

function rowToAssumption(r: Record<string, unknown>): Assumption {
  return {
    id: r.id as string, assumption: r.assumption as string, category: r.category as Assumption['category'],
    owner: r.owner as string, validationMethod: r.validation_method as string,
    targetValidationDate: r.target_validation_date as string,
    validationStatus: r.validation_status as Assumption['validationStatus'],
    impactIfInvalid: r.impact_if_invalid as string, riskLevel: r.risk_level as Assumption['riskLevel'],
    notes: r.notes as string,
  };
}

function rowToStatusReport(r: Record<string, unknown>): StatusReport {
  return {
    id: r.id as string, reportDate: r.report_date as string,
    reportingPeriod: r.reporting_period as string, preparedBy: r.prepared_by as string,
    overallStatus: r.overall_status as StatusReport['overallStatus'],
    executiveSummary: r.executive_summary as string,
    accomplishments: r.accomplishments as string[], nextPeriodPlans: r.next_period_plans as string[],
    risks: r.risks_text as string, issues: r.issues_text as string,
    budgetStatus: r.budget_status as string, scheduleStatus: r.schedule_status as string,
    aiGenerated: r.ai_generated as boolean,
  };
}

function rowToActionItem(r: Record<string, unknown>): ActionItem {
  return {
    id: r.id as string, title: r.title as string, description: r.description as string,
    owner: r.owner as string, dueDate: r.due_date as string, status: r.status as ActionItem['status'],
    priority: r.priority as ActionItem['priority'], source: r.source as ActionItem['source'],
    sourceRef: r.source_ref as string, createdAt: String(r.created_at),
  };
}

function rowToAuditEntry(r: Record<string, unknown>): AuditEntry {
  return {
    id: r.id as string, timestamp: String(r.timestamp), module: r.module as string,
    summary: r.summary as string,
  };
}

function rowToBaseline(r: Record<string, unknown>): BaselineSnapshot {
  const snap = r.snapshot_data as { milestones?: Milestone[]; budget?: BudgetItem[]; ganttTasks?: unknown[]; kpis?: Kpi[] };
  return {
    id: r.id as string, name: r.name as string, createdAt: String(r.created_at),
    milestones: snap.milestones ?? [], budget: snap.budget ?? [],
    ganttTasks: (snap.ganttTasks ?? []) as BaselineSnapshot['ganttTasks'], kpis: snap.kpis ?? [],
  };
}
