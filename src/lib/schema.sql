-- PM Hub Normalized Schema
-- Enterprise-grade PostgreSQL schema for project management
-- Run via /api/db/migrate endpoint

-- ============================================================
-- CORE: Projects (meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  health TEXT NOT NULL DEFAULT 'green',
  health_override_reason TEXT,
  start_date TEXT NOT NULL,
  target_end_date TEXT NOT NULL,
  jira_board_id TEXT,
  jira_board_name TEXT,
  confluence_space_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(health);

-- ============================================================
-- CHARTER (1:1 with project, JSONB — deeply nested, rarely queried)
-- ============================================================
CREATE TABLE IF NOT EXISTS charters (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================
-- PROJECT PLAN (1:1 with project, scalar fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_plans (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL DEFAULT '',
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_standards JSONB NOT NULL DEFAULT '[]'::jsonb,
  procurement_needs JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ============================================================
-- DELIVERABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  acceptance_criteria TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);

-- ============================================================
-- MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due ON milestones(due_date);

-- ============================================================
-- BUDGET ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '',
  planned NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  variance NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_budget_project ON budget_items(project_id);

-- ============================================================
-- GANTT TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS gantt_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  progress NUMERIC NOT NULL DEFAULT 0,
  assignee TEXT NOT NULL DEFAULT '',
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  wbs_node_id TEXT,
  parent_id TEXT,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gantt_project ON gantt_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_gantt_assignee ON gantt_tasks(assignee);

-- ============================================================
-- WBS (recursive tree — stored as JSONB per project)
-- ============================================================
CREATE TABLE IF NOT EXISTS wbs_data (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ============================================================
-- RACI (complex matrix — JSONB per project)
-- ============================================================
CREATE TABLE IF NOT EXISTS raci_data (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================
-- RISKS
-- ============================================================
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  probability INT NOT NULL DEFAULT 3,
  impact INT NOT NULL DEFAULT 3,
  severity INT NOT NULL DEFAULT 9,
  owner TEXT NOT NULL DEFAULT '',
  mitigation_strategy TEXT NOT NULL DEFAULT '',
  contingency_plan TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  linked_wbs_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_jira_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risks_project ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity DESC);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner);

-- ============================================================
-- ISSUES
-- ============================================================
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  owner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT NOT NULL DEFAULT '',
  linked_risk_id TEXT,
  linked_jira_key TEXT,
  due_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_owner ON issues(owner);

-- ============================================================
-- CHANGE LOG ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS change_log_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_changelog_project ON change_log_entries(project_id);

-- ============================================================
-- CHANGE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  requested_by TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  impact_on_deliverables TEXT NOT NULL DEFAULT '',
  cost_evaluation TEXT NOT NULL DEFAULT '',
  risk_evaluation TEXT NOT NULL DEFAULT '',
  quality_evaluation TEXT NOT NULL DEFAULT '',
  duration_impact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  approver_comments TEXT NOT NULL DEFAULT '',
  approved_by TEXT,
  approval_date TEXT,
  linked_jira_key TEXT,
  linked_risk_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_changereq_project ON change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_changereq_status ON change_requests(status);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  allocation_percent NUMERIC NOT NULL DEFAULT 100,
  cost_rate NUMERIC NOT NULL DEFAULT 0,
  assigned_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability TEXT NOT NULL DEFAULT 'available',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_resources_project ON resources(project_id);
CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(name);

-- ============================================================
-- ESTIMATES
-- ============================================================
CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL DEFAULT '',
  hours NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  material_cost NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimate_items(project_id);

-- ============================================================
-- KPIs
-- ============================================================
CREATE TABLE IF NOT EXISTS kpis (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  target NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  trend JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'on-track',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kpis_project ON kpis(project_id);
CREATE INDEX IF NOT EXISTS idx_kpis_status ON kpis(status);

-- ============================================================
-- ROADMAP ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS roadmap_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quarter TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'medium',
  swimlane TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_roadmap_project ON roadmap_items(project_id);

-- ============================================================
-- GOVERNANCE (1:1 JSONB — complex nested structure)
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_data (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================
-- FUNDING
-- ============================================================
CREATE TABLE IF NOT EXISTS funding (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  feasibility_notes TEXT NOT NULL DEFAULT '',
  partner_details TEXT NOT NULL DEFAULT '',
  financial_projections TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS funding_phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_funding_phases_project ON funding_phases(project_id);

-- ============================================================
-- STAKEHOLDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS stakeholders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  power INT NOT NULL DEFAULT 3,
  interest INT NOT NULL DEFAULT 3,
  engagement TEXT NOT NULL DEFAULT 'neutral',
  communication_preference TEXT NOT NULL DEFAULT '',
  contact_info TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_project ON stakeholders(project_id);

-- ============================================================
-- COMMUNICATION ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'meeting',
  name TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  last_executed TEXT,
  next_due TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_comms_project ON communication_items(project_id);

-- ============================================================
-- MEETINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  agenda TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  confluence_page_id TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

-- ============================================================
-- LESSONS LEARNED
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons_learned (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'process',
  what_worked TEXT NOT NULL DEFAULT '',
  what_didnt TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lessons_project ON lessons_learned(project_id);

-- ============================================================
-- DECISIONS (standalone)
-- ============================================================
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  options_considered TEXT NOT NULL DEFAULT '',
  decided_by TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  review_date TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- ============================================================
-- ASSUMPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS assumptions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assumption TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'business',
  owner TEXT NOT NULL DEFAULT '',
  validation_method TEXT NOT NULL DEFAULT '',
  target_validation_date TEXT NOT NULL DEFAULT '',
  validation_status TEXT NOT NULL DEFAULT 'unvalidated',
  impact_if_invalid TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assumptions_project ON assumptions(project_id);

-- ============================================================
-- STATUS REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS status_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL DEFAULT '',
  reporting_period TEXT NOT NULL DEFAULT '',
  prepared_by TEXT NOT NULL DEFAULT '',
  overall_status TEXT NOT NULL DEFAULT 'green',
  executive_summary TEXT NOT NULL DEFAULT '',
  accomplishments JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_period_plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks_text TEXT NOT NULL DEFAULT '',
  issues_text TEXT NOT NULL DEFAULT '',
  budget_status TEXT NOT NULL DEFAULT '',
  schedule_status TEXT NOT NULL DEFAULT '',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_status_reports_project ON status_reports(project_id);

-- ============================================================
-- ACTION ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'other',
  source_ref TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_actions_project ON action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_actions_owner ON action_items(owner);
CREATE INDEX IF NOT EXISTS idx_actions_due ON action_items(due_date);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  module TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);

-- ============================================================
-- BASELINE SNAPSHOTS (JSONB for snapshot data)
-- ============================================================
CREATE TABLE IF NOT EXISTS baseline_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_baselines_project ON baseline_snapshots(project_id);
