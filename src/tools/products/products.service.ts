import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Product,
  ProductSearchResult,
  SearchProductsArgs,
} from './products.interface';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  // Number of products returned per search.
  private readonly maxResults = 2;
  private products: Product[] = [];
  private featuredProducts: Product[] = [];

  onModuleInit(): void {
    this.products = this.loadProducts();
    this.featuredProducts = this.loadFeaturedProducts();
  }

  /**
   * Returns the products most relevant to the query (up to `maxResults`),
   * ranked by a keyword score. Falls back to featured products when nothing
   * matches.
   */
  searchProducts(args: SearchProductsArgs): ProductSearchResult[] {
    const query = String(args.query ?? '');
    const terms = this.extractTerms(query);

    if (terms.length === 0) {
      return [];
    }

    const scored = this.products
      .map((product) => ({
        product,
        score: this.scoreProduct(product, terms, query),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Fall back to featured products when nothing matches the query.
    const matches =
      scored.length > 0
        ? scored.slice(0, this.maxResults).map(({ product }) => product)
        : this.featuredProducts.slice(0, this.maxResults);

    return matches.map((product) => this.toSearchResult(product));
  }

  private toSearchResult(product: Product): ProductSearchResult {
    return {
      displayTitle: product.displayTitle,
      url: product.url,
      productType: product.productType,
      price: product.price,
      variants: product.variants,
    };
  }

  private loadProducts(): Product[] {
    const csvPath = join(process.cwd(), 'src', 'tools', 'products_list.csv');

    try {
      const csv = readFileSync(csvPath, 'utf8');
      const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
      const headers = this.parseCsvLine(headerLine);

      // Build a product object per row by pairing each header with its value.
      return rows.map((row) => {
        const values = this.parseCsvLine(row);
        return headers.reduce(
          (product, header, index) => {
            product[header] = values[index] ?? '';
            return product;
          },
          {} as Record<string, string>,
        ) as unknown as Product;
      });
    } catch (error) {
      this.logger.error('Could not load local products CSV', error);
      return [];
    }
  }

  private loadFeaturedProducts(): Product[] {
    const featuredTitles = ['phone', 'watch'];

    return featuredTitles
      .map((title) =>
        this.products.find((p) =>
          p.displayTitle.toLowerCase().includes(title.toLowerCase()),
        ),
      )
      .filter((p): p is Product => p !== undefined);
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let isInsideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];

      if (character === '"') {
        if (isInsideQuotes && nextCharacter === '"') {
          current += '"';
          index += 1;
          continue;
        }

        if (isInsideQuotes) {
          // A quote closes the field only before a delimiter or EOL; otherwise it is a literal.
          if (nextCharacter === ',' || nextCharacter === undefined) {
            isInsideQuotes = false;
            continue;
          }
          current += '"';
          continue;
        }

        if (current.length === 0) {
          isInsideQuotes = true;
          continue;
        }

        current += '"';
        continue;
      }

      if (character === ',' && !isInsideQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += character;
    }

    values.push(current.trim());
    return values;
  }

  private extractTerms(query: string): string[] {
    const normalizedQuery = query.toLowerCase();
    const terms = new Set(
      normalizedQuery
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((term) => term.length > 2)
        .filter((term) => !this.stopWords.has(term)),
    );

    // Also add the singular form so "phones" matches "phone".
    for (const term of [...terms]) {
      if (term.endsWith('s') && term.length > 3) {
        terms.add(term.slice(0, -1));
      }
    }

    return [...terms];
  }

  private scoreProduct(
    product: Product,
    terms: string[],
    originalQuery: string,
  ): number {
    const title = product.displayTitle.toLowerCase();
    const searchableText =
      `${product.displayTitle} ${product.embeddingText} ${product.productType}`.toLowerCase();
    let score = 0;

    // Title matches weigh more than catalog-text matches; a full title match dominates.

    for (const term of terms) {
      if (title.includes(term)) {
        score += 4;
      }

      if (searchableText.includes(term)) {
        score += 2;
      }
    }

    if (title.includes(originalQuery.toLowerCase())) {
      score += 8;
    }

    return score;
  }

  private readonly stopWords = new Set([
    'and',
    'are',
    'cost',
    'does',
    'for',
    'how',
    'looking',
    'much',
    'price',
    'the',
    'with',
  ]);
}
