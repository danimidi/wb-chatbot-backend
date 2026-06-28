export const TOOL_NAMES = {
  searchProducts: 'searchProducts',
  convertCurrencies: 'convertCurrencies',
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];
