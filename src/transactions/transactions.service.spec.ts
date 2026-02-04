import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { prismaMock } from '../common/test/prisma-mock';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;

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
        TransactionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('create', () => {
    it('should create a transaction with all fields', async () => {
      const dto = {
        categoryId: 'cat-1',
        type: 'EXPENSE' as const,
        amount: 50.0,
        currency: 'USD',
        description: 'Test expense',
        date: '2024-01-15',
      };

      const expected = {
        id: 'tx-1',
        userId: 'user-1',
        ...dto,
        date: new Date('2024-01-15'),
        createdAt: new Date(),
        category: { id: 'cat-1', name: 'Food' },
      };

      prismaMock.transaction.create.mockResolvedValue(expected);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(expected);
      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          categoryId: 'cat-1',
          type: 'EXPENSE',
          amount: 50.0,
          currency: 'USD',
          description: 'Test expense',
          date: new Date('2024-01-15'),
        },
        include: { category: true },
      });
    });

    it('should use default values when optional fields are not provided', async () => {
      const dto = {
        categoryId: 'cat-1',
        type: 'INCOME' as const,
        amount: 1000,
      };

      prismaMock.transaction.create.mockResolvedValue({ id: 'tx-2', ...dto });

      await service.create('user-1', dto);

      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          categoryId: 'cat-1',
          type: 'INCOME',
          amount: 1000,
          currency: 'USD',
          description: '',
          date: expect.any(Date),
        },
        include: { category: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return a transaction if it belongs to the user', async () => {
      const transaction = {
        id: 'tx-1',
        userId: 'user-1',
        amount: 100,
        category: { id: 'cat-1', name: 'Food' },
      };
      prismaMock.transaction.findUnique.mockResolvedValue(transaction);

      const result = await service.findOne('tx-1', 'user-1');

      expect(result).toEqual(transaction);
      expect(prismaMock.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        include: { category: true },
      });
    });

    it('should throw NotFoundException if transaction does not exist', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne('tx-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if transaction belongs to another user', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-2',
      });

      await expect(service.findOne('tx-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions with defaults', async () => {
      const transactions = [
        { id: 'tx-1', amount: 100, category: { name: 'Food' } },
        { id: 'tx-2', amount: 200, category: { name: 'Transport' } },
      ];

      prismaMock.transaction.findMany.mockResolvedValue(transactions);
      prismaMock.transaction.count.mockResolvedValue(2);

      const result = await service.findAll('user-1', {});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should respect custom page and limit', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.transaction.count.mockResolvedValue(50);

      const result = await service.findAll('user-1', { page: 3, limit: 10 });

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should apply date filters', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.transaction.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        }),
      );
    });

    it('should filter by categoryId and type', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.transaction.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        categoryId: 'cat-1',
        type: 'EXPENSE' as const,
      });

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            categoryId: 'cat-1',
            type: 'EXPENSE',
          }),
        }),
      );
    });

    it('should order by date descending and include category', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);
      prismaMock.transaction.count.mockResolvedValue(0);

      await service.findAll('user-1', {});

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'desc' },
          include: { category: true },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const existing = { id: 'tx-1', userId: 'user-1', amount: 100 };
      prismaMock.transaction.findUnique.mockResolvedValue(existing);
      prismaMock.transaction.update.mockResolvedValue({
        ...existing,
        amount: 200,
        category: { id: 'cat-1', name: 'Food' },
      });

      const result = await service.update('tx-1', 'user-1', { amount: 200 });

      expect(result.amount).toBe(200);
      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { amount: 200, date: undefined },
        include: { category: true },
      });
    });

    it('should convert date string when updating', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
      });
      prismaMock.transaction.update.mockResolvedValue({ id: 'tx-1' });

      await service.update('tx-1', 'user-1', { date: '2024-06-15' });

      expect(prismaMock.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { date: new Date('2024-06-15') },
        include: { category: true },
      });
    });

    it('should throw NotFoundException if transaction does not exist', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.update('tx-999', 'user-1', { amount: 200 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a transaction owned by the user', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
      });
      prismaMock.transaction.delete.mockResolvedValue({ id: 'tx-1' });

      await service.remove('tx-1', 'user-1');

      expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
    });

    it('should throw ForbiddenException if transaction belongs to another user', async () => {
      prismaMock.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-2',
      });

      await expect(service.remove('tx-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getBalance', () => {
    it('should calculate balance correctly', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000 } })
        .mockResolvedValueOnce({ _sum: { amount: 3000 } });

      const result = await service.getBalance('user-1');

      expect(result).toEqual({
        totalIncome: 5000,
        totalExpense: 3000,
        balance: 2000,
      });
    });

    it('should handle zero transactions (null sums)', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getBalance('user-1');

      expect(result).toEqual({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
      });
    });

    it('should query income and expense separately', async () => {
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })
        .mockResolvedValueOnce({ _sum: { amount: 50 } });

      await service.getBalance('user-1');

      expect(prismaMock.transaction.aggregate).toHaveBeenCalledTimes(2);
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'INCOME' },
        _sum: { amount: true },
      });
      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'EXPENSE' },
        _sum: { amount: true },
      });
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions with default limit', async () => {
      const transactions = [{ id: 'tx-1' }, { id: 'tx-2' }];
      prismaMock.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getRecentTransactions('user-1');

      expect(result).toEqual(transactions);
      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 5,
      });
    });

    it('should accept custom limit', async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      await service.getRecentTransactions('user-1', 10);

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });
});
