import prisma from '../prismaClient.js';

/**
 * Service ghi log kiểm toán bảo mật (Audit Logging)
 * Theo dõi mọi thao tác thay đổi dữ liệu nhạy cảm: Sửa điểm, kỷ luật, xem hồ sơ bệnh án/khuyết tật, phân quyền.
 */
class AuditLogService {
  /**
   * Ghi log thao tác
   * @param {Object} params
   * @param {string} [params.userId] - ID của người thực hiện
   * @param {string} params.action - Tên hành động (vd: 'GRADE_EDIT', 'SUSPEND_STUDENT', 'VIEW_SENSITIVE_PROFILE')
   * @param {string} params.module - Tên phân hệ ('grade', 'attendance', 'conduct', 'profile', 'tuition', 'auth')
   * @param {string} params.resource - Loại tài nguyên ('Grade', 'Student', 'FeeBill', 'Attendance', 'Role')
   * @param {string} [params.resourceId] - ID của bản ghi bị tác động
   * @param {any} [params.oldData] - Dữ liệu trước khi sửa
   * @param {any} [params.newData] - Dữ liệu sau khi sửa
   * @param {string} [params.reason] - Lý do thao tác (bắt buộc với sửa điểm sau công bố hoặc kỷ luật)
   * @param {Object} [params.req] - Express request object để lấy IP & UserAgent
   * @param {string} [params.severity='info'] - 'info' | 'warning' | 'critical'
   */
  static async log({
    userId,
    action,
    module,
    resource,
    resourceType,
    resourceId,
    oldData,
    newData,
    oldValue,
    newValue,
    reason,
    req,
    severity = 'info'
  }) {
    try {
      let ipAddress = null;
      let userAgent = null;

      if (req) {
        ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
        userAgent = req.headers['user-agent'] || null;
        if (!userId && req.user?.id) {
          userId = req.user.id;
        }
      }

      const finalResourceType = resourceType || resource || module || 'general';
      const finalOldValue = oldValue !== undefined ? oldValue : oldData;
      const finalNewValue = newValue !== undefined ? newValue : newData;

      const logEntry = await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: action || 'UNKNOWN_ACTION',
          resourceType: finalResourceType,
          resourceId: resourceId ? String(resourceId) : null,
          oldValue: finalOldValue !== undefined && finalOldValue !== null ? JSON.parse(JSON.stringify(finalOldValue)) : undefined,
          newValue: finalNewValue !== undefined && finalNewValue !== null ? JSON.parse(JSON.stringify(finalNewValue)) : undefined,
          reason: reason || null,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
          userAgent: typeof userAgent === 'string' ? userAgent : null,
          severity
        }
      });

      return logEntry;
    } catch (error) {
      // Đảm bảo không làm sập luồng chính nếu ghi log thất bại
      console.error('⚠️ [AuditLogService Error]: Failed to write audit log:', error.message);
      return null;
    }
  }

  /**
   * Truy vấn danh sách Audit Log (Dành cho IT Admin / Ban Giám Hiệu)
   */
  static async getLogs({ module, resourceType, action, userId, fromDate, toDate, page = 1, limit = 50 }) {
    const where = {};
    const type = resourceType || module;
    if (type) where.resourceType = type;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      })
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: logs
    };
  }
}

export default AuditLogService;
