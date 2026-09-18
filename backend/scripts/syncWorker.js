import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRabbitTopology, closeRabbitConnection } from '../services/rabbitmqClient.js';
import { initStudentIndex } from '../services/elasticsearchClient.js';
import { startOutboxPublisher, stopOutboxPublisher } from '../services/outboxPublisher.js';
import { startElasticsearchConsumer, stopElasticsearchConsumer } from '../services/elasticsearchConsumer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

console.log('==================================================');
console.log('  🚀 Starting Standalone Data Sync Worker Service  ');
console.log('  (PostgreSQL Outbox -> RabbitMQ -> Elasticsearch) ');
console.log('==================================================');

async function main() {
  try {
    // 1. Ensure RabbitMQ Exchanges, Queues, DLQ are configured
    console.log('[Worker] Initializing RabbitMQ topology...');
    await setupRabbitTopology();

    // 2. Ensure Elasticsearch Student index exists with mappings
    console.log('[Worker] Initializing Elasticsearch index schema...');
    await initStudentIndex();

    // 3. Start Outbox Publisher (Relay)
    console.log('[Worker] Starting Outbox Publisher loop...');
    await startOutboxPublisher({ pollIntervalMs: 1000, batchSize: 50 });

    // 4. Start Elasticsearch Consumer
    console.log('[Worker] Starting Elasticsearch Consumer...');
    await startElasticsearchConsumer();

    console.log('✅ Data Sync Worker is fully operational and healthy.');
  } catch (err) {
    console.error('❌ Fatal error during Worker startup:', err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`\n[Worker] Received ${signal}. Initiating graceful shutdown...`);
  stopOutboxPublisher();
  await stopElasticsearchConsumer();
  await closeRabbitConnection();
  console.log('[Worker] Shutdown complete. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
