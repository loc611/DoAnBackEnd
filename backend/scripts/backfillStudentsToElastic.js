import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prismaClient.js';
import { esClient, ELASTICSEARCH_CONFIG, initStudentIndex } from '../services/elasticsearchClient.js';
import { formatStudentPayload } from '../services/outboxService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

console.log('====================================================');
console.log('  📦 Initial Backfill: PostgreSQL Students -> ES   ');
console.log('====================================================');

const BATCH_SIZE = 200;

async function backfill() {
  const startTime = Date.now();
  try {
    await initStudentIndex();

    const totalStudents = await prisma.student.count();
    console.log(`[Backfill] Total students found in PostgreSQL: ${totalStudents}`);

    if (totalStudents === 0) {
      console.log('[Backfill] No student records found to sync.');
      process.exit(0);
    }

    let skip = 0;
    let processedCount = 0;

    while (skip < totalStudents) {
      const students = await prisma.student.findMany({
        skip,
        take: BATCH_SIZE,
        include: {
          class: {
            select: { className: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (students.length === 0) break;

      const operations = students.flatMap((student) => {
        const payload = formatStudentPayload(student);
        return [
          {
            index: {
              _index: ELASTICSEARCH_CONFIG.STUDENT_INDEX,
              _id: student.id,
              version: student.version || 1,
              version_type: 'external'
            }
          },
          payload
        ];
      });

      const bulkResponse = await esClient.bulk({ refresh: true, operations });

      if (bulkResponse.errors) {
        const erroredDocuments = bulkResponse.items.filter((item) => item.index && item.index.error);
        console.warn(`[Backfill] Warning: ${erroredDocuments.length} items encountered errors in batch:`, erroredDocuments[0].index.error);
      }

      processedCount += students.length;
      skip += BATCH_SIZE;
      const percent = ((processedCount / totalStudents) * 100).toFixed(1);
      console.log(`[Backfill] Progress: ${processedCount}/${totalStudents} (${percent}%) indexed.`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Backfill completed successfully! Indexed ${processedCount} students in ${duration}s.`);
  } catch (err) {
    console.error('❌ Backfill failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

backfill();
