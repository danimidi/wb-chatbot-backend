import { CurrencyConversionResult } from '@/tools/currency/currency.interface';
import { ProductSearchResult } from '@/tools/products/products.interface';

export type ToolResult =
  | ProductSearchResult[]
  | CurrencyConversionResult
  | { error: string };

export type ToolArgs = Record<string, unknown>;

export type ToolHandler = (args: ToolArgs) => Promise<ToolResult>;
