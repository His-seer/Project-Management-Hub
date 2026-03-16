'use client';

import { useRef, useState } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { validateProjectData } from '@/lib/validateImport';
import { useToast } from '@/components/shared/Toast';
import { Download, Upload, AlertTriangle } from 'lucide-react';

interface Props {
  projectId?: string;
  compact?: boolean;
}

export function DataManagement({ projectId, compact }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const importProjects = useProjectStore((s) => s.importProjects);
  const mergeProjects = useProjectStore((s) => s.mergeProjects);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null);

  const handleExport = () => {
    let data: unknown;
    let filename: string;
    const date = new Date().toISOString().split('T')[0];

    if (projectId) {
      const p = projects[projectId];
      if (!p) return;
      data = p;
      const safeName = p.meta.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
      filename = `pm-hub-${safeName}-${date}.json`;
    } else {
      data = projects;
      filename = `pm-hub-backup-${date}.json`;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported: ${filename}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const result = validateProjectData(json);
        if (!result.valid) {
          showToast(result.error ?? 'Invalid file format');
          return;
        }
        setPendingData(result.projects!);
        setShowMergeDialog(true);
      } catch {
        showToast('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  const handleImport = (mode: 'merge' | 'replace') => {
    if (!pendingData) return;
    const count = Object.keys(pendingData).length;
    if (mode === 'replace') {
      importProjects(pendingData as Record<string, never>);
    } else {
      mergeProjects(pendingData as Record<string, never>);
    }
    showToast(`Imported ${count} project${count !== 1 ? 's' : ''} (${mode})`);
    setPendingData(null);
    setShowMergeDialog(false);
  };

  const btnClass = compact
    ? 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400'
    : 'btn-secondary';

  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={handleExport} className={btnClass}>
          <Download size={compact ? 13 : 15} />
          {projectId ? 'Export Project' : 'Export All'}
        </button>
        {!projectId && (
          <>
            <button onClick={() => fileRef.current?.click()} className={btnClass}>
              <Upload size={compact ? 13 : 15} />
              Import
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
          </>
        )}
      </div>

      {/* Merge vs Replace Dialog */}
      {showMergeDialog && pendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Import {Object.keys(pendingData).length} project(s)</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              How should imported projects be handled?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleImport('merge')}
                className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Merge — add to existing projects
              </button>
              <button
                onClick={() => handleImport('replace')}
                className="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Replace — overwrite all projects
              </button>
              <button
                onClick={() => { setShowMergeDialog(false); setPendingData(null); }}
                className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
