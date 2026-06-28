import type { AiToolCall } from './ai-response.interface';
import type { MessageRole } from '@/common/constants';

export type ChatMessageRole = MessageRole;

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  toolCallId?: string;
  name?: string;
  toolCalls?: AiToolCall[];
}
