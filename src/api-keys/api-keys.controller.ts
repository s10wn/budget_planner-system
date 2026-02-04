import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'Get all API keys for current user' })
  findAll(@CurrentUser('id') userId: string) {
    return this.apiKeysService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new API key' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(userId, dto);
  }

  @Put(':id/revoke')
  @ApiOperation({ summary: 'Revoke API key' })
  revoke(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.apiKeysService.revoke(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API key' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.apiKeysService.delete(id, userId);
  }
}
