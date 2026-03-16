'use client';

import type { Risk, ProjectMeta } from '@/types';

interface Props {
  risks: Risk[];
  meta: ProjectMeta;
}

function severityColor(s: number) {
  if (s >= 15) return 'print-badge-red';
  if (s >= 8) return 'print-badge-amber';
  if (s >= 4) return 'print-badge-blue';
  return 'print-badge-green';
}

function severityLabel(s: number) {
  if (s >= 15) return 'Critical';
  if (s >= 8) return 'High';
  if (s >= 4) return 'Medium';
  return 'Low';
}

const statusLabel: Record<Risk['status'], string> = {
  open: 'Open',
  mitigating: 'Mitigating',
  closed: 'Closed',
  accepted: 'Accepted',
};

const statusClass: Record<Risk['status'], string> = {
  open: 'print-badge-red',
  mitigating: 'print-badge-amber',
  closed: 'print-badge-green',
  accepted: 'print-badge-gray',
};

export function RiskRegisterPrint({ risks, meta }: Props) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const open = risks.filter((r) => r.status === 'open' || r.status === 'mitigating');
  const critical = risks.filter((r) => r.severity >= 15);
  const high = risks.filter((r) => r.severity >= 8 && r.severity < 15);

  const sorted = [...risks].sort((a, b) => b.severity - a.severity);

  return (
    <div className="print-document" id="risk-register-print">
      {/* Header */}
      <div className="print-doc-header">
        <div>
          <div className="print-doc-title">{meta.name}</div>
          <div className="print-doc-subtitle">Risk Register</div>
        </div>
        <div className="print-doc-meta">
          Total Risks: {risks.length}<br />
          Open: {open.length} | Critical: {critical.length}<br />
          Printed: {today}
        </div>
      </div>

      {/* Summary stats */}
      <div className="print-section-heading">1. Risk Summary</div>
      <div className="print-grid-3" style={{ marginBottom: 12 }}>
        <div className="print-info-box">
          <div className="print-info-box-label">Total Risks</div>
          <div className="print-info-box-value" style={{ fontSize: '18pt', fontWeight: 700, color: '#1e3a5f' }}>{risks.length}</div>
        </div>
        <div className="print-info-box">
          <div className="print-info-box-label">Open / Mitigating</div>
          <div className="print-info-box-value" style={{ fontSize: '18pt', fontWeight: 700, color: '#d97706' }}>{open.length}</div>
        </div>
        <div className="print-info-box">
          <div className="print-info-box-label">Critical (15–25)</div>
          <div className="print-info-box-value" style={{ fontSize: '18pt', fontWeight: 700, color: critical.length > 0 ? '#dc2626' : '#065f46' }}>{critical.length}</div>
        </div>
      </div>

      {/* Risk Matrix legend */}
      <div className="print-sub-heading">Severity Matrix: P × I</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, fontSize: '8pt' }}>
        {[
          { label: 'Low (1–3)', cls: 'print-badge print-badge-green' },
          { label: 'Medium (4–7)', cls: 'print-badge print-badge-blue' },
          { label: 'High (8–14)', cls: 'print-badge print-badge-amber' },
          { label: 'Critical (15–25)', cls: 'print-badge print-badge-red' },
        ].map((b) => (
          <span key={b.label} className={b.cls}>{b.label}</span>
        ))}
      </div>

      {/* Risk Register table */}
      <div className="print-section-heading">2. Risk Register</div>
      {sorted.length === 0 ? (
        <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No risks recorded.</p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>#</th>
              <th style={{ width: '20%' }}>Risk Title</th>
              <th style={{ width: '10%' }}>Category</th>
              <th style={{ width: '5%' }}>P</th>
              <th style={{ width: '5%' }}>I</th>
              <th style={{ width: '8%' }}>Severity</th>
              <th style={{ width: '10%' }}>Owner</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '28%' }}>Mitigation Strategy</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                <td><strong>{r.title}</strong>{r.description ? <><br /><span style={{ fontSize: '8pt', color: '#64748b' }}>{r.description}</span></> : null}</td>
                <td>{r.category}</td>
                <td style={{ textAlign: 'center' }}>{r.probability}</td>
                <td style={{ textAlign: 'center' }}>{r.impact}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`print-badge ${severityColor(r.severity)}`}>
                    {r.severity} — {severityLabel(r.severity)}
                  </span>
                </td>
                <td>{r.owner}</td>
                <td><span className={`print-badge ${statusClass[r.status]}`}>{statusLabel[r.status]}</span></td>
                <td>{r.mitigationStrategy || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Contingency Plans for critical/high */}
      {(critical.length > 0 || high.length > 0) && (
        <>
          <div className="print-section-heading print-break-before">3. Contingency Plans (High / Critical Risks)</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Risk</th>
                <th style={{ width: '10%' }}>Severity</th>
                <th style={{ width: '65%' }}>Contingency Plan</th>
              </tr>
            </thead>
            <tbody>
              {[...critical, ...high].map((r) => (
                <tr key={`cp-${r.id}`}>
                  <td>{r.title}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`print-badge ${severityColor(r.severity)}`}>{r.severity}</span>
                  </td>
                  <td>{r.contingencyPlan || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Footer */}
      <div className="print-footer">
        <span>{meta.name} — Risk Register</span>
        <span>Confidential — For internal use only</span>
      </div>
    </div>
  );
}
