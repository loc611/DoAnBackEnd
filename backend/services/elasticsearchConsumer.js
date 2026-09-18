import prisma from '../prismaClient.js';
import { getRabbitConnection, RABBITMQ_CONFIG } from './rabbitmqClient.js';
import { esClient, ELASTICSEARCH_CONFIG } from './elasticsearchClient.js';

let consumerChannel = null;
let consumerTag = null;
const MAX_RETRIES = 3;

export async function startElasticsearchConsumer() {
  const conn = await getRabbitConnection();
  consumerChannel = await conn.createChannel();
  await consumerChannel.prefetch(10);

  console.log(`[ElasticsearchConsumer] Consuming from queue "${RABBITMQ_CONFIG.STUDENT_QUEUE}"...`);

  const response = await consumerChannel.consume(
    RABBITMQ_CONFIG.STUDENT_QUEUE,
    async (msg) => {
      if (!msg) return;

      let event;
      try {
        event = JSON.parse(msg.content.toString());
      } catch (parseErr) {
        console.error('[ElasticsearchConsumer] Poison message detected (invalid JSON). Routing to DLQ:', parseErr.message);
        // Invalid payload cannot be retried -> send directly to DLQ
        consumerChannel.nack(msg, false, false);
        return;
      }

      const { eventId, aggregateId, version, eventType, payload } = event;

      try {
        // 1. IDEMPOTENCY CHECK: Avoid processing duplicate deliveries
        const alreadyProcessed = await prisma.processedEvent.findUnique({
          where: { eventId }
        });

        if (alreadyProcessed) {
          console.log(`[ElasticsearchConsumer] Duplicate event skipped: ${eventId}`);
          consumerChannel.ack(msg);
          return;
        }

        // 2. APPLY TO ELASTICSEARCH WITH EXTERNAL VERSIONING
        const index = ELASTICSEARCH_CONFIG.STUDENT_INDEX;

        if (eventType === 'STUDENT_DELETED') {
          try {
            await esClient.delete({
              index,
              id: aggregateId,
              version: version,
              version_type: 'external'
            });
          } catch (delErr) {
            // If already deleted or not found, treat as success
            if (delErr.meta?.statusCode !== 404 && delErr.statusCode !== 404) {
              throw delErr;
            }
          }
        } else {
          await esClient.index({
            index,
            id: aggregateId,
            version: version,
            version_type: 'external',
            document: payload
          });
        }

        // 3. RECORD PROCESSED EVENT IN DATABASE
        await prisma.processedEvent.create({
          data: { eventId }
        });

        // 4. POSITIVE ACKNOWLEDGEMENT
        consumerChannel.ack(msg);
      } catch (err) {
        // Handle 409 Version Conflict (Stale Event arrived out-of-order)
        const isConflict = err.meta?.statusCode === 409 || err.statusCode === 409;
        if (isConflict) {
          console.warn(`[ElasticsearchConsumer] Stale event detected for student ${aggregateId} (v${version} <= current). Safely ACK.`);
          consumerChannel.ack(msg);
          return;
        }

        console.error(`[ElasticsearchConsumer] Error syncing student ${aggregateId}:`, err.message);

        // Check retry count via message headers (x-death from rabbitmq or custom header)
        const deathHeader = msg.properties.headers?.['x-death'];
        const deathCount = Array.isArray(deathHeader) && deathHeader.length > 0 ? deathHeader[0].count : 0;
        const currentRetry = deathCount + 1;

        if (currentRetry <= MAX_RETRIES) {
          console.warn(`[ElasticsearchConsumer] Requeuing event ${eventId} (Attempt ${currentRetry}/${MAX_RETRIES})...`);
          consumerChannel.nack(msg, false, true);
        } else {
          console.error(`[ElasticsearchConsumer] Event ${eventId} exceeded max retries (${MAX_RETRIES}). Routing to DLQ.`);
          // Nack with requeue=false moves it into the Dead Letter Exchange (DLX)
          consumerChannel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );

  consumerTag = response.consumerTag;
}

export async function stopElasticsearchConsumer() {
  if (consumerChannel && consumerTag) {
    try {
      await consumerChannel.cancel(consumerTag);
      await consumerChannel.close();
    } catch (e) {
      // ignore
    }
    consumerChannel = null;
    consumerTag = null;
  }
  console.log('[ElasticsearchConsumer] Stopped.');
}
