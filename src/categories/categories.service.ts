import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { isDefault: true },
          { userId },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    if (!category.isDefault && category.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        icon: dto.icon || '📦',
        color: dto.color || '#6B7280',
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id, userId);
    if (category.isDefault) {
      throw new ForbiddenException('Cannot edit default categories');
    }
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const category = await this.findOne(id, userId);
    if (category.isDefault) {
      throw new ForbiddenException('Cannot delete default categories');
    }
    return this.prisma.category.delete({ where: { id } });
  }
}
