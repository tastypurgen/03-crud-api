import { randomUUID } from 'node:crypto';

import type { Product, ProductPayload, ProductRepository } from '../types.js';

interface RepositoryRequest {
  type: 'repository-request';
  requestId: string;
  action: 'getAll' | 'getById' | 'create' | 'update' | 'delete';
  id?: string;
  payload?: ProductPayload;
}

interface RepositorySuccessResponse {
  type: 'repository-response';
  requestId: string;
  success: true;
  result: Product[] | Product | boolean | null;
}

interface RepositoryErrorResponse {
  type: 'repository-response';
  requestId: string;
  success: false;
  error: string;
}

type RepositoryResponse = RepositorySuccessResponse | RepositoryErrorResponse;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export class IpcProductRepository implements ProductRepository {
  private readonly pendingRequests = new Map<string, PendingRequest>();

  constructor() {
    process.on('message', (message: RepositoryResponse) => {
      if (!message || message.type !== 'repository-response') {
        return;
      }

      const pendingRequest = this.pendingRequests.get(message.requestId);
      if (!pendingRequest) {
        return;
      }

      this.pendingRequests.delete(message.requestId);

      if (message.success) {
        pendingRequest.resolve(message.result);
        return;
      }

      pendingRequest.reject(new Error(message.error));
    });
  }

  async getAll(): Promise<Product[]> {
    return this.send<Product[]>('getAll');
  }

  async getById(id: string): Promise<Product | null> {
    return this.send<Product | null>('getById', { id });
  }

  async create(payload: ProductPayload): Promise<Product> {
    return this.send<Product>('create', { payload });
  }

  async update(id: string, payload: ProductPayload): Promise<Product | null> {
    return this.send<Product | null>('update', { id, payload });
  }

  async delete(id: string): Promise<boolean> {
    return this.send<boolean>('delete', { id });
  }

  private send<T extends Product[] | Product | boolean | null>(
    action: RepositoryRequest['action'],
    data: Pick<RepositoryRequest, 'id' | 'payload'> = {},
  ): Promise<T> {
    const requestId = randomUUID();

    const message: RepositoryRequest = {
      type: 'repository-request',
      requestId,
      action,
      ...data,
    };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      const sent = process.send?.(message);
      if (!sent) {
        this.pendingRequests.delete(requestId);
        reject(new Error('Failed to contact repository process'));
      }
    });
  }
}
