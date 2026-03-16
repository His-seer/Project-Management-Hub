'use client';

import type { Charter, CharterApproval, ProjectMeta } from '@/types';

interface Props {
  charter: Charter;
  meta: ProjectMeta;
}

const statusLabel: Record<CharterApproval['status'], string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

const statusClass: Record<CharterApproval['status'], string> = {
  approved: 'print-badge print-badge-green',
  pending: 'print-badge print-badge-amber',
  rejected: 'print-badge print-badge-red',
};

function ListPrint({ items }: { items: string[] }) {
  if (!items?.length) return <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>None recorded.</p>;
  return (
    <ul className="print-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-info-box">
      <div className="print-info-box-label">{label}</div>
      <div className="print-info-box-value">{value || '—'}</div>
    </div>
  );
}

export function CharterPrint({ charter, meta }: Props) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="print-document" id="charter-print">
      {/* ── Document Header ── */}
      <div className="print-doc-header">
        <div>
          <div className="print-doc-title">{meta.name}</div>
          <div className="print-doc-subtitle">Project Charter</div>
        </div>
        <div className="print-doc-meta">
          Version {charter.documentVersion || '1.0'}<br />
          Owner: {charter.documentOwner || '—'}<br />
          Issued: {charter.issueDate || '—'}<br />
          Printed: {today}
        </div>
      </div>

      {/* ── Document Control ── */}
      <div className="print-section-heading">1. Document Control</div>
      <div className="print-grid-3">
        <InfoBox label="Document Version" value={charter.documentVersion || '1.0'} />
        <InfoBox label="Document Owner" value={charter.documentOwner} />
        <InfoBox label="Issue Date" value={charter.issueDate} />
      </div>

      {/* ── Executive Summary ── */}
      <div className="print-section-heading">2. Executive Summary</div>
      <p className="print-body">{charter.executiveSummary || 'Not yet completed.'}</p>

      {/* ── Purpose & Vision ── */}
      <div className="print-section-heading">3. Project Purpose &amp; Vision</div>
      <div className="print-no-break">
        <div className="print-sub-heading">Project Purpose</div>
        <p className="print-body">{charter.projectPurpose || '—'}</p>
        <div className="print-sub-heading">Vision Statement</div>
        <p className="print-body">{charter.vision || '—'}</p>
      </div>

      {/* ── Objectives ── */}
      <div className="print-section-heading">4. Objectives</div>
      <div className="print-grid-3">
        <div>
          <div className="print-sub-heading">Project Objectives</div>
          <ListPrint items={charter.objectives} />
        </div>
        <div>
          <div className="print-sub-heading">Business Objectives</div>
          <ListPrint items={charter.businessObjectives ?? []} />
        </div>
        <div>
          <div className="print-sub-heading">Technology Objectives</div>
          <ListPrint items={charter.technologyObjectives ?? []} />
        </div>
      </div>

      {/* ── Scope ── */}
      <div className="print-section-heading">5. Scope</div>
      <div className="print-grid-2">
        <div>
          <div className="print-sub-heading">In Scope</div>
          <p className="print-body">{charter.scope || '—'}</p>
        </div>
        <div>
          <div className="print-sub-heading">Out of Scope</div>
          <p className="print-body">{charter.outOfScope || '—'}</p>
        </div>
      </div>

      {/* ── Assumptions & Constraints ── */}
      <div className="print-section-heading">6. Assumptions &amp; Constraints</div>
      <div className="print-grid-2">
        <div>
          <div className="print-sub-heading">Assumptions</div>
          <ListPrint items={charter.assumptions} />
        </div>
        <div>
          <div className="print-sub-heading">Constraints</div>
          <ListPrint items={charter.constraints} />
        </div>
      </div>

      {/* ── Quality ── */}
      <div className="print-section-heading">7. Quality Management</div>
      <div className="print-sub-heading">Quality Standards</div>
      <ListPrint items={charter.qualityStandards ?? []} />
      <div className="print-sub-heading">Quality Assurance Approach</div>
      <p className="print-body">{charter.qualityAssurance || '—'}</p>

      {/* ── Success Criteria ── */}
      <div className="print-section-heading">8. Success Criteria</div>
      <ListPrint items={charter.successCriteria} />

      {/* ── Sponsors ── */}
      <div className="print-section-heading">9. Project Sponsors</div>
      <ListPrint items={charter.sponsors} />

      {/* ── Approvals ── */}
      <div className="print-section-heading print-break-before">10. Approvals</div>
      {charter.approvals?.length > 0 ? (
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Role</th>
              <th style={{ width: '25%' }}>Name</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '15%' }}>Date</th>
              <th style={{ width: '20%' }}>Signature</th>
            </tr>
          </thead>
          <tbody>
            {charter.approvals.map((a) => (
              <tr key={a.id}>
                <td>{a.role}</td>
                <td>{a.name || '—'}</td>
                <td><span className={statusClass[a.status]}>{statusLabel[a.status]}</span></td>
                <td>{a.date || '—'}</td>
                <td><div className="print-signature-line" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="print-body" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No approvers recorded.</p>
      )}

      {charter.approvalDate && (
        <p className="print-body" style={{ marginTop: 8 }}>
          <strong>Charter Approval Date:</strong> {charter.approvalDate}
        </p>
      )}

      {/* Footer */}
      <div className="print-footer">
        <span>{meta.name} — Project Charter v{charter.documentVersion || '1.0'}</span>
        <span>Confidential — For internal use only</span>
      </div>
    </div>
  );
}
