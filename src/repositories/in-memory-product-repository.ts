import { randomUUID } from 'node:crypto';

import type { Product, ProductPayload, ProductRepository } from '../types.js';

export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();

  async getAll(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async create(payload: ProductPayload): Promise<Product> {
    const product: Product = {
      id: randomUUID(),
      ...payload,
    };

    this.products.set(product.id, product);

    return product;
  }

  async update(id: string, payload: ProductPayload): Promise<Product | null> {
    if (!this.products.has(id)) {
      return null;
    }

    const product: Product = {
      id,
      ...payload,
    };

    this.products.set(id, product);

    return product;
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }
}
