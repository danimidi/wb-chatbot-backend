import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIProviderInterface } from '@/ai/interfaces/ai-provider.interface';
import { AiResponse } from '@/ai/interfaces/ai-response.interface';
import { ChatMessage } from '@/ai/interfaces/message.interface';
import { ToolDefinition } from '@/ai/interfaces/tool-definition.interface';
import { CONFIG_KEYS, MESSAGE_ROLES } from '@/common/constants';

@Injectable()
export class OpenAIAdapter implements AIProviderInterface {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(CONFIG_KEYS.openAiApiKey);
    this.model =
      this.configService.get<string>(CONFIG_KEYS.openAiModel) ?? 'gpt-4o';

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    this.client = new OpenAI({ apiKey, timeout: 20000 });
  }

  /**
   * Calls the OpenAI Chat Completion API with the conversation and available
   * tools, returning the model's text answer and any requested tool calls.
   */
  async generateResponse(
    messages: ChatMessage[],
    tools: ToolDefinition[] = [],
  ): Promise<AiResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((message) => this.toOpenAIMessage(message)),
      tools: tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as unknown as Record<string, unknown>,
        },
      })),
      // Let the model decide on its own which tool (if any) to call.
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.2,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);

    const message = completion.choices[0]?.message;

    return {
      content: message?.content ?? '',
      toolCalls: message?.tool_calls
        ?.filter((toolCall) => toolCall.type === 'function')
        .map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: this.parseToolArguments(toolCall.function.arguments),
        })),
    };
  }

  // Map our internal message shape to the OpenAI Chat Completion format.
  private toOpenAIMessage(message: ChatMessage) {
    if (message.role === MESSAGE_ROLES.tool) {
      return {
        role: MESSAGE_ROLES.tool,
        content: message.content,
        tool_call_id: message.toolCallId ?? '',
      };
    }

    if (message.role === MESSAGE_ROLES.assistant) {
      return {
        role: MESSAGE_ROLES.assistant,
        content: message.content,
        tool_calls: message.toolCalls?.map((toolCall) => ({
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments),
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content,
      name: message.name,
    };
  }

  private parseToolArguments(rawArguments: string): Record<string, unknown> {
    try {
      return JSON.parse(rawArguments) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
