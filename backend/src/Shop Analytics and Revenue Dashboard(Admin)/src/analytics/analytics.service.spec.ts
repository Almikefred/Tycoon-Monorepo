import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Transaction } from '../entities/transaction.entity';
import { PlayerActivity } from '../entities/player-activity.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockQueryBuilder: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockTransactionRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockActivityRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(PlayerActivity),
          useValue: mockActivityRepo,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getShopAnalytics', () => {
    it('should return complete analytics data', async () => {
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '1500.50' })
        .mockResolvedValueOnce({ count: '100' })
        .mockResolvedValueOnce({ count: '25' })
        .mockResolvedValueOnce({ count: '0' })
        .mockResolvedValueOnce({ count: '0' })
        .mockResolvedValueOnce({ count: '0' });

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          {
            itemId: '1',
            itemName: 'Sword',
            purchaseCount: '50',
            totalRevenue: '1000',
          },
          {
            itemId: '2',
            itemName: 'Shield',
            purchaseCount: '30',
            totalRevenue: '500.50',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getShopAnalytics();

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('popularItems');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('retentionMetrics');
      expect(result.totalRevenue).toBe(1500.5);
      expect(result.popularItems).toHaveLength(2);
      expect(result.conversionRate).toBe(25);
    });

    it('should handle empty data gracefully', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getShopAnalytics();

      expect(result.totalRevenue).toBe(0);
      expect(result.popularItems).toEqual([]);
      expect(result.conversionRate).toBe(0);
    });

    it('should return zero-valued numeric fields when the aggregation returns an empty result set', async () => {
      // Postgres returns null for SUM/AVG over an empty set; the service must
      // coerce those nulls to 0 so the response matches the DTO types.
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: null,
        count: null,
      });
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getShopAnalytics();

      expect(result.totalRevenue).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.popularItems).toEqual([]);

      const numericFields = [
        result.totalRevenue,
        result.conversionRate,
        result.retentionMetrics?.day1Retention,
        result.retentionMetrics?.day7Retention,
        result.retentionMetrics?.day30Retention,
      ];

      for (const value of numericFields) {
        expect(value).not.toBeNull();
        expect(value).not.toBeNaN();
        expect(value).toBe(0);
      }
    });

    it('should return the aggregated values unchanged on the populated path', async () => {
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '2500.75' })
        .mockResolvedValueOnce({ count: '200' })
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '10' })
        .mockResolvedValueOnce({ count: '5' })
        .mockResolvedValueOnce({ count: '2' });

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          {
            itemId: '1',
            itemName: 'Potion',
            purchaseCount: '120',
            totalRevenue: '2400.75',
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getShopAnalytics();

      expect(result.totalRevenue).toBe(2500.75);
      expect(result.conversionRate).toBe(25);
      expect(result.popularItems).toHaveLength(1);
      expect(result.popularItems[0]).toMatchObject({
        itemId: '1',
        itemName: 'Potion',
        purchaseCount: 120,
        totalRevenue: 2400.75,
      });
    });
  });
});
