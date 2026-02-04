import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { TransactionsService } from '../transactions/transactions.service';
import { ReportsService } from '../reports/reports.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateTransactionDto } from '../transactions/dto/transaction.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Public API v1')
@ApiHeader({ name: 'x-api-key', required: true, description: 'API key for authentication' })
@UseGuards(ApiKeyGuard)
@Controller('api/v1')
export class PublicApiController {
  constructor(
    private transactionsService: TransactionsService,
    private reportsService: ReportsService,
    private categoriesService: CategoriesService,
  ) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.findAll(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Create transaction' })
  createTransaction(@CurrentUser('id') userId: string, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(userId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get categories' })
  getCategories(@CurrentUser('id') userId: string) {
    return this.categoriesService.findAll(userId);
  }

  @Get('reports/monthly')
  @ApiOperation({ summary: 'Get monthly report' })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  getMonthlyReport(
    @CurrentUser('id') userId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.reportsService.getMonthlyReport(userId, parseInt(month), parseInt(year));
  }
}
