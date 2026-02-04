import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { prismaMock } from '../common/test/prisma-mock';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    Object.values(prismaMock).forEach((model) => {
      if (typeof model === 'object' && model !== null) {
        Object.values(model).forEach((fn) => {
          if (typeof fn === 'function' && 'mockReset' in fn) {
            (fn as jest.Mock).mockReset();
          }
        });
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('getMonthlyReport', () => {
    it('should calculate monthly totals correctly', async () => {
      const mockTransactions = [
        { type: 'INCOME', amount: 3000, category: { id: 'c1', name: 'Salary', icon: '1', color: '#10B981' } },
        { type: 'INCOME', amount: 500, category: { id: 'c2', name: 'Freelance', icon: '2', color: '#6366F1' } },
        { type: 'EXPENSE', amount: 200, category: { id: 'c3', name: 'Food', icon: '3', color: '#EF4444' } },
        { type: 'EXPENSE', amount: 100, category: { id: 'c3', name: 'Food', icon: '3', color: '#EF4444' } },
        { type: 'EXPENSE', amount: 500, category: { id: 'c4', name: 'Housing', icon: '4', color: '#3B82F6' } },
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getMonthlyReport('user-1', 1, 2024);

      expect(result.totalIncome).toBe(3500);
      expect(result.totalExpense).toBe(800);
      expect(result.balance).toBe(2700);
      expect(result.transactionsCount).toBe(5);
      expect(result.month).toBe(1);
      expect(result.year).toBe(2024);
    });

    it('should aggregate expenses by category', async () => {
      const mockTransactions = [
        { type: 'EXPENSE', amount: 100, category: { id: 'c1', name: 'Food', icon: '1', color: '#EF4444' } },
        { type: 'EXPENSE', amount: 200, category: { id: 'c1', name: 'Food', icon: '1', color: '#EF4444' } },
        { type: 'EXPENSE', amount: 50, category: { id: 'c2', name: 'Transport', icon: '2', color: '#F59E0B' } },
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getMonthlyReport('user-1', 1, 2024);

      expect(result.expensesByCategory).toHaveLength(2);

      const foodCategory = result.expensesByCategory.find(
        (c: { category: { name: string }; total: number }) =>
          c.category.name === 'Food',
      );
      expect(foodCategory!.total).toBe(300);

      const transportCategory = result.expensesByCategory.find(
        (c: { category: { name: string }; total: number }) =>
          c.category.name === 'Transport',
      );
      expect(transportCategory!.total).toBe(50);
    });

    it('should aggregate income by category', async () => {
      const mockTransactions = [
        { type: 'INCOME', amount: 3000, category: { id: 'c1', name: 'Salary', icon: '1', color: '#10B981' } },
        { type: 'INCOME', amount: 500, category: { id: 'c2', name: 'Freelance', icon: '2', color: '#6366F1' } },
      ];

      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getMonthlyReport('user-1', 6, 2024);

      expect(result.incomeByCategory).toHaveLength(2);

      const salaryCategory = result.incomeByCategory.find(
        (c: { category: { name: string }; total: number }) =>
          c.category.name === 'Salary',
      );
      expect(salaryCategory!.total).toBe(3000);
    });

    it('should return empty report when no transactions', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyReport('user-1', 1, 2024);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.balance).toBe(0);
      expect(result.transactionsCount).toBe(0);
      expect(result.expensesByCategory).toHaveLength(0);
      expect(result.incomeByCategory).toHaveLength(0);
    });

    it('should filter by correct date range for January', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      await service.getMonthlyReport('user-1', 1, 2024);

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: {
            gte: new Date(2024, 0, 1),
            lte: new Date(2024, 1, 0, 23, 59, 59),
          },
        },
        include: { category: true },
      });
    });

    it('should filter by correct date range for March', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      await service.getMonthlyReport('user-1', 3, 2024);

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: {
            gte: new Date(2024, 2, 1),
            lte: new Date(2024, 3, 0, 23, 59, 59),
          },
        },
        include: { category: true },
      });
    });

    it('should handle December correctly', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      await service.getMonthlyReport('user-1', 12, 2024);

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: {
            gte: new Date(2024, 11, 1),
            lte: new Date(2025, 0, 0, 23, 59, 59),
          },
        },
        include: { category: true },
      });
    });
  });

  describe('getYearlyTrend', () => {
    it('should return 12 months of data', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      });

      const result = await service.getYearlyTrend('user-1', 2024);

      expect(result.year).toBe(2024);
      expect(result.months).toHaveLength(12);
      expect(result.months[0].month).toBe(1);
      expect(result.months[11].month).toBe(12);
    });

    it('should handle months with no transactions (null sums)', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getYearlyTrend('user-1', 2024);

      result.months.forEach(
        (m: { month: number; income: number; expense: number }) => {
          expect(m.income).toBe(0);
          expect(m.expense).toBe(0);
        },
      );
    });

    it('should call aggregate twice per month (income + expense)', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.getYearlyTrend('user-1', 2024);

      // 12 months x 2 calls (income + expense)
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledTimes(24);
    });

    it('should query correct date ranges for each month', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.getYearlyTrend('user-1', 2024);

      // Check January income call
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'INCOME',
          date: {
            gte: new Date(2024, 0, 1),
            lte: new Date(2024, 1, 0, 23, 59, 59),
          },
        },
        _sum: { amount: true },
      });

      // Check January expense call
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'EXPENSE',
          date: {
            gte: new Date(2024, 0, 1),
            lte: new Date(2024, 1, 0, 23, 59, 59),
          },
        },
        _sum: { amount: true },
      });
    });

    it('should correctly populate income and expense per month', async () => {
      // Mock alternating values: income=1000, expense=500 for each month
      prismaMock.transaction.aggregate
        .mockImplementation(({ where }: { where: { type: string } }) => {
          if (where.type === 'INCOME') {
            return Promise.resolve({ _sum: { amount: 1000 } });
          }
          return Promise.resolve({ _sum: { amount: 500 } });
        });

      const result = await service.getYearlyTrend('user-1', 2024);

      result.months.forEach(
        (m: { month: number; income: number; expense: number }) => {
          expect(m.income).toBe(1000);
          expect(m.expense).toBe(500);
        },
      );
    });
  });
});
