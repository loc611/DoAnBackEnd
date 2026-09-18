import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const ELASTICSEARCH_CONFIG = {
  NODE: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  STUDENT_INDEX: process.env.ELASTICSEARCH_STUDENT_INDEX || 'students_v1'
};

export const esClient = new Client({
  node: ELASTICSEARCH_CONFIG.NODE,
  maxRetries: 3,
  requestTimeout: 10000
});

export async function initStudentIndex() {
  const index = ELASTICSEARCH_CONFIG.STUDENT_INDEX;
  try {
    const exists = await esClient.indices.exists({ index });
    if (!exists) {
      console.log(`[Elasticsearch] Index "${index}" not found. Creating index with schema mappings...`);
      await esClient.indices.create({
        index,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                vietnamese_analyzer: {
                  type: 'standard'
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              studentCode: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              fullName: {
                type: 'text',
                analyzer: 'vietnamese_analyzer',
                fields: { keyword: { type: 'keyword' } }
              },
              moetStudentCode: { type: 'keyword' },
              email: { type: 'keyword' },
              phone: { type: 'keyword' },
              parentPhone: { type: 'keyword' },
              parentName: {
                type: 'text',
                analyzer: 'vietnamese_analyzer',
                fields: { keyword: { type: 'keyword' } }
              },
              address: { type: 'text' },
              status: { type: 'keyword' },
              classId: { type: 'keyword' },
              className: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              gender: { type: 'keyword' },
              dateOfBirth: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index "${index}" created successfully.`);
    } else {
      console.log(`[Elasticsearch] Index "${index}" already exists.`);
    }
  } catch (err) {
    console.error(`[Elasticsearch] Failed to initialize index "${index}":`, err.message);
    throw err;
  }
}
