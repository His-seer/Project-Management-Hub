'use client';

import { useCurrentProject, useProjectId } from '@/hooks/useCurrentProject';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Meeting, MeetingDecision, MeetingActionItem } from '@/types';
import { generateId } from '@/lib/ids';
import { BookOpen, Plus, Trash2, X, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface AIExtractedData {
  decisions: { decision: string; madeBy: string }[];
  actionItems: { description: string; owner: string; dueDate: string }[];
}

export default function MeetingsPage() {
  const project = useCurrentProject();
  const projectId = useProjectId();
  const updateModule = useProjectStore((s) => s.updateModule);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [aiExtractingMeetingId, setAiExtractingMeetingId] = useState<string | null>(null);
  const [aiExtractedData, setAiExtractedData] = useState<AIExtractedData | null>(null);
  const [aiExtractError, setAiExtractError] = useState<string>('');
  const [checkedDecisions, setCheckedDecisions] = useState<Set<number>>(new Set());
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  if (!project) return null;

  const meetings = project.meetings;

  const updateMeetings = (data: Meeting[]) => {
    updateModule(projectId, 'meetings', data);
  };

  const addMeeting = () => {
    const m: Meeting = {
      id: generateId(),
      title: 'New Meeting',
      date: new Date().toISOString().split('T')[0],
      attendees: [],
      agenda: '',
      notes: '',
      decisions: [],
      actionItems: [],
    };
    updateMeetings([m, ...meetings]);
    setExpandedId(m.id);
  };

  const updateMeeting = (id: string, partial: Partial<Meeting>) => {
    updateMeetings(meetings.map((m) => (m.id === id ? { ...m, ...partial } : m)));
  };

  const deleteMeeting = (id: string) => {
    updateMeetings(meetings.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const extractActions = async (meeting: Meeting) => {
    setAiExtractingMeetingId(meeting.id);
    setAiExtractedData(null);
    setAiExtractError('');
    try {
      let raw = '';
      const res = await fetch('/api/ai/extract-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: meeting.notes,
          attendees: meeting.attendees,
          title: meeting.title,
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) raw += parsed.text;
        }
      }
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]) as AIExtractedData;
        setAiExtractedData(data);
        setCheckedDecisions(new Set(data.decisions.map((_, i) => i)));
        setCheckedActions(new Set(data.actionItems.map((_, i) => i)));
      } else {
        throw new Error('Could not parse AI response');
      }
    } catch (err: any) {
      setAiExtractError(err.message || 'Failed to extract actions');
    }
  };

  const addSelectedItems = (meetingId: string) => {
    if (!aiExtractedData) return;
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return;

    const newDecisions: MeetingDecision[] = aiExtractedData.decisions
      .filter((_, i) => checkedDecisions.has(i))
      .map((d) => ({ id: generateId(), decision: d.decision, madeBy: d.madeBy }));

    const newActions: MeetingActionItem[] = aiExtractedData.actionItems
      .filter((_, i) => checkedActions.has(i))
      .map((a) => ({
        id: generateId(),
        description: a.description,
        owner: a.owner,
        dueDate: a.dueDate,
        status: 'open' as const,
        escalateToIssue: false,
      }));

    updateMeeting(meetingId, {
      decisions: [...meeting.decisions, ...newDecisions],
      actionItems: [...meeting.actionItems, ...newActions],
    });

    setAiExtractedData(null);
    setAiExtractingMeetingId(null);
  };

  const dismissExtracted = () => {
    setAiExtractedData(null);
    setAiExtractingMeetingId(null);
    setAiExtractError('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <BookOpen size={24} />
        Meeting Minutes
      </h1>

      <button
        onClick={addMeeting}
        className="mb-4 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
      >
        <Plus size={14} /> New Meeting
      </button>

      {meetings.length === 0 && (
        <p className="text-gray-400 text-sm">No meetings recorded yet.</p>
      )}

      <div className="space-y-2">
        {meetings.map((meeting) => {
          const isExpanded = expandedId === meeting.id;
          const isExtracting = aiExtractingMeetingId === meeting.id;
          return (
            <div key={meeting.id}>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                >
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{meeting.title || 'Untitled'}</span>
                  <span className="text-xs text-gray-400">{meeting.date}</span>
                  {meeting.notes && meeting.notes.trim() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        extractActions(meeting);
                      }}
                      disabled={isExtracting}
                      className="p-1 text-purple-400 hover:text-purple-600 disabled:opacity-50"
                      title="AI Extract decisions & actions"
                    >
                      <Sparkles size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMeeting(meeting.id); }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Title</label>
                        <input
                          value={meeting.title}
                          onChange={(e) => updateMeeting(meeting.id, { title: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Date</label>
                        <input
                          type="date"
                          value={meeting.date}
                          onChange={(e) => updateMeeting(meeting.id, { date: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Attendees (comma-separated)</label>
                      <input
                        value={meeting.attendees.join(', ')}
                        onChange={(e) => updateMeeting(meeting.id, { attendees: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Alice, Bob, Charlie"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Agenda</label>
                      <textarea
                        value={meeting.agenda}
                        onChange={(e) => updateMeeting(meeting.id, { agenda: e.target.value })}
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Notes</label>
                      <textarea
                        value={meeting.notes}
                        onChange={(e) => updateMeeting(meeting.id, { notes: e.target.value })}
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Decisions */}
                    <MeetingDecisionsEditor
                      decisions={meeting.decisions}
                      onChange={(decisions) => updateMeeting(meeting.id, { decisions })}
                    />

                    {/* Action Items */}
                    <ActionItemsEditor
                      items={meeting.actionItems}
                      onChange={(actionItems) => updateMeeting(meeting.id, { actionItems })}
                    />
                  </div>
                )}
              </div>

              {/* AI Extract Review Panel */}
              {isExtracting && aiExtractError && (
                <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
                  <span>{aiExtractError}</span>
                  <button onClick={dismissExtracted} className="text-xs underline">Dismiss</button>
                </div>
              )}
              {isExtracting && !aiExtractedData && !aiExtractError && (
                <div className="mt-1 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <Sparkles size={14} className="animate-pulse" /> Extracting decisions and action items...
                </div>
              )}
              {isExtracting && aiExtractedData && (
                <div className="mt-1 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Sparkles size={14} /> Extracted Items
                    </h3>
                    <button onClick={dismissExtracted} className="text-xs text-gray-500 hover:text-red-500">Dismiss</button>
                  </div>

                  {aiExtractedData.decisions.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Decisions</h4>
                      <div className="space-y-1">
                        {aiExtractedData.decisions.map((d, i) => (
                          <label key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={checkedDecisions.has(i)}
                              onChange={() => {
                                const next = new Set(checkedDecisions);
                                next.has(i) ? next.delete(i) : next.add(i);
                                setCheckedDecisions(next);
                              }}
                              className="mt-0.5"
                            />
                            <span>{d.decision}{d.madeBy ? ` (by ${d.madeBy})` : ''}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiExtractedData.actionItems.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Action Items</h4>
                      <div className="space-y-1">
                        {aiExtractedData.actionItems.map((a, i) => (
                          <label key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={checkedActions.has(i)}
                              onChange={() => {
                                const next = new Set(checkedActions);
                                next.has(i) ? next.delete(i) : next.add(i);
                                setCheckedActions(next);
                              }}
                              className="mt-0.5"
                            />
                            <span>{a.description}{a.owner ? ` — ${a.owner}` : ''}{a.dueDate ? ` (due ${a.dueDate})` : ''}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => addSelectedItems(meeting.id)}
                    className="text-sm font-medium text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-1.5"
                  >
                    Add Selected
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MeetingDecisionsEditor({ decisions, onChange }: { decisions: MeetingDecision[]; onChange: (d: MeetingDecision[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    if (input.trim()) {
      onChange([...decisions, { id: generateId(), decision: input.trim(), madeBy: '' }]);
      setInput('');
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-1">Decisions</label>
      <div className="space-y-1">
        {decisions.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">{d.decision}</span>
            <button onClick={() => onChange(decisions.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Add a decision"
        />
        <button onClick={add} className="text-blue-600 text-sm"><Plus size={14} /></button>
      </div>
    </div>
  );
}

function ActionItemsEditor({ items, onChange }: { items: MeetingActionItem[]; onChange: (a: MeetingActionItem[]) => void }) {
  const addItem = () => {
    onChange([...items, {
      id: generateId(),
      description: '',
      owner: '',
      dueDate: '',
      status: 'open',
      escalateToIssue: false,
    }]);
  };

  const updateItem = (id: string, partial: Partial<MeetingActionItem>) => {
    onChange(items.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-1">Action Items</label>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <input
              value={item.description}
              onChange={(e) => updateItem(item.id, { description: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Description"
            />
            <input
              value={item.owner}
              onChange={(e) => updateItem(item.id, { owner: e.target.value })}
              className="w-24 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Owner"
            />
            <input
              type="date"
              value={item.dueDate}
              onChange={(e) => updateItem(item.id, { dueDate: e.target.value })}
              className="w-32 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <select
              value={item.status}
              onChange={(e) => updateItem(item.id, { status: e.target.value as MeetingActionItem['status'] })}
              className="w-28 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <button onClick={() => onChange(items.filter((a) => a.id !== item.id))} className="text-gray-400 hover:text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded">
        <Plus size={12} /> Add Action Item
      </button>
    </div>
  );
}
