import { AiResponse } from './ai-response.interface';
import { ChatMessage } from './message.interface';
import { ToolDefinition } from './tool-definition.interface';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProviderInterface {
  generateResponse(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
  ): Promise<AiResponse>;
}
