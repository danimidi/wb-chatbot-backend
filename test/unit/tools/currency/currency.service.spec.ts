import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CurrencyService } from '@/tools/currency/currency.service';
import { CONFIG_KEYS } from '@/common/constants';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.Mock;

describe('CurrencyService', () => {
  let service: CurrencyService;
  let configService: { get: jest.Mock };

  const rates = { USD: 1, EUR: 0.5, CAD: 1.5, JPY: 100 };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) =>
        key === CONFIG_KEYS.ratesAppId ? 'test-app-id' : undefined,
      ),
    };
    service = new CurrencyService(configService as unknown as ConfigService);
    mockedAxiosGet.mockResolvedValue({
      data: { base: 'USD', rates },
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('converts between two non-USD currencies via USD', async () => {
    // 350 EUR -> 700 USD -> 1050 CAD
    const result = await service.convertCurrencies({
      amount: 350,
      from: 'EUR',
      to: 'CAD',
    });

    expect(result.convertedAmount).toBe(1050);
    expect(result.rate).toBe(3);
    expect(result.from).toBe('EUR');
    expect(result.to).toBe('CAD');
  });

  it('converts when USD is the source currency', async () => {
    const result = await service.convertCurrencies({
      amount: 100,
      from: 'USD',
      to: 'EUR',
    });

    expect(result.convertedAmount).toBe(50);
  });

  it('converts when USD is the target currency', async () => {
    const result = await service.convertCurrencies({
      amount: 100,
      from: 'EUR',
      to: 'USD',
    });

    expect(result.convertedAmount).toBe(200);
  });

  it('throws BadRequest for a non-positive amount', async () => {
    await expect(
      service.convertCurrencies({ amount: 0, from: 'EUR', to: 'USD' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when a currency code is missing', async () => {
    await expect(
      service.convertCurrencies({ amount: 100, to: 'USD' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest for an unsupported currency code', async () => {
    await expect(
      service.convertCurrencies({ amount: 100, from: 'EUR', to: 'ZZZ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws InternalServerError when the app id is not configured', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(
      service.convertCurrencies({ amount: 100, from: 'EUR', to: 'USD' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });
});
