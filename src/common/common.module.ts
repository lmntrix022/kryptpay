import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CurrencyConverterService } from './services/currency-converter.service';
import { CacheService } from './services/cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CurrencyConverterService, CacheService],
  exports: [CurrencyConverterService, CacheService],
})
export class CommonModule {}

