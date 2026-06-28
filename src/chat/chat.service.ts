import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AI_PROVIDER } from '@/ai/interfaces/ai-provider.interface';
import type { AIProviderInterface } from '@/ai/interfaces/ai-provider.interface';
import { ChatMessage } from '@/ai/interfaces/message.interface';
import { CurrencyService } from '@/tools/currency/currency.service';
import { ProductsService } from '@/tools/products/products.service';
import { ChatResponseDto } from './dto/chat-response.dto';
import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from './constants';
import { MESSAGE_ROLES, TOOL_NAMES } from '@/common/constants';
import {
  ToolArgs,
  ToolHandler,
  ToolResult,
} from './interfaces/tool-result.type';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly maxToolRounds = 10;

  private readonly toolHandlers: Map<string, ToolHandler>;

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AIProviderInterface,
    private readonly productsService: ProductsService,
    private readonly currencyService: CurrencyService,
  ) {
    this.toolHandlers = new Map<string, ToolHandler>([
      [
        TOOL_NAMES.searchProducts,
        async (args) => this.productsService.searchProducts(args),
      ],
      [
        TOOL_NAMES.convertCurrencies,
        async (args) => this.currencyService.convertCurrencies(args),
      ],
    ]);
  }

  /**
   * Runs a user message through the model/tool loop: the model may call tools
   * (searchProducts, convertCurrencies), whose results are fed back until it
   * produces a final natural-language answer.
   *
   * @throws HttpException if a tool fails or the AI provider errors.
   */
  async sendMessage(message: string): Promise<ChatResponseDto> {
    try {
      const messages: ChatMessage[] = [
        { role: MESSAGE_ROLES.system, content: SYSTEM_PROMPT },
        { role: MESSAGE_ROLES.user, content: message },
      ];

      let response = await this.aiProvider.generateResponse(
        messages,
        TOOL_DEFINITIONS,
      );
      let rounds = 0;

      // Run the model/tool loop until the model returns a final answer (no tool calls).
      while (response.toolCalls?.length && rounds < this.maxToolRounds) {
        rounds += 1;

        messages.push({
          role: MESSAGE_ROLES.assistant,
          content: response.content,
          toolCalls: response.toolCalls,
        });

        for (const toolCall of response.toolCalls) {
          const toolResult = await this.executeTool(
            toolCall.name,
            toolCall.arguments,
          );

          messages.push({
            role: MESSAGE_ROLES.tool,
            toolCallId: toolCall.id,
            name: toolCall.name,
            content: JSON.stringify(toolResult),
          });
        }

        response = await this.aiProvider.generateResponse(
          messages,
          TOOL_DEFINITIONS,
        );
      }

      return { answer: response.content };
    } catch (error) {
      throw this.normalizeError(error, 'Chat processing failed');
    }
  }

  private async executeTool(
    toolName: string,
    args: ToolArgs,
  ): Promise<ToolResult> {
    const handler = this.toolHandlers.get(toolName);

    if (!handler) {
      return { error: `Unknown tool: ${toolName}` };
    }

    try {
      return await handler(args);
    } catch (error) {
      throw this.normalizeError(error, `Tool ${toolName} failed`);
    }
  }

  private normalizeError(error: unknown, context?: string): HttpException {
    const detail = error instanceof Error ? error.message : String(error);
    const prefix = context ? `${context}: ` : '';

    this.logger.error(`${prefix}${detail}`);

    // Intentional HttpExceptions carry a safe message, so surface them as-is.
    if (error instanceof HttpException) {
      return error;
    }

    // Unexpected/external errors (OpenAI, network) must not leak raw details.
    const statusCode =
      this.getExternalStatusCode(error) ?? HttpStatus.INTERNAL_SERVER_ERROR;

    return new HttpException(
      'An unexpected error occurred while processing your request.',
      statusCode,
    );
  }

  private getExternalStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const maybeError = error as {
      status?: unknown;
      response?: { status?: unknown };
    };

    if (typeof maybeError.status === 'number') {
      return maybeError.status;
    }

    if (typeof maybeError.response?.status === 'number') {
      return maybeError.response.status;
    }

    return undefined;
  }
}
