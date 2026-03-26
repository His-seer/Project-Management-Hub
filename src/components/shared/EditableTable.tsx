'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, GripVertical, Search, ChevronUp, ChevronDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/shared/Toast';

export interface Column<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  width?: string;
  editable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface EditableTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onUpdate: (data: T[]) => void;
  createRow: () => T;
  emptyMessage?: string;
  exportFilename?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function EditableTable<T extends { id: string }>({
  data,
  columns,
  onUpdate,
  createRow,
  emptyMessage = 'No items yet. Click "Add Row" to get started.',
  exportFilename,
}: EditableTableProps<T>) {
  const { showToast } = useToast();
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleColumnSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let rows = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          if (val == null) return false;
          if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(q));
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => {
        const aVal = a[sortKey as keyof T];
        const bVal = b[sortKey as keyof T];
        const aStr = aVal == null ? '' : String(aVal);
        const bStr = bVal == null ? '' : String(bVal);

        const aNum = Number(aStr);
        const bNum = Number(bStr);
        if (!isNaN(aNum) && !isNaN(bNum) && aStr !== '' && bStr !== '') {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, search, sortKey, sortDir, columns]);

  const handleCellChange = (rowId: string, key: string, value: string | number) => {
    const updated = data.map((row) =>
      row.id === rowId ? { ...row, [key]: value } : row
    );
    onUpdate(updated);
  };

  const handleAddRow = () => {
    onUpdate([...data, createRow()]);
  };

  const handleDeleteRow = (id: string) => {
    const snapshot = data;
    onUpdate(data.filter((row) => row.id !== id));
    showToast('Row deleted', () => onUpdate(snapshot));
  };

  const handleExportXlsx = () => {
    const rows = data.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col) => {
        obj[col.label] = row[col.key];
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${exportFilename || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      {/* Search bar + export */}
      <div className="mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {exportFilename && data.length > 0 && (
          <button
            onClick={handleExportXlsx}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileSpreadsheet size={13} />
            Export XLSX
          </button>
        )}
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="w-8 px-2 py-2" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => handleColumnSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp size={12} className="text-blue-500" />
                      ) : (
                        <ChevronDown size={12} className="text-blue-500" />
                      )
                    ) : (
                      <span className="w-3" />
                    )}
                  </span>
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                >
                  {search ? 'No matching rows found.' : emptyMessage}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 py-1 text-gray-300 dark:text-gray-600">
                    <GripVertical size={14} />
                  </td>
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                    const value = row[col.key];
                    const editable = col.editable !== false;

                    if (col.render && !isEditing) {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-1.5 cursor-pointer"
                          onClick={() => editable && setEditingCell({ rowId: row.id, colKey: col.key })}
                        >
                          {col.render(value, row)}
                        </td>
                      );
                    }

                    if (col.type === 'select') {
                      return (
                        <td key={col.key} className="px-3 py-1.5">
                          <select
                            value={String(value ?? '')}
                            onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            {col.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    if (isEditing || col.type === 'date') {
                      return (
                        <td key={col.key} className="px-3 py-1.5">
                          <input
                            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                            value={String(value ?? '')}
                            onChange={(e) =>
                              handleCellChange(
                                row.id,
                                col.key,
                                col.type === 'number' ? Number(e.target.value) : e.target.value
                              )
                            }
                            onBlur={() => setEditingCell(null)}
                            autoFocus={isEditing}
                            className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className="px-3 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer"
                        onClick={() => editable && setEditingCell({ rowId: row.id, colKey: col.key })}
                      >
                        {String(value ?? '')}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={handleAddRow}
        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        <Plus size={14} />
        Add Row
      </button>
    </div>
  );
}
