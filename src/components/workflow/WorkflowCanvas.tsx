'use client';

import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './WorkflowNodes';
import NodePalette from './NodePalette';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { generateId } from '@/lib/ids';
import type { WorkflowNodeData } from '@/types/workflow';

interface WorkflowCanvasProps {
  workflowId: string;
}

function WorkflowCanvasInner({ workflowId }: WorkflowCanvasProps) {
  const workflow = useWorkflowStore((s) => s.workflows[workflowId]);
  const updateNodes = useWorkflowStore((s) => s.updateNodes);
  const updateEdges = useWorkflowStore((s) => s.updateEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    (workflow?.nodes ?? []).map((n) => ({ ...n, type: n.type })) as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (workflow?.edges ?? []) as Edge[]
  );

  // Save to store on changes
  const saveNodes = useCallback(
    (newNodes: Node[]) => {
      updateNodes(workflowId, newNodes.map((n) => ({
        id: n.id,
        type: n.type || 'action',
        position: n.position,
        data: n.data as WorkflowNodeData,
      })));
    },
    [workflowId, updateNodes]
  );

  const saveEdges = useCallback(
    (newEdges: Edge[]) => {
      updateEdges(workflowId, newEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        label: typeof e.label === 'string' ? e.label : undefined,
      })));
    },
    [workflowId, updateEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge({ ...connection, id: generateId() }, edges);
      setEdges(newEdges);
      saveEdges(newEdges);
    },
    [edges, setEdges, saveEdges]
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Defer save to next tick so state is updated
      setTimeout(() => {
        setNodes((current) => {
          saveNodes(current);
          return current;
        });
      }, 0);
    },
    [onNodesChange, setNodes, saveNodes]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow-type');
      const dataStr = e.dataTransfer.getData('application/reactflow-data');
      if (!type || !dataStr) return;

      const data = JSON.parse(dataStr) as WorkflowNodeData;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const newNode: Node = {
        id: generateId(),
        type,
        position: { x: e.clientX - bounds.left - 90, y: e.clientY - bounds.top - 25 },
        data,
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      saveNodes(newNodes);
    },
    [nodes, setNodes, saveNodes]
  );

  const onDragStartFromPalette = useCallback(
    (event: React.DragEvent, nodeType: string, data: Record<string, unknown>) => {
      event.dataTransfer.setData('application/reactflow-type', nodeType);
      event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  return (
    <div className="flex h-full">
      <NodePalette onDragStart={onDragStartFromPalette} />
      <div ref={reactFlowWrapper} className="flex-1" onDragOver={handleDragOver} onDrop={handleDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          className="bg-slate-50 dark:bg-slate-900"
        >
          <Background color="#94a3b8" gap={20} size={1} />
          <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !shadow-md" />
          <MiniMap
            className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700"
            nodeColor={(n) => {
              switch (n.type) {
                case 'trigger': return '#f59e0b';
                case 'action': return '#6366f1';
                case 'condition': return '#10b981';
                case 'agent': return '#8b5cf6';
                default: return '#94a3b8';
              }
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
