import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { AppError, notFoundMessage } from './errors.js';
import type { ProductRepository } from './types.js';
import { formatZodError, productIdSchema, productPayloadSchema } from './validation.js';

interface ProductParams {
  productId: string;
}

export function createApp(repository: ProductRepository): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  app.get('/api/products', async (_request, reply) => {
    const products = await repository.getAll();
    return reply.status(200).send(products);
  });

  app.get<{ Params: ProductParams }>('/api/products/:productId', async (request, reply) => {
    const productId = productIdSchema.parse(request.params.productId);
    const product = await repository.getById(productId);

    if (!product) {
      throw new AppError(404, notFoundMessage(productId));
    }

    return reply.status(200).send(product);
  });

  app.post('/api/products', async (request, reply) => {
    const payload = productPayloadSchema.parse(request.body);
    const product = await repository.create(payload);

    return reply.status(201).send(product);
  });

  app.put<{ Params: ProductParams }>('/api/products/:productId', async (request, reply) => {
    const productId = productIdSchema.parse(request.params.productId);
    const payload = productPayloadSchema.parse(request.body);
    const product = await repository.update(productId, payload);

    if (!product) {
      throw new AppError(404, notFoundMessage(productId));
    }

    return reply.status(200).send(product);
  });

  app.delete<{ Params: ProductParams }>('/api/products/:productId', async (request, reply) => {
    const productId = productIdSchema.parse(request.params.productId);
    const deleted = await repository.delete(productId);

    if (!deleted) {
      throw new AppError(404, notFoundMessage(productId));
    }

    return reply.status(204).send();
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.status(404).send({
      message: 'Route not found',
    });
  });

  app.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: formatZodError(error),
      });
    }

    if (error instanceof Error) {
      requestLog(error);
    } else {
      console.error(error);
    }

    return reply.status(500).send({
      message: 'Internal server error',
    });
  });

  return app;
}

function requestLog(error: Error): void {
  console.error(error);
}
