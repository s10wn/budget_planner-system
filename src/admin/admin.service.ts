import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CurrenciesService } from '../currencies/currencies.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private currenciesService: CurrenciesService,
  ) {}

  // Users
  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async blockUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    });
  }

  async unblockUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // Default categories
  async getDefaultCategories() {
    return this.prisma.category.findMany({
      where: { isDefault: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateDefaultCategory(id: string, data: any) {
    return this.prisma.category.update({
      where: { id },
      data: { name: data.name, type: data.type, icon: data.icon, color: data.color },
    });
  }

  async deleteDefaultCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  // Currencies
  async getCurrencies() {
    return this.currenciesService.findAll();
  }

  async updateCurrency(id: string, data: any) {
    return this.currenciesService.update(id, data);
  }

  // Settings
  async getSettings() {
    return this.settingsService.getAll();
  }

  async updateSettings(data: Record<string, string>) {
    return this.settingsService.setMultiple(data);
  }

  // Statistics
  async getStatistics() {
    const [usersCount, transactionsCount, categoriesCount, activeApiKeys] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.transaction.count(),
        this.prisma.category.count({ where: { isDefault: true } }),
        this.prisma.apiKey.count({ where: { isActive: true } }),
      ]);

    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return {
      usersCount,
      transactionsCount,
      categoriesCount,
      activeApiKeys,
      recentUsers,
    };
  }
}
