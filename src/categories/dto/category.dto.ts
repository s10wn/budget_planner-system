import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Food' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: '🍔', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: '#EF4444', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreateDefaultCategoryDto extends CreateCategoryDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isDefault: boolean;
}
