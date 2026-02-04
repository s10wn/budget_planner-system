import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { ReportsModule } from '../reports/reports.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [TransactionsModule, ReportsModule, CategoriesModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
