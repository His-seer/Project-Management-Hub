import type { Project } from '@/types';

interface ValidationResult {
  valid: boolean;
  error?: string;
  projects?: Record<string, Project>;
}

function isProjectLike(obj: unknown): obj is Project {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    p.meta !== null &&
    typeof p.meta === 'object' &&
    typeof (p.meta as Record<string, unknown>).id === 'string' &&
    typeof (p.meta as Record<string, unknown>).name === 'string' &&
    Array.isArray(p.risks) &&
    p.plan !== null &&
    typeof p.plan === 'object'
  );
}

export function validateProjectData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid file: expected a JSON object.' };
  }

  // Single project import: root has a `meta` field directly
  if (isProjectLike(data)) {
    const p = data as Project;
    return { valid: true, projects: { [p.meta.id]: p } };
  }

  // Multi-project import: Record<string, Project>
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) {
    return { valid: false, error: 'File contains no projects.' };
  }

  for (const key of keys) {
    if (!isProjectLike(record[key])) {
      return { valid: false, error: `Invalid project data for key "${key}". Expected a valid project object.` };
    }
  }

  return { valid: true, projects: record as Record<string, Project> };
}
