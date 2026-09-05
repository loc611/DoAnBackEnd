import PermissionService from '../services/permissionService.js';
import AuditLogService from '../services/auditLogService.js';

/**
 * Middleware kiểm tra quyền RBAC + ABAC trong Express Route
 * @param {string} permissionName - Tên quyền (vd: 'grade.input_draft', 'profile.view_sensitive')
 * @param {Function} [contextExtractor] - Hàm trích xuất ngữ cảnh từ Request (req => ({ classId: req.params.id, ... }))
 */
export const requirePermission = (permissionName, contextExtractor) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
      }

      // Trích xuất ngữ cảnh ABAC từ Request
      let context = {};
      if (typeof contextExtractor === 'function') {
        context = await contextExtractor(req);
      } else {
        context = {
          classId: req.params.classId || req.params.id || req.body?.classId || req.query?.classId,
          subjectId: req.params.subjectId || req.body?.subjectId || req.query?.subjectId,
          studentId: req.params.studentId || req.body?.studentId || req.query?.studentId,
          reason: req.body?.reason || req.query?.reason,
          body: req.body,
          params: req.params,
          query: req.query
        };
      }

      // Kiểm tra quyền
      const checkResult = await PermissionService.can(req.user, permissionName, context);

      if (!checkResult.allowed) {
        // Ghi log cảnh báo truy cập trái phép
        await AuditLogService.log({
          userId: req.user.id,
          action: 'ACCESS_DENIED',
          module: permissionName.split('.')[0] || 'general',
          resource: permissionName,
          reason: checkResult.reason,
          req,
          severity: 'warning'
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          permission: permissionName,
          message: checkResult.reason || 'Bạn không có đủ thẩm quyền để thực hiện hành động này'
        });
      }

      // Ghi log tự động cho các thao tác nhạy cảm
      if (['grade.override', 'grade.lock_publish', 'conduct.suspend_student', 'tuition.exempt_discount'].includes(permissionName)) {
        await AuditLogService.log({
          userId: req.user.id,
          action: permissionName.toUpperCase().replace('.', '_'),
          module: permissionName.split('.')[0],
          resource: permissionName,
          resourceId: context.classId || context.studentId,
          reason: context.reason || 'Thực thi nghiệp vụ đặc quyền',
          req,
          severity: 'critical'
        });
      }

      next();
    } catch (error) {
      console.error(`[requirePermission Error on ${permissionName}]:`, error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xác thực phân quyền' });
    }
  };
};

export default requirePermission;
