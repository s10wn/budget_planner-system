import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from '../currencies/dto/currency.dto';
import { CreateDefaultCategoryDto } from '../categories/dto/category.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // User management
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Put('users/:id/block')
  @ApiOperation({ summary: 'Block user' })
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Put('users/:id/unblock')
  @ApiOperation({ summary: 'Unblock user' })
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create new user' })
  createUser(@Body() dto: { email: string; password: string; name?: string; role?: 'USER' | 'ADMIN' }) {
    return this.adminService.createUser(dto);
  }

  // Default categories management
  @Get('categories')
  @ApiOperation({ summary: 'Get default categories' })
  getDefaultCategories() {
    return this.adminService.getDefaultCategories();
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update default category' })
  updateDefaultCategory(
    @Param('id') id: string,
    @Body() dto: CreateDefaultCategoryDto,
  ) {
    return this.adminService.updateDefaultCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete default category' })
  deleteDefaultCategory(@Param('id') id: string) {
    return this.adminService.deleteDefaultCategory(id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create default category' })
  createDefaultCategory(@Body() dto: CreateDefaultCategoryDto) {
    return this.adminService.createDefaultCategory(dto);
  }

  // Currency management
  @Get('currencies')
  @ApiOperation({ summary: 'Get all currencies' })
  getCurrencies() {
    return this.adminService.getCurrencies();
  }

  @Put('currencies/:id')
  @ApiOperation({ summary: 'Update currency' })
  updateCurrency(
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.adminService.updateCurrency(id, dto);
  }

  // Settings
  @Get('settings')
  @ApiOperation({ summary: 'Get all settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update settings' })
  updateSettings(@Body() data: Record<string, string>) {
    return this.adminService.updateSettings(data);
  }

  // Statistics
  @Get('statistics')
  @ApiOperation({ summary: 'Get platform statistics' })
  getStatistics() {
    return this.adminService.getStatistics();
  }
}
