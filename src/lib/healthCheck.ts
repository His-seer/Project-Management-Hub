/**
 * Proactive health check — analyzes project data and generates notifications.
 * Runs client-side when a project is loaded.
 */

import type { Project } from '@/types';
import type { Notification, NotificationType, NotificationSource } from '@/stores/useNotificationStore';

interface HealthAlert {
  type: NotificationType;
  source: NotificationSource;
  title: string;
  message: string;
  module?: string;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * Analyze a project and return proactive alerts.
 * Called when project data is loaded/refreshed.
 */
export function runHealthCheck(project: Project, projectId: string): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const today = new Date();

  // ── Overdue milestones ──
  const overdueMilestones = (project.plan.milestones ?? []).filter(
    (m) => m.status !== 'completed' && m.status !== 'missed' && m.dueDate && new Date(m.dueDate) < today
  );
  if (overdueMilestones.length > 0) {
    alerts.push({
      type: 'warning',
      source: 'deadline-watch',
      title: `${overdueMilestones.length} overdue milestone${overdueMilestones.length > 1 ? 's' : ''}`,
      message: overdueMilestones.map((m) => `"${m.name}" was due ${m.dueDate}`).join('; '),
      module: 'plan',
      actionLabel: 'View Gantt',
      actionHref: `/projects/${projectId}/gantt`,
    });
  }

  // ── Milestones due within 7 days ──
  const sevenDays = new Date(today.getTime() + 7 * 86400000);
  const upcomingMilestones = (project.plan.milestones ?? []).filter(
    (m) => m.status !== 'completed' && m.status !== 'missed' && m.dueDate &&
      new Date(m.dueDate) >= today && new Date(m.dueDate) <= sevenDays
  );
  if (upcomingMilestones.length > 0) {
    alerts.push({
      type: 'info',
      source: 'deadline-watch',
      title: `${upcomingMilestones.length} milestone${upcomingMilestones.length > 1 ? 's' : ''} due this week`,
      message: upcomingMilestones.map((m) => `"${m.name}" due ${m.dueDate}`).join('; '),
      module: 'plan',
    });
  }

  // ── Critical risks (severity >= 15) ──
  const criticalRisks = project.risks.filter((r) => r.severity >= 15 && r.status !== 'closed');
  if (criticalRisks.length > 0) {
    alerts.push({
      type: 'warning',
      source: 'risk-monitor',
      title: `${criticalRisks.length} critical risk${criticalRisks.length > 1 ? 's' : ''} need attention`,
      message: criticalRisks.slice(0, 3).map((r) => `"${r.title}" (severity: ${r.severity})`).join('; '),
      module: 'risks',
      actionLabel: 'View Risks',
      actionHref: `/projects/${projectId}/risks`,
    });
  }

  // ── Blocked issues ──
  const blockedIssues = project.issues.filter((i) => i.status === 'blocked');
  if (blockedIssues.length > 0) {
    alerts.push({
      type: 'warning',
      source: 'health-check',
      title: `${blockedIssues.length} blocked issue${blockedIssues.length > 1 ? 's' : ''}`,
      message: blockedIssues.slice(0, 3).map((i) => `"${i.title}" (${i.priority})`).join('; '),
      module: 'issues',
      actionLabel: 'View Issues',
      actionHref: `/projects/${projectId}/issues`,
    });
  }

  // ── Overdue action items ──
  const overdueActions = project.actionItems.filter(
    (a) => (a.status === 'open' || a.status === 'in-progress') && a.dueDate && new Date(a.dueDate) < today
  );
  if (overdueActions.length > 0) {
    alerts.push({
      type: 'warning',
      source: 'deadline-watch',
      title: `${overdueActions.length} overdue action item${overdueActions.length > 1 ? 's' : ''}`,
      message: overdueActions.slice(0, 3).map((a) => `"${a.title}" (owner: ${a.owner || 'unassigned'})`).join('; '),
      module: 'actionItems',
      actionLabel: 'View Actions',
      actionHref: `/projects/${projectId}/actions`,
    });
  }

  // ── Budget warning (>80% spent) ──
  const totalBudget = project.funding.totalBudget || 0;
  const spent = (project.plan.budget ?? []).reduce((s, b) => s + (b.actual || 0), 0);
  if (totalBudget > 0 && spent / totalBudget > 0.8) {
    const pct = Math.round((spent / totalBudget) * 100);
    alerts.push({
      type: pct >= 95 ? 'warning' : 'suggestion',
      source: 'health-check',
      title: `Budget ${pct}% consumed`,
      message: `$${spent.toLocaleString()} of $${totalBudget.toLocaleString()} budget has been spent.`,
      module: 'funding',
      actionLabel: 'View Funding',
      actionHref: `/projects/${projectId}/funding`,
    });
  }

  // ── Stale stakeholder engagement (no update in 14 days) ──
  const staleComms = (project.communications ?? []).filter(
    (c) => c.lastExecuted && new Date(c.lastExecuted) < new Date(today.getTime() - 14 * 86400000)
  );
  if (staleComms.length > 0) {
    alerts.push({
      type: 'suggestion',
      source: 'health-check',
      title: `${staleComms.length} stale communication${staleComms.length > 1 ? 's' : ''}`,
      message: `Some stakeholder communications haven't been executed in over 2 weeks.`,
      module: 'communications',
    });
  }

  // ── Off-track KPIs ──
  const offTrackKpis = (project.kpis ?? []).filter((k) => k.status === 'off-track');
  if (offTrackKpis.length > 0) {
    alerts.push({
      type: 'warning',
      source: 'health-check',
      title: `${offTrackKpis.length} KPI${offTrackKpis.length > 1 ? 's' : ''} off-track`,
      message: offTrackKpis.slice(0, 3).map((k) => `"${k.name}": ${k.actual}${k.unit} vs target ${k.target}${k.unit}`).join('; '),
      module: 'kpis',
      actionLabel: 'View KPIs',
      actionHref: `/projects/${projectId}/kpis`,
    });
  }

  return alerts;
}
