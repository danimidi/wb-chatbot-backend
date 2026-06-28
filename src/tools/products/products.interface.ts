export interface Product {
  displayTitle: string;
  embeddingText: string;
  url: string;
  imageUrl: string;
  productType: string;
  discount: string;
  price: string;
  variants: string;
  createDate: string;
}

export interface ProductSearchResult {
  displayTitle: string;
  url: string;
  productType: string;
  price: string;
  variants: string;
}

export interface SearchProductsArgs {
  query?: string;
}
