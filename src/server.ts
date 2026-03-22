import { createApp } from './app.js';
import { config } from './config.js';
import { InMemoryProductRepository } from './repositories/in-memory-product-repository.js';

async function start(): Promise<void> {
  const app = createApp(new InMemoryProductRepository());

  try {
    await app.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

void start();
