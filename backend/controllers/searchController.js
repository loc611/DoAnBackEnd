import { esClient, ELASTICSEARCH_CONFIG } from '../services/elasticsearchClient.js';

/**
 * Controller for full-text search across students via Elasticsearch
 * GET /api/search/students
 */
export const searchStudents = async (req, res) => {
  try {
    const { q, classId, status, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const from = (pageNum - 1) * pageSize;

    const mustClauses = [];
    const filterClauses = [];

    // Full-text query on query string 'q'
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

    // Exact match filters
    if (classId) {
      filterClauses.push({ term: { classId } });
    }

    if (status) {
      filterClauses.push({ term: { status } });
    }

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
      tookMs: response.took,
      pagination: {
        total: totalHits,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(totalHits / pageSize)
      },
      data: items
    });
  } catch (error) {
    console.error('[SearchController] Elasticsearch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm dữ liệu qua Elasticsearch',
      error: error.message
    });
  }
};
