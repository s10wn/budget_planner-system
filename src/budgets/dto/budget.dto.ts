import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiProperty({ example: 'category-uuid' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 500.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @ApiProperty({ example: 2024 })
  @IsNumber()
  @Type(() => Number)
  year: number;
}

export class UpdateBudgetDto {
  @ApiProperty({ example: 600.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
