import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionQueryDto } from './dto/transaction.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transactions with filters and pagination' })
  findAll(@CurrentUser('id') userId: string, @Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(userId, query);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get user balance (total income, expenses, balance)' })
  getBalance(@CurrentUser('id') userId: string) {
    return this.transactionsService.getBalance(userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent transactions' })
  getRecent(@CurrentUser('id') userId: string) {
    return this.transactionsService.getRecentTransactions(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new transaction' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.transactionsService.remove(id, userId);
  }
}
