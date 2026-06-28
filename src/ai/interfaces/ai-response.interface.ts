export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiResponse {
  content: string;
  toolCalls?: AiToolCall[];
}
