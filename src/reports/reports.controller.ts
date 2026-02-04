import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly report' })
  @ApiQuery({ name: 'month', required: true, example: 1 })
  @ApiQuery({ name: 'year', required: true, example: 2024 })
  getMonthly(
    @CurrentUser('id') userId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.reportsService.getMonthlyReport(
      userId,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('yearly-trend')
  @ApiOperation({ summary: 'Get yearly income/expense trend' })
  @ApiQuery({ name: 'year', required: true, example: 2024 })
  getYearlyTrend(
    @CurrentUser('id') userId: string,
    @Query('year') year: string,
  ) {
    return this.reportsService.getYearlyTrend(userId, parseInt(year));
  }
}
