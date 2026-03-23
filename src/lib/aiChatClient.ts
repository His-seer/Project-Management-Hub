/**
 * Gemini chat client with function calling support.
 * Handles the tool-call loop: Gemini requests function → execute → feed result back → final response.
 */

import { toolDeclarations, executeTool } from '@/lib/chatTools';
import { loadProject } from '@/lib/dbHelpers';
import { overallCompleteness } from '@/lib/completeness';
import type { ChatMessage } from '@/types/chat';
import type { Project } from '@/types';
import { selectAgent, type AgentDefinition } from '@/lib/agents';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiContent {
  role: string;
  parts: Array<{
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: { result: unknown } };
  }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: { name: string; args: Record<string, unknown> };
      }>;
    };
    finishReason?: string;
  }>;
}

function buildSystemPrompt(project: Project): string {
  const pct = overallCompleteness(project);
  const openRisks = project.risks.filter((r) => r.status !== 'closed');
  const openIssues = project.issues.filter((i) => i.status !== 'closed' && i.status !== 'resolved');

  return `You are an expert AI Project Manager co-pilot for "${project.meta.name}".
You help the PM manage their project by answering questions, analyzing data, and making updates.

RULES:
- Use tools to read/write project data. Never guess — check first.
- When adding items, confirm what you added with specifics (title, severity, etc.).
- Be concise and actionable. You are a senior PM, not a chatbot.
- Reference actual project data in your answers.
- When the user asks to add something, use the appropriate add tool.
- When the user asks about project status, use get_project_summary or the relevant read tool.

PROJECT SNAPSHOT:
Name: ${project.meta.name} | Status: ${project.meta.status} | Health: ${project.meta.health}
Completion: ${pct}%
Duration: ${project.meta.startDate} to ${project.meta.targetEndDate}
Risks: ${openRisks.length} open (${openRisks.filter((r) => r.severity >= 15).length} critical)
Issues: ${openIssues.length} open (${openIssues.filter((i) => i.status === 'blocked').length} blocked)
Team: ${project.resources.length} resources | Budget: $${project.funding.totalBudget?.toLocaleString() ?? '0'}`;
}

function messagesToContents(messages: ChatMessage[]): GeminiContent[] {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

export interface ChatStreamCallbacks {
  onText: (text: string) => void;
  onToolStart: (name: string, args: Record<string, unknown>) => void;
  onToolResult: (name: string, result: unknown) => void;
  onMutations: (modules: string[]) => void;
  onError: (error: string) => void;
  onAgentSelected?: (agent: { id: string; name: string; icon: string }) => void;
}

/**
 * Sends a chat request to Gemini with function calling.
 * Handles tool execution loop and streams results via callbacks.
 * Returns the final assistant text.
 */
export async function chatWithTools(
  projectId: string,
  messages: ChatMessage[],
  model: string,
  callbacks: ChatStreamCallbacks,
): Promise<{ text: string; mutatedModules: string[] }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY environment variable is not set');

  const project = await loadProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  // Select specialized agent based on the latest user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const agent = lastUserMsg ? selectAgent(lastUserMsg.content) : selectAgent('');
  callbacks.onAgentSelected?.({ id: agent.id, name: agent.name, icon: agent.icon });

  // Build system prompt: base context + agent specialization
  const baseContext = buildSystemPrompt(project);
  const systemPrompt = `${agent.systemPrompt}\n\n${baseContext}`;

  // Filter tools if agent has restrictions
  const agentTools = agent.allowedTools
    ? { function_declarations: toolDeclarations.function_declarations.filter((t) => agent.allowedTools!.includes(t.name)) }
    : toolDeclarations;

  const contents = messagesToContents(messages);
  const allMutatedModules: string[] = [];

  // Gemini function calling loop (max 5 iterations to prevent infinite loops)
  let currentContents = [...contents];
  for (let i = 0; i < 5; i++) {
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: currentContents,
        tools: [agentTools],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error('No response from Gemini');

    const parts = candidate.content.parts;

    // Check for function calls
    const functionCall = parts.find((p) => p.functionCall);
    if (functionCall?.functionCall) {
      const { name, args } = functionCall.functionCall;
      callbacks.onToolStart(name, args);

      // Reload project for fresh data before executing tool
      const freshProject = await loadProject(projectId);
      if (!freshProject) throw new Error('Project not found during tool execution');

      const toolResult = await executeTool(projectId, freshProject, name, args);
      callbacks.onToolResult(name, toolResult.result);

      if (toolResult.mutatedModules.length > 0) {
        allMutatedModules.push(...toolResult.mutatedModules);
        callbacks.onMutations(toolResult.mutatedModules);
      }

      // Add function call and result to conversation for next iteration
      currentContents = [
        ...currentContents,
        { role: 'model', parts: [{ functionCall: { name, args } }] },
        { role: 'user', parts: [{ functionResponse: { name, response: { result: toolResult.result } } }] },
      ];
      continue; // Loop back for Gemini to process the tool result
    }

    // No function call — extract text response
    const textParts = parts.filter((p) => p.text).map((p) => p.text!).join('');
    if (textParts) {
      callbacks.onText(textParts);
    }
    return { text: textParts, mutatedModules: allMutatedModules };
  }

  // If we hit the loop limit
  return { text: 'I completed the requested actions.', mutatedModules: allMutatedModules };
}
