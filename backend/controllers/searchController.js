import { esClient, ELASTICSEARCH_CONFIG } from '../services/elasticsearchClient.js';
import prisma from '../prismaClient.js';
import net from 'net';

// ============================================================================
// ⚡ ULTRA-FAST CIRCUIT BREAKER FOR SEARCH
// Tránh việc mỗi request tìm kiếm phải chờ nhiều giây TCP timeout khi Elasticsearch
// không khởi chạy. Sử dụng socket probe với timeout 80ms và cache trạng thái 5 phút.
// ============================================================================
let isElasticsearchAlive = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 300000; // Cache trạng thái 5 phút

function pingPort(host = '127.0.0.1', port = 9200, timeout = 80) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function isElasticsearchReady() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
    return isElasticsearchAlive;
  }
  lastHealthCheck = now;
  try {
    const reachable = await pingPort('127.0.0.1', 9200, 80);
    if (!reachable) {
      isElasticsearchAlive = false;
      return false;
    }
    await esClient.ping({ requestTimeout: 300 });
    isElasticsearchAlive = true;
  } catch {
    isElasticsearchAlive = false;
  }
  return isElasticsearchAlive;
}

/**
 * Controller for full-text search across students
 * GET /api/search/students
 */
export const searchStudents = async (req, res) => {
  const { q, classId, status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const from = (pageNum - 1) * pageSize;

  const esAvailable = await isElasticsearchReady();

  if (esAvailable) {
    try {
      const mustClauses = [];
      const filterClauses = [];

      if (q && q.trim()) {
        const queryText = q.trim();
        mustClauses.push({
          multi_match: {
            query: queryText,
            fields: [
              'studentCode^3',
              'fullName^2',
              'moetStudentCode^2',
              'phone^2',
              'parentPhone',
              'parentName',
              'className',
              'email'
            ],
            fuzziness: 'AUTO',
            operator: 'and'
          }
        });
      } else {
        mustClauses.push({ match_all: {} });
      }

      if (classId) filterClauses.push({ term: { classId } });
      if (status) filterClauses.push({ term: { status } });

      const response = await esClient.search({
        index: ELASTICSEARCH_CONFIG.STUDENT_INDEX,
        from,
        size: pageSize,
        body: {
          query: {
            bool: {
              must: mustClauses,
              filter: filterClauses
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { updatedAt: { order: 'desc' } }
          ]
        }
      });

      const hits = response.hits?.hits || [];
      const totalHits = typeof response.hits?.total === 'object'
        ? response.hits.total.value
        : (response.hits?.total || 0);

      const items = hits.map((hit) => ({
        ...hit._source,
        _score: hit._score,
        _version: hit._version
      }));

      return res.json({
        success: true,
        provider: 'elasticsearch',
        tookMs: response.took,
        pagination: {
          total: totalHits,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(totalHits / pageSize)
        },
        data: items
      });
    } catch (esError) {
      isElasticsearchAlive = false;
      console.warn('[SearchController] Elasticsearch error, switching to PostgreSQL fallback:', esError.message);
    }
  }

  // ==========================================================================
  // 🚀 TỐI ƯU HÓA TRUY VẤN POSTGRESQL (FAST PRISMA SEARCH)
  // ==========================================================================
  try {
    const queryText = (q || '').trim();
    const where = {
      ...(queryText ? {
        OR: [
          { fullName: { contains: queryText, mode: 'insensitive' } },
          { studentCode: { contains: queryText, mode: 'insensitive' } },
          { moetStudentCode: { contains: queryText, mode: 'insensitive' } },
          { phone: { contains: queryText } }
        ]
      } : {}),
      ...(classId ? { classId } : {}),
      ...(status ? { status } : {})
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          studentCode: true,
          fullName: true,
          gender: true,
          status: true,
          class: { select: { id: true, className: true, grade: true } }
        },
        skip: from,
        take: pageSize,
        orderBy: { fullName: 'asc' }
      }),
      prisma.student.count({ where })
    ]);

    return res.json({
      success: true,
      provider: 'postgresql_prisma',
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      data: students.map(s => ({
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        className: s.class?.className || 'Chưa xếp lớp',
        grade: s.class?.grade,
        status: s.status
      }))
    });
  } catch (dbError) {
    console.error('[SearchController] Database query error:', dbError);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm dữ liệu: ' + dbError.message
    });
  }
};
