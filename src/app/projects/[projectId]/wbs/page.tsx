'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import type { WbsNode } from '@/types';
import { generateId } from '@/lib/ids';
import { Network, ChevronRight, ChevronDown, Plus, Trash2, Link } from 'lucide-react';
import { useState } from 'react';

export default function WbsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);

  if (!project) return null;

  const wbs = project.wbs;

  const updateWbs = (nodes: WbsNode[]) => {
    updateModule(projectId, 'wbs', nodes);
  };

  const addRootNode = () => {
    updateWbs([
      ...wbs,
      { id: generateId(), name: 'New Work Package', description: '', children: [], linkedTaskIds: [] },
    ]);
  };

  const updateNode = (nodes: WbsNode[], nodeId: string, updater: (n: WbsNode) => WbsNode): WbsNode[] => {
    return nodes.map((n) => {
      if (n.id === nodeId) return updater(n);
      return { ...n, children: updateNode(n.children, nodeId, updater) };
    });
  };

  const deleteNode = (nodes: WbsNode[], nodeId: string): WbsNode[] => {
    return nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({ ...n, children: deleteNode(n.children, nodeId) }));
  };

  const handleAddChild = (parentId: string) => {
    const child: WbsNode = { id: generateId(), name: 'New Item', description: '', children: [], linkedTaskIds: [] };
    updateWbs(
      updateNode(wbs, parentId, (n) => ({ ...n, children: [...n.children, child] }))
    );
  };

  const handleRename = (nodeId: string, name: string) => {
    updateWbs(updateNode(wbs, nodeId, (n) => ({ ...n, name })));
  };

  const handleDelete = (nodeId: string) => {
    updateWbs(deleteNode(wbs, nodeId));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Network size={24} />
        Work Breakdown Structure
      </h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        {wbs.length === 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">No work packages yet. Add a root node to get started.</p>
        )}
        <div className="space-y-1">
          {wbs.map((node) => (
            <WbsTreeNode
              key={node.id}
              node={node}
              depth={0}
              onAddChild={handleAddChild}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <button
          onClick={addRootNode}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Root Node
        </button>
      </div>
    </div>
  );
}

function WbsTreeNode({
  node,
  depth,
  onAddChild,
  onRename,
  onDelete,
}: {
  node: WbsNode;
  depth: number;
  onAddChild: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div className="flex items-center gap-1 group py-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center text-gray-400"
        >
          {node.children.length > 0 ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3.5 h-0.5 bg-gray-300 dark:bg-gray-600 rounded" />
          )}
        </button>

        {editing ? (
          <input
            autoFocus
            value={node.name}
            onChange={(e) => onRename(node.id, e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            className="px-2 py-0.5 text-sm border border-blue-300 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-600"
          >
            {node.name}
          </span>
        )}

        {node.linkedTaskIds.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 ml-1">
            <Link size={10} /> {node.linkedTaskIds.length}
          </span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity">
          <button
            onClick={() => onAddChild(node.id)}
            className="p-0.5 text-gray-400 hover:text-blue-500"
            title="Add child"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-0.5 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expanded &&
        node.children.map((child) => (
          <WbsTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onAddChild={onAddChild}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
