import { randomUUID } from 'crypto';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  sku?: string;
  isActive: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemInput {
  name: string;
  description: string;
  price: number;
  sku?: string;
  isActive: boolean;
  images: string[];
}

export type UpdateItemInput = Partial<Omit<CreateItemInput, 'sku'>> & { sku?: string };

export type ShopServiceErrorCode = 'ITEM_NOT_FOUND' | 'DUPLICATE_ITEM';

export class ShopServiceError extends Error {
  readonly code: ShopServiceErrorCode;

  constructor(code: ShopServiceErrorCode, message: string) {
    super(message);
    this.name = 'ShopServiceError';
    this.code = code;
  }
}

class ShopService {
  private items: Map<string, ShopItem> = new Map();

  clearAll(): void {
    this.items.clear();
  }

  private assertUnique(name: string, sku: string | undefined, ignoreId?: string): void {
    for (const item of this.items.values()) {
      if (ignoreId && item.id === ignoreId) {
        continue;
      }
      if (item.name === name) {
        throw new ShopServiceError('DUPLICATE_ITEM', `An item named "${name}" already exists`);
      }
      if (sku && item.sku === sku) {
        throw new ShopServiceError('DUPLICATE_ITEM', `An item with sku "${sku}" already exists`);
      }
    }
  }

  createItem(input: CreateItemInput): ShopItem {
    this.assertUnique(input.name, input.sku);

    const now = new Date();
    const item: ShopItem = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      price: input.price,
      sku: input.sku,
      isActive: input.isActive,
      images: input.images,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);
    return item;
  }

  getItems(activeOnly?: boolean): ShopItem[] {
    const all = Array.from(this.items.values());
    return activeOnly ? all.filter((item) => item.isActive) : all;
  }

  getItemById(id: string): ShopItem | undefined {
    return this.items.get(id);
  }

  updateItem(id: string, data: UpdateItemInput): ShopItem {
    const existing = this.items.get(id);
    if (!existing) {
      throw new ShopServiceError('ITEM_NOT_FOUND', `Item with id "${id}" was not found`);
    }

    const nextName = data.name ?? existing.name;
    const nextSku = data.sku ?? existing.sku;
    this.assertUnique(nextName, nextSku, id);

    const updated: ShopItem = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.items.set(id, updated);
    return updated;
  }

  updatePrice(id: string, price: number): ShopItem {
    return this.updateItem(id, { price });
  }

  toggleActive(id: string, isActive: boolean): ShopItem {
    return this.updateItem(id, { isActive });
  }

  deleteItem(id: string): boolean {
    if (!this.items.has(id)) {
      throw new ShopServiceError('ITEM_NOT_FOUND', `Item with id "${id}" was not found`);
    }
    return this.items.delete(id);
  }

  bulkUpdate(updates: Array<{ id: string; data: UpdateItemInput }>): ShopItem[] {
    const result: ShopItem[] = [];
    for (const { id, data } of updates) {
      const existing = this.items.get(id);
      if (!existing) {
        continue;
      }
      result.push(this.updateItem(id, data));
    }
    return result;
  }
}

export const shopService = new ShopService();
