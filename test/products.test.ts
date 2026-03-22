import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';
import { InMemoryProductRepository } from '../src/repositories/in-memory-product-repository.js';
import type { Product, ProductPayload, ProductRepository } from '../src/types.js';

function buildApp() {
  return createApp(new InMemoryProductRepository());
}

class FailingProductRepository implements ProductRepository {
  async getAll(): Promise<Product[]> {
    throw new Error('boom');
  }

  async getById(_id: string): Promise<Product | null> {
    throw new Error('boom');
  }

  async create(_payload: ProductPayload): Promise<Product> {
    throw new Error('boom');
  }

  async update(_id: string, _payload: ProductPayload): Promise<Product | null> {
    throw new Error('boom');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('boom');
  }
}

const productPayload = {
  name: 'Mechanical Keyboard',
  description: 'Compact wireless keyboard',
  price: 129.99,
  category: 'electronics',
  inStock: true,
};

test('GET /api/products returns an empty array initially', async () => {
  const app = buildApp();

  const response = await app.inject({
    method: 'GET',
    url: '/api/products',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), []);

  await app.close();
});

test('product CRUD lifecycle works as expected', async () => {
  const app = buildApp();

  const createdResponse = await app.inject({
    method: 'POST',
    url: '/api/products',
    payload: productPayload,
  });

  assert.equal(createdResponse.statusCode, 201);
  const createdProduct = createdResponse.json();
  assert.match(createdProduct.id, /^[0-9a-f-]{36}$/i);
  assert.equal(createdProduct.name, productPayload.name);

  const getResponse = await app.inject({
    method: 'GET',
    url: `/api/products/${createdProduct.id}`,
  });

  assert.equal(getResponse.statusCode, 200);
  assert.deepEqual(getResponse.json(), createdProduct);

  const updatedPayload = {
    ...productPayload,
    price: 149.99,
    inStock: false,
  };

  const updateResponse = await app.inject({
    method: 'PUT',
    url: `/api/products/${createdProduct.id}`,
    payload: updatedPayload,
  });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.json().id, createdProduct.id);
  assert.equal(updateResponse.json().price, updatedPayload.price);
  assert.equal(updateResponse.json().inStock, updatedPayload.inStock);

  const deleteResponse = await app.inject({
    method: 'DELETE',
    url: `/api/products/${createdProduct.id}`,
  });

  assert.equal(deleteResponse.statusCode, 204);

  const missingResponse = await app.inject({
    method: 'GET',
    url: `/api/products/${createdProduct.id}`,
  });

  assert.equal(missingResponse.statusCode, 404);
  assert.equal(missingResponse.json().message, `Product with id "${createdProduct.id}" was not found`);

  await app.close();
});

test('invalid product payload returns 400', async () => {
  const app = buildApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/products',
    payload: {
      ...productPayload,
      price: -10,
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().message, 'price must be a positive number');

  await app.close();
});

test('invalid uuid returns 400', async () => {
  const app = buildApp();

  const response = await app.inject({
    method: 'GET',
    url: '/api/products/not-a-uuid',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().message, 'Product id must be a valid UUID');

  await app.close();
});

test('unknown route returns a human-friendly 404 message', async () => {
  const app = buildApp();

  const response = await app.inject({
    method: 'GET',
    url: '/some-non/existing/resource',
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().message, 'Route not found');

  await app.close();
});

test('malformed JSON returns a 400 response', async () => {
  const app = buildApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/products',
    payload: '{"name":"Broken"',
    headers: {
      'content-type': 'application/json',
    },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.json().message, /JSON/i);

  await app.close();
});

test('unexpected repository errors return a 500 response', async () => {
  const app = createApp(new FailingProductRepository());

  const response = await app.inject({
    method: 'GET',
    url: '/api/products',
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.json().message, 'Internal server error');

  await app.close();
});
