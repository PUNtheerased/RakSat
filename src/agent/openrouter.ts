import { config } from '../config.js';
import { OPENAI_TOOLS } from './tools.js';

export type OrMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OrToolCall[];
  tool_call_id?: string;
  name?: string;
  reasoning_details?: unknown;
};

export type OrToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type OrChoiceMessage = {
  role: string;
  content: string | null;
  tool_calls?: OrToolCall[];
  reasoning_details?: unknown;
};

type OrResponse = {
  choices?: { message?: OrChoiceMessage; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

export async function openRouterChat(messages: OrMessage[], opts?: { enableReasoning?: boolean }): Promise<{
  message: OrChoiceMessage;
  usage?: { input_tokens: number; output_tokens: number };
}> {
  if (!config.OPENROUTER_MODEL.endsWith(':free')) {
    throw new Error('only free OpenRouter models are allowed');
  }

  const body: Record<string, unknown> = {
    model: config.OPENROUTER_MODEL,
    messages,
    tools: OPENAI_TOOLS,
    tool_choice: 'auto',
    temperature: 0.3,
    max_tokens: 1200,
  };
  if (opts?.enableReasoning !== false) {
    body.reasoning = { enabled: true };
  }

  const res = await fetch(`${config.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.PUBLIC_BASE_URL,
      'X-Title': 'RakSat',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as OrResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `openrouter ${res.status}`);
  }
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error('openrouter empty response');

  return {
    message,
    usage: data.usage
      ? { input_tokens: data.usage.prompt_tokens ?? 0, output_tokens: data.usage.completion_tokens ?? 0 }
      : undefined,
  };
}
