import { ToolDefinition } from '@/ai/interfaces/tool-definition.interface';
import { TOOL_NAMES } from '@/common/constants';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: TOOL_NAMES.searchProducts,
    description:
      'Search the product catalog for items matching the query. Returns the most relevant results.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search keywords in English only. If the user wrote in another language, translate the product terms to English.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: TOOL_NAMES.convertCurrencies,
    description: 'Convert a money amount from one currency to another.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount to convert.',
        },
        from: {
          type: 'string',
          description: 'Source ISO currency code, for example USD or EUR.',
        },
        to: {
          type: 'string',
          description: 'Target ISO currency code, for example EUR or CAD.',
        },
      },
      required: ['amount', 'from', 'to'],
      additionalProperties: false,
    },
  },
];
