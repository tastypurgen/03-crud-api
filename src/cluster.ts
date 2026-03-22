import cluster, { type Worker } from 'node:cluster';
import { availableParallelism } from 'node:os';
import http, { type RequestOptions } from 'node:http';

import { createApp } from './app.js';
import { config } from './config.js';
import { InMemoryProductRepository } from './repositories/in-memory-product-repository.js';
import { IpcProductRepository } from './repositories/ipc-product-repository.js';
import type { ProductPayload } from './types.js';

interface RepositoryRequest {
  type: 'repository-request';
  requestId: string;
  action: 'getAll' | 'getById' | 'create' | 'update' | 'delete';
  id?: string;
  payload?: ProductPayload;
}

async function startPrimary(): Promise<void> {
  const repository = new InMemoryProductRepository();
  const workerCount = Math.max(1, availableParallelism() - 1);
  const workerPorts = Array.from({ length: workerCount }, (_, index) => config.PORT + index + 1);
  const workerPortsById = new Map<number, string>();
  let nextWorkerIndex = 0;

  for (const port of workerPorts) {
    const worker = cluster.fork({
      WORKER_PORT: String(port),
    });
    workerPortsById.set(worker.id, String(port));

    bindWorkerMessages(worker, repository);
  }

  const loadBalancer = http.createServer((clientRequest, clientResponse) => {
    const workerPort = workerPorts[nextWorkerIndex];
    nextWorkerIndex = (nextWorkerIndex + 1) % workerPorts.length;

    const options: RequestOptions = {
      hostname: '127.0.0.1',
      port: workerPort,
      path: clientRequest.url,
      method: clientRequest.method,
      headers: clientRequest.headers,
    };

    const proxyRequest = http.request(options, (proxyResponse) => {
      clientResponse.writeHead(proxyResponse.statusCode ?? 500, proxyResponse.headers);
      proxyResponse.pipe(clientResponse, { end: true });
    });

    proxyRequest.on('error', () => {
      clientResponse.writeHead(500, {
        'content-type': 'application/json',
      });
      clientResponse.end(JSON.stringify({
        message: 'Internal server error',
      }));
    });

    clientRequest.pipe(proxyRequest, { end: true });
  });

  loadBalancer.listen(config.PORT, '0.0.0.0');

  cluster.on('exit', (worker) => {
    const workerPort = workerPortsById.get(worker.id);
    if (!workerPort) {
      return;
    }

    workerPortsById.delete(worker.id);

    const replacement = cluster.fork({
      WORKER_PORT: workerPort,
    });
    workerPortsById.set(replacement.id, workerPort);

    bindWorkerMessages(replacement, repository);
  });
}

async function startWorker(): Promise<void> {
  const port = Number(process.env.WORKER_PORT);
  const app = createApp(new IpcProductRepository());

  try {
    await app.listen({
      port,
      host: '0.0.0.0',
    });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

async function handleRepositoryAction(
  repository: InMemoryProductRepository,
  message: RepositoryRequest,
) {
  switch (message.action) {
    case 'getAll':
      return repository.getAll();
    case 'getById':
      return repository.getById(message.id ?? '');
    case 'create':
      return repository.create(message.payload as ProductPayload);
    case 'update':
      return repository.update(message.id ?? '', message.payload as ProductPayload);
    case 'delete':
      return repository.delete(message.id ?? '');
    default:
      throw new Error('Unsupported repository action');
  }
}

function bindWorkerMessages(
  worker: Worker,
  repository: InMemoryProductRepository,
): void {
  worker.on('message', async (message: RepositoryRequest) => {
    if (!message || message.type !== 'repository-request') {
      return;
    }

    try {
      const result = await handleRepositoryAction(repository, message);
      worker.send({
        type: 'repository-response',
        requestId: message.requestId,
        success: true,
        result,
      });
    } catch (error) {
      worker.send({
        type: 'repository-response',
        requestId: message.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Repository request failed',
      });
    }
  });
}

if (cluster.isPrimary) {
  void startPrimary();
} else {
  void startWorker();
}
