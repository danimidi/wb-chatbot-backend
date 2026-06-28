import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  ConvertCurrenciesArgs,
  CurrencyConversionResult,
  ExchangeRatesResponse,
} from './currency.interface';
import { CONFIG_KEYS } from '@/common/constants';

@Injectable()
export class CurrencyService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Converts an amount between two currencies using live USD-based rates from
   * Open Exchange Rates (converting through USD for non-USD pairs).
   *
   * @throws BadRequestException for an invalid amount or unsupported currency.
   */
  async convertCurrencies(
    args: ConvertCurrenciesArgs,
  ): Promise<CurrencyConversionResult> {
    const amount = Number(args.amount);
    const sourceCurrency = String(args.from ?? '')
      .trim()
      .toUpperCase();
    const targetCurrency = String(args.to ?? '')
      .trim()
      .toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        'A positive amount is required for currency conversion.',
      );
    }

    if (!sourceCurrency || !targetCurrency) {
      throw new BadRequestException(
        'Both source and target currency codes are required.',
      );
    }

    const appId = this.configService.get<string>(CONFIG_KEYS.ratesAppId);
    const baseUrl =
      this.configService.get<string>(CONFIG_KEYS.ratesBaseUrl) ??
      'https://openexchangerates.org/api';

    if (!appId) {
      throw new InternalServerErrorException(
        'OPEN_EXCHANGE_RATES_APP_ID is not configured',
      );
    }

    const response = await axios.get<ExchangeRatesResponse>(
      `${baseUrl}/latest.json`,
      {
        params: { app_id: appId },
        timeout: 20000,
      },
    );

    const rates = response.data.rates;
    const sourceRate = rates[sourceCurrency];
    const targetRate = rates[targetCurrency];

    if (!sourceRate || !targetRate) {
      throw new BadRequestException(
        `Unsupported currency code: ${!sourceRate ? sourceCurrency : targetCurrency}`,
      );
    }

    // Rates are USD-based, so convert through USD to support any currency pair.
    const amountInUsd = amount / sourceRate;
    const convertedAmount = amountInUsd * targetRate;

    return {
      amount,
      from: sourceCurrency,
      to: targetCurrency,
      convertedAmount: Number(convertedAmount.toFixed(2)),
      rate: Number((targetRate / sourceRate).toFixed(6)),
    };
  }
}
