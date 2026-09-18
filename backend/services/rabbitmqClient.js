import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const RABBITMQ_CONFIG = {
  URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  EXCHANGE: 'app.sync.exchange',
  DLX_EXCHANGE: 'app.sync.dlx',
  STUDENT_QUEUE: 'elasticsearch.student.sync.queue',
  STUDENT_DLQ: 'elasticsearch.student.sync.dlq',
  STUDENT_ROUTING_PATTERN: 'sync.student.*',
  STUDENT_DLQ_ROUTING_KEY: 'student_dead_letter'
};

let connection = null;

export async function getRabbitConnection() {
  if (connection) return connection;
  try {
    connection = await amqp.connect(RABBITMQ_CONFIG.URL);
    console.log('[RabbitMQ] Connected successfully to', RABBITMQ_CONFIG.URL.replace(/\/\/.*@/, '//***@'));

    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error:', err.message);
      connection = null;
    });

    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed. Will reconnect on next request.');
      connection = null;
    });

    return connection;
  } catch (err) {
    console.error('[RabbitMQ] Failed to connect:', err.message);
    throw err;
  }
}

export async function setupRabbitTopology() {
  const conn = await getRabbitConnection();
  const channel = await conn.createChannel();

  // 1. Assert Dead Letter Exchange (DLX) and Dead Letter Queue (DLQ)
  await channel.assertExchange(RABBITMQ_CONFIG.DLX_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(RABBITMQ_CONFIG.STUDENT_DLQ, { durable: true });
  await channel.bindQueue(
    RABBITMQ_CONFIG.STUDENT_DLQ,
    RABBITMQ_CONFIG.DLX_EXCHANGE,
    RABBITMQ_CONFIG.STUDENT_DLQ_ROUTING_KEY
  );

  // 2. Assert Main Topic Exchange
  await channel.assertExchange(RABBITMQ_CONFIG.EXCHANGE, 'topic', { durable: true });

  // 3. Assert Main Student Queue with DLX configuration
  await channel.assertQueue(RABBITMQ_CONFIG.STUDENT_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': RABBITMQ_CONFIG.DLX_EXCHANGE,
      'x-dead-letter-routing-key': RABBITMQ_CONFIG.STUDENT_DLQ_ROUTING_KEY
    }
  });

  // 4. Bind main queue to exchange
  await channel.bindQueue(
    RABBITMQ_CONFIG.STUDENT_QUEUE,
    RABBITMQ_CONFIG.EXCHANGE,
    RABBITMQ_CONFIG.STUDENT_ROUTING_PATTERN
  );

  await channel.close();
  console.log('[RabbitMQ] Topology setup completed (Exchanges, Queues, DLQ bound).');
}

export async function closeRabbitConnection() {
  if (connection) {
    try {
      await connection.close();
    } catch (e) {
      // ignore
    }
    connection = null;
  }
}
