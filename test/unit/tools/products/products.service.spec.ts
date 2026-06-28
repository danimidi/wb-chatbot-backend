import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '@/tools/products/products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    // Manually init lifecycle hook since Test.createTestingModule may not trigger it
    service.onModuleInit();
  });

  it('returns relevant products for "phone"', () => {
    const results = service.searchProducts({
      query: 'I am looking for a phone',
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(
      results.some((p) => p.displayTitle.toLowerCase().includes('iphone')),
    ).toBe(true);
  });

  it('returns relevant products for "watch"', () => {
    const results = service.searchProducts({
      query: 'How much does a watch costs?',
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(
      results.some((p) => p.displayTitle.toLowerCase().includes('watch')),
    ).toBe(true);
  });

  it('returns at most 2 results', () => {
    const results = service.searchProducts({ query: 'phone' });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array for empty query', () => {
    const results = service.searchProducts({ query: '' });
    expect(results).toEqual([]);
  });

  it('scores higher for exact title matches', () => {
    const results = service.searchProducts({ query: 'iPhone 12' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].displayTitle).toContain('iPhone 12');
  });
});
