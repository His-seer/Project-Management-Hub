'use client';

import type { ProjectMeta } from '@/types';

interface Props {
  meta: ProjectMeta;
  title: string;
  subtitle?: string;
  captureImage: string | null;
}

/**
 * Generic print-document wrapper that shows a project header + a full-page
 * screenshot of the captured content. Used by KPI Dashboard, Project Overview, etc.
 */
export function ScreenshotPrint({ meta, title, subtitle, captureImage }: Props) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  if (!captureImage) return null;

  return (
    <div className="print-document" id="screenshot-print">
      {/* Header */}
      <div className="print-doc-header">
        <div>
          <div className="print-doc-title">{meta.name}</div>
          <div className="print-doc-subtitle">{title}</div>
          {subtitle && <div style={{ fontSize: '9pt', color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div className="print-doc-meta">
          Printed: {today}
        </div>
      </div>

      {/* Full-page screenshot */}
      <img
        src={captureImage}
        alt={title}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6, marginTop: 8 }}
      />

      {/* Footer */}
      <div className="print-footer">
        <span>{meta.name} — {title}</span>
        <span>Confidential — For internal use only</span>
      </div>
    </div>
  );
}
