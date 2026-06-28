import { Module } from '@nestjs/common';
import { CurrencyService } from './currency/currency.service';
import { ProductsService } from './products/products.service';

@Module({
  providers: [ProductsService, CurrencyService],
  exports: [ProductsService, CurrencyService],
})
export class ToolsModule {}
