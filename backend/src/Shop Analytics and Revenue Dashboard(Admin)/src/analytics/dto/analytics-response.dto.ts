export class PopularItemDto {
  itemId: string;
  itemName: string;
  purchaseCount: number;
  totalRevenue: number;
}

export class AnalyticsResponseDto {
  totalRevenue: number;
  popularItems: PopularItemDto[];
  conversionRate: number;
  retentionMetrics: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export const EMPTY_ANALYTICS_RESPONSE: AnalyticsResponseDto = {
  totalRevenue: 0,
  popularItems: [],
  conversionRate: 0,
  retentionMetrics: {
    day1: 0,
    day7: 0,
    day30: 0,
  },
};
