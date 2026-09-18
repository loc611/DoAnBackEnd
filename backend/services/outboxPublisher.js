import prisma from '../prismaClient.js';
import { getRabbitConnection, RABBITMQ_CONFIG } from './rabbitmqClient.js';

let isRunning = false;
let pollTimer = null;

export async function startOutboxPublisher({ pollIntervalMs = 1000, batchSize = 50 } = {}) {
  if (isRunning) {
    console.warn('[OutboxPublisher] Already running.');
    return;
  }
  isRunning = true;
  console.log(`[OutboxPublisher] Starting outbox poller (interval: ${pollIntervalMs}ms, batch: ${batchSize})...`);

  const conn = await getRabbitConnection();
  const confirmChannel = await conn.createConfirmChannel();
  await confirmChannel.assertExchange(RABBITMQ_CONFIG.EXCHANGE, 'topic', { durable: true });

  const pollAndPublish = async () => {
    if (!isRunning) return;

    try {
      // Concurrency-safe query: SKIP LOCKED allows multiple publisher instances to scale horizontally
      const pendingEvents = await prisma.$queryRaw`
        SELECT * FROM "OutboxEvent"
        WHERE "status" = 'PENDING'
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED;
      `;

      if (pendingEvents && pendingEvents.length > 0) {
        for (const event of pendingEvents) {
          const routingKey = `sync.${event.aggregateType.toLowerCase()}.${event.eventType.toLowerCase().replace('_', '.')}`;
          const messageBuffer = Buffer.from(JSON.stringify({
            eventId: event.id,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            version: event.version,
            payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
            timestamp: event.createdAt
          }));

          try {
            // Publish with Publisher Confirms
            await new Promise((resolve, reject) => {
              confirmChannel.publish(
                RABBITMQ_CONFIG.EXCHANGE,
                routingKey,
                messageBuffer,
                {
                  persistent: true,
                  messageId: event.id,
                  contentType: 'application/json',
                  timestamp: Date.now()
                },
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            });

            // Mark as PUBLISHED
            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                status: 'PUBLISHED',
                processedAt: new Date()
              }
            });
          } catch (pubErr) {
            console.error(`[OutboxPublisher] Failed to publish event ${event.id}:`, pubErr.message);
            const newRetryCount = (event.retryCount || 0) + 1;
            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                retryCount: newRetryCount,
                lastError: pubErr.message,
                status: newRetryCount >= 5 ? 'FAILED' : 'PENDING'
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('[OutboxPublisher] Error during poll cycle:', err.message);
    } finally {
      if (isRunning) {
        pollTimer = setTimeout(pollAndPublish, pollIntervalMs);
      }
    }
  };

  pollAndPublish();
}

export function stopOutboxPublisher() {
  isRunning = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  console.log('[OutboxPublisher] Stopped.');
}
