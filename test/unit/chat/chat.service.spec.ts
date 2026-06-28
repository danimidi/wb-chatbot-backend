import { BadRequestException, HttpException, Logger } from '@nestjs/common';
import { ChatService } from '@/chat/chat.service';
import { ProductsService } from '@/tools/products/products.service';
import { CurrencyService } from '@/tools/currency/currency.service';

describe('ChatService', () => {
  let aiProvider: { generateResponse: jest.Mock };
  let productsService: { searchProducts: jest.Mock };
  let currencyService: { convertCurrencies: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    aiProvider = { generateResponse: jest.fn() };
    productsService = { searchProducts: jest.fn() };
    currencyService = { convertCurrencies: jest.fn() };

    service = new ChatService(
      aiProvider,
      productsService as unknown as ProductsService,
      currencyService as unknown as CurrencyService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns the model answer when no tool call is requested', async () => {
    aiProvider.generateResponse.mockResolvedValue({ content: 'Hello there' });

    const result = await service.sendMessage('hi');

    expect(result).toEqual({ answer: 'Hello there' });
    expect(aiProvider.generateResponse).toHaveBeenCalledTimes(1);
    expect(productsService.searchProducts).not.toHaveBeenCalled();
  });

  it('executes a requested tool and returns the final answer', async () => {
    aiProvider.generateResponse
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          { id: '1', name: 'searchProducts', arguments: { query: 'phone' } },
        ],
      })
      .mockResolvedValueOnce({ content: 'Here is the iPhone' });
    productsService.searchProducts.mockReturnValue([
      { displayTitle: 'iPhone' },
    ]);

    const result = await service.sendMessage('I want a phone');

    expect(productsService.searchProducts).toHaveBeenCalledWith({
      query: 'phone',
    });
    expect(result).toEqual({ answer: 'Here is the iPhone' });
    expect(aiProvider.generateResponse).toHaveBeenCalledTimes(2);
  });

  it('chains searchProducts and convertCurrencies across rounds', async () => {
    aiProvider.generateResponse
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          { id: '1', name: 'searchProducts', arguments: { query: 'watch' } },
        ],
      })
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: '2',
            name: 'convertCurrencies',
            arguments: { amount: 350, from: 'USD', to: 'EUR' },
          },
        ],
      })
      .mockResolvedValueOnce({ content: 'The watch costs about 307 EUR' });
    productsService.searchProducts.mockReturnValue([
      { displayTitle: 'Apple Watch', price: '350.0 USD' },
    ]);
    currencyService.convertCurrencies.mockResolvedValue({
      convertedAmount: 307.3,
      to: 'EUR',
    });

    const result = await service.sendMessage('price of the watch in euros');

    expect(productsService.searchProducts).toHaveBeenCalledTimes(1);
    expect(currencyService.convertCurrencies).toHaveBeenCalledWith({
      amount: 350,
      from: 'USD',
      to: 'EUR',
    });
    expect(result).toEqual({ answer: 'The watch costs about 307 EUR' });
    expect(aiProvider.generateResponse).toHaveBeenCalledTimes(3);
  });

  it('feeds an error back to the model when an unknown tool is requested', async () => {
    aiProvider.generateResponse
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ id: '1', name: 'unknownTool', arguments: {} }],
      })
      .mockResolvedValueOnce({ content: 'Sorry, I cannot help with that' });

    const result = await service.sendMessage('do something weird');

    expect(result).toEqual({ answer: 'Sorry, I cannot help with that' });
    expect(productsService.searchProducts).not.toHaveBeenCalled();
    expect(currencyService.convertCurrencies).not.toHaveBeenCalled();
  });

  it('surfaces a tool validation error as an HttpException (400)', async () => {
    aiProvider.generateResponse.mockResolvedValueOnce({
      content: '',
      toolCalls: [
        {
          id: '1',
          name: 'convertCurrencies',
          arguments: { amount: 100, from: 'EUR', to: 'ZZZ' },
        },
      ],
    });
    currencyService.convertCurrencies.mockRejectedValue(
      new BadRequestException('Unsupported currency code: ZZZ'),
    );

    expect.assertions(2);
    try {
      await service.sendMessage('convert to zzz');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
    }
  });

  it('stops calling tools after the maximum number of rounds', async () => {
    aiProvider.generateResponse.mockResolvedValue({
      content: 'still looping',
      toolCalls: [
        { id: 'x', name: 'searchProducts', arguments: { query: 'phone' } },
      ],
    });
    productsService.searchProducts.mockReturnValue([]);

    const result = await service.sendMessage('loop forever');

    // 1 initial call + 10 loop iterations (maxToolRounds) = 11 calls.
    expect(aiProvider.generateResponse).toHaveBeenCalledTimes(11);
    expect(productsService.searchProducts).toHaveBeenCalledTimes(10);
    expect(result).toEqual({ answer: 'still looping' });
  });

  it('maps an unexpected provider error to a generic 500 without leaking details', async () => {
    aiProvider.generateResponse.mockRejectedValue(
      new Error('raw secret provider detail'),
    );

    expect.assertions(3);
    try {
      await service.sendMessage('hi');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(500);
      expect((error as HttpException).message).not.toContain(
        'raw secret provider detail',
      );
    }
  });

  it('preserves the status code of an external provider error', async () => {
    aiProvider.generateResponse.mockRejectedValue({
      status: 429,
      message: 'rate limited',
    });

    expect.assertions(1);
    try {
      await service.sendMessage('hi');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('reads the status from a nested external error response', async () => {
    aiProvider.generateResponse.mockRejectedValue({
      response: { status: 503 },
    });

    expect.assertions(1);
    try {
      await service.sendMessage('hi');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(503);
    }
  });
});
