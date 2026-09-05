import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import AuditLogService from '../services/auditLogService.js';

const router = express.Router();

/**
 * @route   GET /api/audit-logs
 * @desc    Truy vấn lịch sử ghi vết kiểm toán (Audit Logs)
 * @access  Private (it_admin, principal, vice_principal)
 */
router.get('/', protect, authorize('admin', 'it_admin', 'principal', 'vice_principal'), async (req, res) => {
  try {
    const { module, action, userId, fromDate, toDate, page, limit } = req.query;
    const result = await AuditLogService.getLogs({
      module,
      action,
      userId,
      fromDate,
      toDate,
      page,
      limit
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({ success: false, message: 'Không thể truy xuất lịch sử kiểm toán' });
  }
});

export default router;
