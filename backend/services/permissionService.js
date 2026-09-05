import prisma from '../prismaClient.js';
import GradePolicy from '../policies/GradePolicy.js';
import StudentPolicy from '../policies/StudentPolicy.js';
import TuitionPolicy from '../policies/TuitionPolicy.js';
import AttendancePolicy from '../policies/AttendancePolicy.js';
import BasePolicy from '../policies/BasePolicy.js';

/**
 * PermissionService - Trái tim của hệ thống phân quyền lai RBAC + ABAC
 * Hỗ trợ cú pháp kiểm tra trực quan: user.can('grade.input_draft', { classId: '...', subjectId: '...' })
 */
class PermissionService {
  /**
   * Kiểm tra quyền của người dùng đối với một hành động cụ thể trong ngữ cảnh ABAC
   * @param {Object} user - User object (bao gồm profile & roles)
   * @param {string} permissionName - Tên quyền (vd: 'grade.input_draft', 'profile.view_sensitive')
   * @param {Object} context - Ngữ cảnh ABAC (classId, subjectId, student, reason, ...)
   * @returns {Promise<{ allowed: boolean, reason?: string }>}
   */
  static async can(user, permissionName, context = {}) {
    if (!user) {
      return { allowed: false, reason: 'Người dùng chưa xác thực (Unauthenticated)' };
    }

    // 1. Kiểm tra trạng thái tài khoản
    const status = (user.status || '').toLowerCase();
    if (status === 'blocked' || status === 'inactive') {
      return { allowed: false, reason: 'Tài khoản đã bị khóa' };
    }
    if (status === 'suspended') {
      return { allowed: false, reason: 'Tài khoản đang bị tạm đình chỉ hoạt động' };
    }

    // 2. SuperUser bypass (IT Admin / Hiệu trưởng)
    if (BasePolicy.isSuperUser(user)) {
      return { allowed: true };
    }

    // 3. Lấy cấu hình hệ thống nếu cần (vd: kiểm tra khóa điểm toàn trường)
    let systemSettings = {};
    if (permissionName.startsWith('grade.')) {
      try {
        const settingRecord = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
        if (settingRecord) systemSettings = settingRecord;
      } catch (err) {
        // Fallback default
      }
    }

    // 4. Phân phối kiểm tra theo từng Domain Policy (ABAC Rules)
    const [module, action] = permissionName.split('.');

    switch (module) {
      case 'grade':
        if (action === 'view') return GradePolicy.canView(user, context);
        if (action === 'input_draft') return GradePolicy.canInputDraft(user, context, systemSettings);
        if (action === 'lock_publish') return GradePolicy.canLockPublish(user, context);
        if (action === 'unlock') return GradePolicy.canUnlock(user, context);
        if (action === 'override') return GradePolicy.canOverride(user, context);
        break;

      case 'profile':
        if (action === 'view_basic') return StudentPolicy.canViewBasic(user, context);
        if (action === 'view_sensitive') return StudentPolicy.canViewSensitive(user, context);
        if (action === 'transfer_process') return StudentPolicy.canProcessTransfer(user, context);
        break;

      case 'conduct':
        if (action === 'suspend_student') return StudentPolicy.canSuspendStudent(user, context);
        break;

      case 'tuition':
        if (action === 'view') return TuitionPolicy.canView(user, context);
        if (action === 'create_fee' || action === 'collect_payment') return TuitionPolicy.canManageFees(user);
        if (action === 'exempt_discount') return TuitionPolicy.canExemptDiscount(user, context);
        break;

      case 'attendance':
        if (action === 'view') return AttendancePolicy.canView(user, context);
        if (action === 'mark') return AttendancePolicy.canMark(user, context);
        if (action === 'edit_excused') return AttendancePolicy.canEditExcused(user, context);
        break;

      default:
        break;
    }

    // 5. Kiểm tra RolePermission trong Database nếu không thuộc logic ABAC đặc thù
    try {
      const userRole = (user.role || '').toLowerCase();
      const rolePerm = await prisma.rolePermission.findFirst({
        where: {
          role: { name: userRole },
          permission: { name: permissionName }
        }
      });

      if (rolePerm) {
        return { allowed: true };
      }
    } catch (err) {
      console.warn('Fallback RBAC DB check error:', err.message);
    }

    return { allowed: false, reason: `Bạn không có quyền thực hiện thao tác [${permissionName}]` };
  }

  /**
   * Helper gắn method can() trực tiếp vào User Object
   */
  static attachUserCan(user) {
    if (!user) return user;
    user.can = (permissionName, context = {}) => {
      return PermissionService.can(user, permissionName, context);
    };
    return user;
  }
}

export default PermissionService;
