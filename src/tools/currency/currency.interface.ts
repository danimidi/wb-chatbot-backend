export interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
}

export interface CurrencyConversionResult {
  amount: number;
  from: string;
  to: string;
  convertedAmount: number;
  rate: number;
}

export interface ConvertCurrenciesArgs {
  amount?: unknown;
  from?: string;
  to?: string;
}
