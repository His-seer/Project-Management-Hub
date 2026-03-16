'use client';

import type { StatusReport, ProjectMeta, Risk, Issue } from '@/types';

interface Props {
  report: StatusReport;
  meta: ProjectMeta;
  risks: Risk[];
  issues: Issue[];
}

const healthColors = {
  green: { bg: '#d1fae5', color: '#065f46', label: 'On Track' },
  amber: { bg: '#fef3c7', color: '#92400e', label: 'At Risk' },
  red:   { bg: '#fee2e2', color: '#991b1b', label: 'Critical' },
};

export function StatusReportPrint({ report, meta, risks, issues }: Props) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const hc = healthColors[report.overallStatus];
  const openRisks = risks.filter((r) => r.status === 'open' || r.status === 'mitigating');
  const criticalRisks = risks.filter((r) => r.severity >= 15);
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in-progress' || i.status === 'blocked');

  return (
    <div className="print-document" id="status-report-print">
      {/* Header */}
      <div className="print-doc-header">
        <div>
          <div className="print-doc-title">{meta.name}</div>
          <div className="print-doc-subtitle">Project Status Report</div>
        </div>
        <div className="print-doc-meta">
          Period: {report.reportingPeriod}<br />
          Prepared by: {report.preparedBy || '—'}<br />
          Date: {report.reportDate || today}<br />
          Printed: {today}
        </div>
      </div>

      {/* Overall status banner */}
      <div
        style={{
          background: hc.bg,
          color: hc.color,
          padding: '8pt 12pt',
          borderRadius: '4pt',
          marginBottom: '12pt',
          fontWeight: 700,
          fontSize: '12pt',
          display: 'flex',
          alignItems: 'center',
          gap: '8pt',
        }}
      >
        <span style={{
          display: 'inline-block',
          width: '12pt',
          height: '12pt',
          borderRadius: '50%',
          background: hc.color,
          flexShrink: 0,
        }} />
        Overall Project Status: {hc.label.toUpperCase()}
      </div>

      {/* Key metrics */}
      <div className="print-section-heading">1. Key Metrics</div>
      <div className="print-grid-3">
        <div className="print-info-box">
          <div className="print-info-box-label">Budget Status</div>
          <div className="print-info-box-value">{report.budgetStatus || '—'}</div>
        </div>
        <div className="print-info-box">
          <div className="print-info-box-label">Schedule Status</div>
          <div className="print-info-box-value">{report.scheduleStatus || '—'}</div>
        </div>
        <div className="print-info-box">
          <div className="print-info-box-label">Open Risks / Issues</div>
          <div className="print-info-box-value">{openRisks.length} risks · {openIssues.length} issues</div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="print-section-heading">2. Executive Summary</div>
      <p className="print-body">{report.executiveSummary || '—'}</p>

      {/* Accomplishments */}
      <div className="print-section-heading">3. Accomplishments This Period</div>
      {report.accomplishments?.length > 0 ? (
        <ul className="print-list">
          {report.accomplishments.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      ) : (
        <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>None recorded.</p>
      )}

      {/* Next period plans */}
      <div className="print-section-heading">4. Plans for Next Period</div>
      {report.nextPeriodPlans?.length > 0 ? (
        <ul className="print-list">
          {report.nextPeriodPlans.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      ) : (
        <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>None recorded.</p>
      )}

      {/* Risks */}
      <div className="print-section-heading">5. Risks</div>
      <p className="print-body">{report.risks || '—'}</p>
      {criticalRisks.length > 0 && (
        <>
          <div className="print-sub-heading">Critical Risks Requiring Attention</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Risk</th>
                <th style={{ width: '10%' }}>Severity</th>
                <th style={{ width: '20%' }}>Owner</th>
                <th style={{ width: '35%' }}>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {criticalRisks.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td style={{ textAlign: 'center' }}><span className="print-badge print-badge-red">{r.severity}</span></td>
                  <td>{r.owner}</td>
                  <td>{r.mitigationStrategy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Issues */}
      <div className="print-section-heading">6. Issues</div>
      <p className="print-body">{report.issues || '—'}</p>
      {openIssues.length > 0 && (
        <>
          <div className="print-sub-heading">Open Issues</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Issue</th>
                <th style={{ width: '12%' }}>Priority</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '20%' }}>Owner</th>
                <th style={{ width: '21%' }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {openIssues.map((i) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td>
                    <span className={`print-badge ${i.priority === 'critical' || i.priority === 'high' ? 'print-badge-red' : i.priority === 'medium' ? 'print-badge-amber' : 'print-badge-gray'}`}>
                      {i.priority}
                    </span>
                  </td>
                  <td>{i.status}</td>
                  <td>{i.owner}</td>
                  <td>{i.dueDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {report.aiGenerated && (
        <p style={{ fontSize: '8pt', color: '#94a3b8', marginTop: '12pt', fontStyle: 'italic' }}>
          ✦ This report was generated with AI assistance and reviewed by the project manager.
        </p>
      )}

      {/* Footer */}
      <div className="print-footer">
        <span>{meta.name} — Status Report · {report.reportingPeriod}</span>
        <span>Confidential — For internal use only</span>
      </div>
    </div>
  );
}
