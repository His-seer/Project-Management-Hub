'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import type { RaciData, RaciRole, RaciActivity } from '@/types';
import { generateId } from '@/lib/ids';
import { Grid3X3, Plus, Trash2, AlertTriangle } from 'lucide-react';

type RaciValue = 'R' | 'A' | 'C' | 'I' | '';
const CYCLE: RaciValue[] = ['R', 'A', 'C', 'I', ''];
const COLORS: Record<string, string> = {
  R: 'bg-blue-500 text-white',
  A: 'bg-red-500 text-white',
  C: 'bg-green-500 text-white',
  I: 'bg-yellow-400 text-gray-900',
  '': 'bg-gray-100 dark:bg-gray-800 text-gray-400',
};

export default function RaciPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const raci = project.raci;

  const update = (partial: Partial<RaciData>) => {
    updateModule(projectId, 'raci', { ...raci, ...partial });
  };

  const addRole = () => {
    const role: RaciRole = { id: generateId(), name: 'New Role', title: '' };
    update({ roles: [...raci.roles, role] });
  };

  const removeRole = (id: string) => {
    const matrix = { ...raci.matrix };
    Object.keys(matrix).forEach((actId) => {
      const row = { ...matrix[actId] };
      delete row[id];
      matrix[actId] = row;
    });
    update({ roles: raci.roles.filter((r) => r.id !== id), matrix });
  };

  const addActivity = () => {
    const act: RaciActivity = { id: generateId(), name: 'New Activity', category: '' };
    update({ activities: [...raci.activities, act] });
  };

  const removeActivity = (id: string) => {
    const matrix = { ...raci.matrix };
    delete matrix[id];
    update({ activities: raci.activities.filter((a) => a.id !== id), matrix });
  };

  const cycleCell = (actId: string, roleId: string) => {
    const current = raci.matrix[actId]?.[roleId] || '';
    const next = CYCLE[(CYCLE.indexOf(current as RaciValue) + 1) % CYCLE.length];
    const matrix = { ...raci.matrix, [actId]: { ...raci.matrix[actId], [roleId]: next } };
    update({ matrix });
  };

  const renameRole = (id: string, name: string) => {
    update({ roles: raci.roles.map((r) => (r.id === id ? { ...r, name } : r)) });
  };

  const renameActivity = (id: string, name: string) => {
    update({ activities: raci.activities.map((a) => (a.id === id ? { ...a, name } : a)) });
  };

  // Validate: each activity needs at least one R and one A
  const activitiesWithoutR = raci.activities.filter(
    (a) => !Object.values(raci.matrix[a.id] ?? {}).includes('R')
  );
  const activitiesWithoutA = raci.activities.filter(
    (a) => !Object.values(raci.matrix[a.id] ?? {}).includes('A')
  );
  const activitiesWithMultipleA = raci.activities.filter(
    (a) => Object.values(raci.matrix[a.id] ?? {}).filter((v) => v === 'A').length > 1
  );

  const raciIssues: string[] = [];
  if (activitiesWithoutR.length > 0)
    raciIssues.push(`${activitiesWithoutR.length} activit${activitiesWithoutR.length > 1 ? 'ies' : 'y'} with no Responsible (R)`);
  if (activitiesWithoutA.length > 0)
    raciIssues.push(`${activitiesWithoutA.length} activit${activitiesWithoutA.length > 1 ? 'ies' : 'y'} with no Accountable (A)`);
  if (activitiesWithMultipleA.length > 0)
    raciIssues.push(`${activitiesWithMultipleA.length} activit${activitiesWithMultipleA.length > 1 ? 'ies' : 'y'} with multiple Accountable (only 1 allowed)`);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Grid3X3 size={24} />
        RACI Matrix
      </h1>

      {raciIssues.length > 0 && raci.activities.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">RACI validation issues:</span>{' '}
            {raciIssues.join('; ')}.
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 overflow-x-auto">
        <div className="flex gap-2 mb-4">
          <button onClick={addActivity} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
            <Plus size={14} /> Add Activity
          </button>
          <button onClick={addRole} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
            <Plus size={14} /> Add Role
          </button>
        </div>

        <div className="flex gap-1 text-xs text-gray-500 mb-3">
          <span className="px-2 py-0.5 bg-blue-500 text-white rounded">R = Responsible</span>
          <span className="px-2 py-0.5 bg-red-500 text-white rounded">A = Accountable</span>
          <span className="px-2 py-0.5 bg-green-500 text-white rounded">C = Consulted</span>
          <span className="px-2 py-0.5 bg-yellow-400 text-gray-900 rounded">I = Informed</span>
        </div>

        {raci.activities.length > 0 && raci.roles.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
                  Activity
                </th>
                {raci.roles.map((role) => (
                  <th key={role.id} className="px-2 py-2 text-center border-b border-gray-200 dark:border-gray-700 min-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        value={role.name}
                        onChange={(e) => renameRole(role.id, e.target.value)}
                        className="w-20 text-xs font-semibold text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 text-gray-700 dark:text-gray-300 outline-none"
                      />
                      <button onClick={() => removeRole(role.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raci.activities.map((act) => (
                <tr key={act.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        value={act.name}
                        onChange={(e) => renameActivity(act.id, e.target.value)}
                        className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 text-gray-800 dark:text-gray-200 outline-none"
                      />
                      <button onClick={() => removeActivity(act.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                  {raci.roles.map((role) => {
                    const val = (raci.matrix[act.id]?.[role.id] || '') as RaciValue;
                    return (
                      <td key={role.id} className="px-2 py-2 text-center">
                        <button
                          onClick={() => cycleCell(act.id, role.id)}
                          className={`w-10 h-8 rounded font-bold text-xs ${COLORS[val]} transition-colors`}
                        >
                          {val || '-'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(raci.activities.length === 0 || raci.roles.length === 0) && (
          <p className="text-gray-400 text-sm">Add activities and roles to build your RACI matrix.</p>
        )}
      </div>
    </div>
  );
}
