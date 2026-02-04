import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { prismaMock } from '../common/test/prisma-mock';
import { NotFoundException } from '@nestjs/common';

// Mock uuid to make key generation predictable in tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
}));

describe('ApiKeysService', () => {
  let service: ApiKeysService;

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
        ApiKeysService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('create', () => {
    it('should create an API key with bp_ prefix', async () => {
      prismaMock.apiKey.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'key-1',
          ...data,
          isActive: true,
          requestsCount: 0,
          createdAt: new Date(),
        }),
      );

      const result = await service.create('user-1', { name: 'My App' });

      expect(result.key).toBe('bp_12345678123412341234123456789abc');
      expect(result.key).toMatch(/^bp_[a-f0-9]{32}$/);
    });

    it('should pass correct data to prisma create', async () => {
      prismaMock.apiKey.create.mockResolvedValue({ id: 'key-1' });

      await service.create('user-1', { name: 'My App' });

      expect(prismaMock.apiKey.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          key: 'bp_12345678123412341234123456789abc',
          name: 'My App',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return user API keys with selected fields', async () => {
      const keys = [
        {
          id: 'k-1',
          name: 'App 1',
          key: 'bp_123',
          requestsCount: 10,
          lastUsed: null,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'k-2',
          name: 'App 2',
          key: 'bp_456',
          requestsCount: 5,
          lastUsed: new Date(),
          isActive: true,
          createdAt: new Date(),
        },
      ];
      prismaMock.apiKey.findMany.mockResolvedValue(keys);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(2);
      expect(prismaMock.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: {
          id: true,
          name: true,
          key: true,
          requestsCount: true,
          lastUsed: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no keys', async () => {
      prismaMock.apiKey.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('revoke', () => {
    it('should deactivate an API key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'k-1',
        userId: 'user-1',
        isActive: true,
      });
      prismaMock.apiKey.update.mockResolvedValue({
        id: 'k-1',
        isActive: false,
      });

      const result = await service.revoke('k-1', 'user-1');

      expect(result.isActive).toBe(false);
      expect(prismaMock.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.revoke('k-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if key belongs to another user', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'k-1',
        userId: 'user-2',
      });

      await expect(service.revoke('k-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.apiKey.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an API key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'k-1',
        userId: 'user-1',
      });
      prismaMock.apiKey.delete.mockResolvedValue({ id: 'k-1' });

      await service.delete('k-1', 'user-1');

      expect(prismaMock.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'k-1' },
      });
    });

    it('should throw NotFoundException for non-existent key', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.delete('k-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.apiKey.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if key belongs to another user', async () => {
      prismaMock.apiKey.findUnique.mockResolvedValue({
        id: 'k-1',
        userId: 'user-2',
      });

      await expect(service.delete('k-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.apiKey.delete).not.toHaveBeenCalled();
    });
  });
});
