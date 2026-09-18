import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';
import { CORE_ROLE_PERMISSION_MATRIX } from '../utils/seedRbacScope.js';

/**
 * 2-Tier Authorization Guard (RBAC + Scope-based)
 * Tầng 1: Kiểm tra RBAC (Người dùng có quyền trên loại tài nguyên và hành động không)
 * Tầng 2: Kiểm tra Scope (Người dùng có được phân công phụ trách đúng lớp, môn, học sinh đó không)
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

      const roleNames = [
        user.role,
        ...userRoles.map(ur => ur.role?.name)
      ].filter(Boolean).map(r => r.toLowerCase());

      const isAdmin = roleNames.includes('admin') || roleNames.includes('principal') || roleNames.includes('it_admin');

      // Admin / Hiệu trưởng bỏ qua kiểm tra, có toàn quyền tối cao
      if (isAdmin) {
        return next();
      }

      // Kiểm tra trong bảng UserRole -> RolePermission
      let hasRbacPermission = userRoles.some(ur => 
        ur.role.rolePermissions.some(rp => 
          rp.permission.name === permissionCode || 
          rp.permission.name === `${resourceType}:*`
        )
      );

      // Fallback từ CORE_ROLE_PERMISSION_MATRIX nếu userRoles chưa gán đủ
      if (!hasRbacPermission) {
        hasRbacPermission = roleNames.some(roleName => {
          const matrix = CORE_ROLE_PERMISSION_MATRIX[roleName] || [];
          return matrix.includes(permissionCode) || matrix.includes(`${resourceType}:*`);
        });
      }

      if (!hasRbacPermission) {
        await AuditLogService.log({
          userId: user.id,
          action: permissionCode,
          module: resourceType,
          resource: resourceType,
          reason: `Từ chối tại Tầng 1 (RBAC): Vai trò [${roleNames.join(', ')}] không có quyền [${permissionCode}]`,
          req,
          severity: 'warning'
        });

        return res.status(403).json({ 
          success: false, 
          message: `Bạn không có quyền thực hiện hành động [${permissionCode}]` 
        });
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
          semester: req.body?.semester || req.query?.semester || 'HK1_2026',
          schoolYearId: req.body?.schoolYearId || req.query?.schoolYearId,
          reason: req.body?.reason
        };
      }

      let isScopeAllowed = false;
      let denyReason = '';

      // ------------------------------------------------------------
      // A. SCOPE CHECK CHO MODULE ĐIỂM SỐ (grade)
      // ------------------------------------------------------------
      if (resourceType === 'grade') {
        if (action === 'write') {
          // 1. Kiểm tra Cửa Sổ Nhập Điểm (Grading Window) nếu có thiết lập
          if (context.schoolYearId) {
            const gradingWindow = await prisma.gradingWindow.findFirst({
              where: {
                schoolYearId: context.schoolYearId,
                semester: context.semester
              }
            });

            if (gradingWindow && gradingWindow.status === 'locked') {
              denyReason = 'Cửa sổ nhập điểm của học kỳ này đã bị khóa. Vui lòng liên hệ Ban Giám Hiệu.';
            }
          }

          if (!denyReason) {
            // 2. Giáo viên bộ môn: Chỉ được sửa điểm môn mình dạy đúng lớp trong phân công
            let targetSubjectId = context.subjectId;
            if (targetSubjectId) {
              const subj = await prisma.subject.findFirst({
                where: {
                  OR: [
                    { id: targetSubjectId },
                    { subjectCode: { equals: targetSubjectId, mode: 'insensitive' } }
                  ]
                }
              });
              if (subj) targetSubjectId = subj.id;
            }

            const teacherAssignment = await prisma.teacherAssignment.findFirst({
              where: {
                teacher: { userId: user.id },
                classId: context.classId,
                ...(targetSubjectId ? { subjectId: targetSubjectId } : {})
              }
            });

            // Tổ trưởng bộ môn / BGH cũng có quyền ghi điểm
            const isDeptHead = roleNames.includes('department_head') || user.teacher?.position?.includes('Trưởng bộ môn');

            if (teacherAssignment || isDeptHead) {
              isScopeAllowed = true;
            } else {
              denyReason = 'Bạn không được phân công giảng dạy môn học này tại lớp được chọn';
            }
          }
        } else if (action === 'override') {
          // Quyền đặc cách sửa điểm sau khi khóa: Phải có lý do và là BGH hoặc Trưởng bộ môn
          const canOverride = roleNames.includes('department_head') || 
                              roleNames.includes('vice_principal') || 
                              roleNames.includes('principal') || 
                              roleNames.includes('admin');
          
          if (!canOverride) {
            denyReason = 'Chỉ Ban Giám Hiệu hoặc Trưởng Bộ Môn mới có quyền đặc cách mở/sửa điểm sau khi đã niêm phong';
          } else if (!context.reason || context.reason.trim().length < 5) {
            denyReason = 'Bắt buộc cung cấp lý do chính đáng (tối thiểu 5 ký tự) khi thực hiện đặc cách sửa điểm';
          } else {
            isScopeAllowed = true;
          }
        } else if (action === 'read') {
          // Học sinh: Chỉ xem điểm cá nhân
          if (roleNames.includes('student')) {
            const studentRecord = await prisma.student.findFirst({
              where: { userId: user.id, id: context.studentId }
            });
            if (studentRecord || !context.studentId) isScopeAllowed = true;
          }

          // Phụ huynh: Chỉ xem điểm của con
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
          if (roleNames.includes('homeroom_teacher') || roleNames.includes('teacher')) {
            const [homeroom, directHomeroom] = await Promise.all([
              prisma.homeroomAssignment.findFirst({
                where: {
                  teacher: { userId: user.id },
                  classId: context.classId
                }
              }),
              prisma.class.findFirst({
                where: {
                  id: context.classId,
                  homeroomTeacher: { userId: user.id }
                }
              })
            ]);
            if (homeroom || directHomeroom) isScopeAllowed = true;
          }

          // Giáo viên bộ môn: Xem điểm lớp mình dạy
          if (roleNames.includes('subject_teacher') || roleNames.includes('teacher')) {
            const assignment = await prisma.teacherAssignment.findFirst({
              where: {
                teacher: { userId: user.id },
                classId: context.classId
              }
            });
            if (assignment) isScopeAllowed = true;
          }

          if (roleNames.includes('supervisor') || roleNames.includes('office_staff') || roleNames.includes('department_head')) {
            isScopeAllowed = true;
          }
        }
      }

      // ------------------------------------------------------------
      // B. SCOPE CHECK CHO HẠNH KIỂM / RÈN LUYỆN (conduct)
      // ------------------------------------------------------------
      else if (resourceType === 'conduct') {
        if (action === 'write') {
          // Chỉ GVCN của lớp hoặc Giám thị mới được sửa hạnh kiểm
          const [homeroom, directHomeroom] = await Promise.all([
            prisma.homeroomAssignment.findFirst({
              where: {
                teacher: { userId: user.id },
                classId: context.classId
              }
            }),
            prisma.class.findFirst({
              where: {
                id: context.classId,
                homeroomTeacher: { userId: user.id }
              }
            })
          ]);
          if (homeroom || directHomeroom || roleNames.includes('supervisor')) {
            isScopeAllowed = true;
          } else {
            denyReason = 'Chỉ Giáo viên chủ nhiệm của lớp hoặc Giám thị mới có quyền đánh giá kết quả rèn luyện';
          }
        } else {
          isScopeAllowed = true;
        }
      }

      // ------------------------------------------------------------
      // C. SCOPE CHECK CHO ĐIỂM DANH (attendance)
      // ------------------------------------------------------------
      else if (resourceType === 'attendance') {
        if (action === 'write') {
          const [isTeacherOfClass, isHomeroomOfClass, directHomeroom] = await Promise.all([
            prisma.teacherAssignment.findFirst({
              where: { teacher: { userId: user.id }, classId: context.classId }
            }),
            prisma.homeroomAssignment.findFirst({
              where: { teacher: { userId: user.id }, classId: context.classId }
            }),
            prisma.class.findFirst({
              where: { id: context.classId, homeroomTeacher: { userId: user.id } }
            })
          ]);

          if (isTeacherOfClass || isHomeroomOfClass || directHomeroom || roleNames.includes('supervisor')) {
            isScopeAllowed = true;
          } else {
            denyReason = 'Bạn không có quyền điểm danh lớp học này';
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
            else denyReason = 'Học sinh chỉ được xem hồ sơ của chính mình';
          } else if (roleNames.includes('parent')) {
            const isChild = await prisma.guardianLink.findFirst({
              where: { parent: { userId: user.id }, studentId: context.studentId, custodyType: { not: 'none' } }
            });
            if (isChild) isScopeAllowed = true;
            else denyReason = 'Phụ huynh chỉ được xem hồ sơ học sinh thuộc diện giám hộ hợp pháp';
          } else {
            isScopeAllowed = true;
          }
        } else {
          isScopeAllowed = true;
        }
      }

      // ------------------------------------------------------------
      // E. SCOPE CHECK CHO XUẤT DỮ LIỆU HÀNG LOẠT (export:batch)
      // ------------------------------------------------------------
      else if (resourceType === 'export' && action === 'batch') {
        if (roleNames.includes('admin') || roleNames.includes('office_staff') || roleNames.includes('principal')) {
          isScopeAllowed = true;
        } else {
          denyReason = 'Quyền xuất dữ liệu hàng loạt toàn trường chỉ dành cho Ban Giám Hiệu và Văn Phòng';
        }
      }

      // Fallback
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
          reason: denyReason || 'Từ chối tại Tầng 2 (Scope Guard): Không tìm thấy phân công dữ liệu hợp lệ',
          req,
          severity: 'warning'
        });

        return res.status(403).json({ 
          success: false, 
          message: denyReason || 'Bạn không có quyền thao tác trên dữ liệu này' 
        });
      }

      // Ghi Audit Log cho các thao tác nhạy cảm
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
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi kiểm tra phân quyền Scope Guard' });
    }
  };
};

export default checkPermission;
