import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { prismaMock } from '../common/test/prisma-mock';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('BudgetsService', () => {
  let service: BudgetsService;

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
        BudgetsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  describe('findAll', () => {
    it('should return all budgets for user', async () => {
      const budgets = [
        { id: 'b-1', categoryId: 'cat-1', amount: 500, category: { name: 'Food' } },
        { id: 'b-2', categoryId: 'cat-2', amount: 300, category: { name: 'Transport' } },
      ];
      prismaMock.budget.findMany.mockResolvedValue(budgets);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(2);
      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { category: true },
        orderBy: { category: { name: 'asc' } },
      });
    });

    it('should filter by month and year', async () => {
      prismaMock.budget.findMany.mockResolvedValue([]);

      await service.findAll('user-1', 1, 2024);

      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', month: 1, year: 2024 },
        include: { category: true },
        orderBy: { category: { name: 'asc' } },
      });
    });
  });

  describe('create', () => {
    it('should create a budget when none exists for the period', async () => {
      const dto = { categoryId: 'cat-1', amount: 500, month: 1, year: 2024 };
      prismaMock.budget.findUnique.mockResolvedValue(null);
      prismaMock.budget.create.mockResolvedValue({
        id: 'budget-1',
        userId: 'user-1',
        ...dto,
        category: { id: 'cat-1', name: 'Food' },
      });

      const result = await service.create('user-1', dto);

      expect(result.id).toBe('budget-1');
      expect(prismaMock.budget.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...dto },
        include: { category: true },
      });
    });

    it('should check for existing budget using compound unique key', async () => {
      const dto = { categoryId: 'cat-1', amount: 500, month: 1, year: 2024 };
      prismaMock.budget.findUnique.mockResolvedValue(null);
      prismaMock.budget.create.mockResolvedValue({ id: 'b-1' });

      await service.create('user-1', dto);

      expect(prismaMock.budget.findUnique).toHaveBeenCalledWith({
        where: {
          userId_categoryId_month_year: {
            userId: 'user-1',
            categoryId: 'cat-1',
            month: 1,
            year: 2024,
          },
        },
      });
    });

    it('should throw ConflictException if budget already exists for the period', async () => {
      prismaMock.budget.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('user-1', {
          categoryId: 'cat-1',
          amount: 500,
          month: 1,
          year: 2024,
        }),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.budget.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update budget amount', async () => {
      prismaMock.budget.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-1',
        amount: 500,
      });
      prismaMock.budget.update.mockResolvedValue({
        id: 'b-1',
        amount: 600,
        category: { id: 'cat-1', name: 'Food' },
      });

      const result = await service.update('b-1', 'user-1', { amount: 600 });

      expect(result.amount).toBe(600);
      expect(prismaMock.budget.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { amount: 600 },
        include: { category: true },
      });
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      prismaMock.budget.findUnique.mockResolvedValue(null);

      await expect(
        service.update('b-999', 'user-1', { amount: 600 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if budget belongs to another user', async () => {
      prismaMock.budget.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-2',
      });

      await expect(
        service.update('b-1', 'user-1', { amount: 600 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a budget owned by the user', async () => {
      prismaMock.budget.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-1',
      });
      prismaMock.budget.delete.mockResolvedValue({ id: 'b-1' });

      await service.remove('b-1', 'user-1');

      expect(prismaMock.budget.delete).toHaveBeenCalledWith({
        where: { id: 'b-1' },
      });
    });

    it('should throw NotFoundException for non-existent budget', async () => {
      prismaMock.budget.findUnique.mockResolvedValue(null);

      await expect(service.remove('b-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if budget belongs to another user', async () => {
      prismaMock.budget.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-2',
      });

      await expect(service.remove('b-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBudgetStatus', () => {
    it('should calculate budget spending percentage', async () => {
      prismaMock.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: 500,
          category: { id: 'cat-1', name: 'Food' },
        },
      ]);

      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 350 },
      });

      const result = await service.getBudgetStatus('user-1', 1, 2024);

      expect(result).toHaveLength(1);
      expect(result[0].budgetAmount).toBe(500);
      expect(result[0].spentAmount).toBe(350);
      expect(result[0].remaining).toBe(150);
      expect(result[0].percentage).toBe(70);
      expect(result[0].isOverBudget).toBe(false);
    });

    it('should detect over-budget spending', async () => {
      prismaMock.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: 200,
          category: { id: 'cat-1', name: 'Food' },
        },
      ]);

      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 350 },
      });

      const result = await service.getBudgetStatus('user-1', 1, 2024);

      expect(result[0].isOverBudget).toBe(true);
      expect(result[0].remaining).toBe(-150);
      expect(result[0].percentage).toBe(175);
    });

    it('should handle budget with zero spending', async () => {
      prismaMock.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: 500,
          category: { id: 'cat-1', name: 'Food' },
        },
      ]);

      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getBudgetStatus('user-1', 1, 2024);

      expect(result[0].spentAmount).toBe(0);
      expect(result[0].remaining).toBe(500);
      expect(result[0].percentage).toBe(0);
      expect(result[0].isOverBudget).toBe(false);
    });

    it('should query expenses with correct date range', async () => {
      prismaMock.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: 500,
          category: { id: 'cat-1', name: 'Food' },
        },
      ]);

      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.getBudgetStatus('user-1', 3, 2024);

      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          categoryId: 'cat-1',
          type: 'EXPENSE',
          date: {
            gte: new Date(2024, 2, 1),
            lte: new Date(2024, 3, 0, 23, 59, 59),
          },
        },
        _sum: { amount: true },
      });
    });

    it('should handle multiple budgets', async () => {
      prismaMock.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: 500,
          category: { id: 'cat-1', name: 'Food' },
        },
        {
          id: 'b-2',
          categoryId: 'cat-2',
          amount: 300,
          category: { id: 'cat-2', name: 'Transport' },
        },
      ]);

      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 400 } })
        .mockResolvedValueOnce({ _sum: { amount: 100 } });

      const result = await service.getBudgetStatus('user-1', 1, 2024);

      expect(result).toHaveLength(2);
      expect(result[0].spentAmount).toBe(400);
      expect(result[1].spentAmount).toBe(100);
    });

    it('should return empty array when no budgets exist', async () => {
      prismaMock.budget.findMany.mockResolvedValue([]);

      const result = await service.getBudgetStatus('user-1', 1, 2024);

      expect(result).toHaveLength(0);
      expect(prismaMock.transaction.aggregate).not.toHaveBeenCalled();
    });
  });
});
