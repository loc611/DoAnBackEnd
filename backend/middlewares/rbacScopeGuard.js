import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';

/**
 * 2-Tier Authorization Guard (RBAC + Scope-based)
 * @param {string} action - Hành động ('read', 'write', 'delete', 'override', 'batch')
 * @param {string} resourceType - Loại tài nguyên ('grade', 'attendance', 'conduct', 'student_profile', 'export', 'tuition', 'schedule')
 * @param {Function} [resourceExtractor] - Hàm trích xuất context cụ thể (classId, subjectId, studentId, schoolYearId, semester)
 */
export const checkPermission = (action, resourceType, resourceExtractor) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập' });
      }

      const user = req.user;
      const permissionCode = `${resourceType}:${action}`;

      // ============================================================
      // 🌟 TẦNG 1: ROLE-BASED ACCESS CONTROL (RBAC)
      // ============================================================
      // Lấy tất cả các Roles đang kích hoạt của User (Hỗ trợ Multi-Role nhiều-nhiều)
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      // Kiểm tra xem có bất kỳ Role nào sở hữu Permission `resourceType:action` không
      const hasRbacPermission = userRoles.some(ur => 
        ur.role.rolePermissions.some(rp => 
          rp.permission.name === permissionCode || 
          rp.permission.name === `${resourceType}:*` ||
          ur.role.name === 'admin'
        )
      );

      if (!hasRbacPermission) {
        // Ghi log cảnh báo truy cập trái phép
        await AuditLogService.log({
          userId: user.id,
          action: permissionCode,
          module: resourceType,
          resource: resourceType,
          reason: 'Từ chối tại Tầng 1 (RBAC): User không có vai trò chứa quyền này',
          req,
          severity: 'warning'
        });

        // Trả về 403 mà không làm lộ thông tin tài nguyên có tồn tại hay không
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này' });
      }

      const roleNames = userRoles.map(ur => ur.role.name);
      const isAdmin = roleNames.includes('admin') || (user.role && user.role.toLowerCase() === 'admin');

      // Admin bỏ qua tầng Scope Check (BGH tối cao)
      if (isAdmin) {
        return next();
      }

      // ============================================================
      // 🌟 TẦNG 2: SCOPE-BASED ACCESS CONTROL (QUAN HỆ DỮ LIỆU THỰC TẾ)
      // ============================================================
      let context = {};
      if (typeof resourceExtractor === 'function') {
        context = await resourceExtractor(req);
      } else {
        context = {
          classId: req.params.classId || req.params.id || req.body?.classId || req.query?.classId,
          subjectId: req.params.subjectId || req.body?.subjectId || req.query?.subjectId,
          studentId: req.params.studentId || req.body?.studentId || req.query?.studentId,
          semester: req.body?.semester || req.query?.semester || 'HK1',
          schoolYearId: req.body?.schoolYearId || req.query?.schoolYearId,
          reason: req.body?.reason
        };
      }

      // Lấy niên khóa hiện tại nếu không truyền lên
      if (!context.schoolYearId) {
        const currentYear = await prisma.schoolYear.findFirst({ where: { isCurrent: true } });
        if (currentYear) context.schoolYearId = currentYear.id;
      }

      let isScopeAllowed = false;
      let denyReason = '';

      // ------------------------------------------------------------
      // A. SCOPE CHECK CHO MODULE ĐIỂM SỐ (grade)
      // ------------------------------------------------------------
      if (resourceType === 'grade') {
        if (action === 'write') {
          // 1. Kiểm tra Cửa Sổ Nhập Điểm (Grading Window)
          if (context.schoolYearId) {
            const gradingWindow = await prisma.gradingWindow.findFirst({
              where: {
                schoolYearId: context.schoolYearId,
                semester: context.semester
              }
            });

            if (gradingWindow && gradingWindow.status === 'locked') {
              denyReason = 'Cửa sổ nhập điểm của học kỳ này đã bị khóa. Vui lòng liên hệ Ban Giám Hiệu để xin mở khóa';
              isScopeAllowed = false;
            } else {
              // 2. Giáo viên bộ môn: Chỉ được sửa điểm môn mình dạy đúng lớp trong phân công
              const teacherAssignment = await prisma.teacherAssignment.findFirst({
                where: {
                  teacher: { userId: user.id },
                  classId: context.classId,
                  subjectId: context.subjectId,
                  schoolYearId: context.schoolYearId
                }
              });

              if (teacherAssignment) {
                isScopeAllowed = true;
              } else {
                denyReason = 'Giáo viên không được phân công giảng dạy môn học này tại lớp được chọn';
              }
            }
          }
        } else if (action === 'read') {
          // Học sinh: Xem điểm chính mình
          if (roleNames.includes('student')) {
            const studentRecord = await prisma.student.findFirst({
              where: { userId: user.id, id: context.studentId }
            });
            if (studentRecord) isScopeAllowed = true;
          }

          // Phụ huynh: Xem điểm con mình (qua guardian_links)
          if (roleNames.includes('parent')) {
            const guardianLink = await prisma.guardianLink.findFirst({
              where: {
                parent: { userId: user.id },
                studentId: context.studentId,
                accessGrades: true,
                custodyType: { not: 'none' }
              }
            });
            if (guardianLink) isScopeAllowed = true;
          }

          // GVCN: Xem toàn bộ điểm các môn của lớp chủ nhiệm
          if (roleNames.includes('homeroom_teacher')) {
            const homeroom = await prisma.homeroomAssignment.findFirst({
              where: {
                teacher: { userId: user.id },
                classId: context.classId,
                schoolYearId: context.schoolYearId
              }
            });
            if (homeroom) isScopeAllowed = true;
          }

          // Giáo viên bộ môn: Xem điểm lớp mình dạy
          if (roleNames.includes('subject_teacher')) {
            const assignment = await prisma.teacherAssignment.findFirst({
              where: {
                teacher: { userId: user.id },
                classId: context.classId,
                subjectId: context.subjectId
              }
            });
            if (assignment) isScopeAllowed = true;
          }

          // Giám thị / Văn phòng: Xem toàn trường
          if (roleNames.includes('supervisor') || roleNames.includes('office_staff')) {
            isScopeAllowed = true;
          }
        }
      }

      // ------------------------------------------------------------
      // B. SCOPE CHECK CHO HẠNH KIỂM (conduct)
      // ------------------------------------------------------------
      else if (resourceType === 'conduct') {
        if (action === 'write') {
          // Chỉ GVCN của lớp đó hoặc Giám thị mới có quyền sửa điểm hạnh kiểm
          if (roleNames.includes('homeroom_teacher')) {
            const homeroom = await prisma.homeroomAssignment.findFirst({
              where: {
                teacher: { userId: user.id },
                classId: context.classId,
                schoolYearId: context.schoolYearId
              }
            });
            if (homeroom) isScopeAllowed = true;
          }

          if (roleNames.includes('supervisor')) {
            isScopeAllowed = true;
          }
        } else if (action === 'read') {
          isScopeAllowed = true;
        }
      }

      // ------------------------------------------------------------
      // C. SCOPE CHECK CHO ĐIỂM DANH (attendance)
      // ------------------------------------------------------------
      else if (resourceType === 'attendance') {
        if (action === 'write') {
          // GV dạy lớp, GVCN lớp, hoặc Giám thị
          const isTeacherOfClass = await prisma.teacherAssignment.findFirst({
            where: { teacher: { userId: user.id }, classId: context.classId }
          });
          const isHomeroomOfClass = await prisma.homeroomAssignment.findFirst({
            where: { teacher: { userId: user.id }, classId: context.classId }
          });

          if (isTeacherOfClass || isHomeroomOfClass || roleNames.includes('supervisor')) {
            isScopeAllowed = true;
          }
        } else {
          isScopeAllowed = true;
        }
      }

      // ------------------------------------------------------------
      // D. SCOPE CHECK CHO HỒ SƠ HỌC SINH (student_profile)
      // ------------------------------------------------------------
      else if (resourceType === 'student_profile') {
        if (action === 'read') {
          if (roleNames.includes('student')) {
            const isOwn = await prisma.student.findFirst({ where: { userId: user.id, id: context.studentId } });
            if (isOwn) isScopeAllowed = true;
          } else if (roleNames.includes('parent')) {
            const isChild = await prisma.guardianLink.findFirst({
              where: { parent: { userId: user.id }, studentId: context.studentId, custodyType: { not: 'none' } }
            });
            if (isChild) isScopeAllowed = true;
          } else {
            isScopeAllowed = true;
          }
        }
      }

      // ------------------------------------------------------------
      // E. SCOPE CHECK CHO XUẤT DỮ LIỆU HÀNG LOẠT (export:batch)
      // ------------------------------------------------------------
      else if (resourceType === 'export' && action === 'batch') {
        if (roleNames.includes('admin') || roleNames.includes('office_staff')) {
          isScopeAllowed = true;
        } else {
          denyReason = 'Quyền xuất dữ liệu hàng loạt toàn trường chỉ dành cho Quản trị viên và Bộ phận Văn phòng';
        }
      }

      // Fallback cho các module khác nếu đã pass RBAC
      else {
        isScopeAllowed = true;
      }

      // ============================================================
      // 🌟 KẾT LUẬN & GHI AUDIT LOG
      // ============================================================
      if (!isScopeAllowed) {
        await AuditLogService.log({
          userId: user.id,
          action: permissionCode,
          module: resourceType,
          resource: resourceType,
          resourceId: context.classId || context.studentId,
          reason: denyReason || 'Từ chối tại Tầng 2 (Scope Check): Không tìm thấy quan hệ dữ liệu hợp lệ trong niên khóa',
          req,
          severity: 'warning'
        });

        return res.status(403).json({ success: false, message: denyReason || 'Bạn không có quyền thao tác trên dữ liệu này' });
      }

      // Nếu là thao tác Write / Delete / Override / Batch -> Tự động ghi Audit Log
      if (['write', 'delete', 'override', 'batch'].includes(action)) {
        await AuditLogService.log({
          userId: user.id,
          action: permissionCode,
          module: resourceType,
          resource: resourceType,
          resourceId: context.classId || context.studentId,
          oldValue: context.oldValue,
          newValue: context.newValue || req.body,
          reason: context.reason || `Thực thi thao tác ${action} trên ${resourceType}`,
          req,
          severity: action === 'override' || action === 'batch' ? 'critical' : 'info'
        });
      }

      next();
    } catch (error) {
      console.error('[checkPermission Error]:', error);
      return res.status(500).json({ success: false, message: 'Lỗi kiểm tra phân quyền hệ thống' });
    }
  };
};

export default checkPermission;
