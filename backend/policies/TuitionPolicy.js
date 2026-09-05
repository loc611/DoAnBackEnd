import BasePolicy from './BasePolicy.js';

/**
 * TuitionPolicy - Xử lý kiểm tra phân quyền ABAC cho Module Học Phí
 */
class TuitionPolicy extends BasePolicy {
  /**
   * Xem học phí & biên lai (tuition.view)
   */
  static canView(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    const { studentId } = context;

    if (role === 'student') {
      if (user.student?.id === studentId) return { allowed: true };
      return { allowed: false, reason: 'Học sinh chỉ được xem thông tin học phí của chính mình' };
    }

    if (role === 'parent') {
      return this.getParentCustodyAccess(user.parent, studentId, 'financial');
    }

    if (['accountant', 'homeroom_teacher', 'principal', 'vice_principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Không có quyền truy cập dữ liệu học phí' };
  }

  /**
   * Tạo đợt thu học phí & Ghi nhận thanh toán (tuition.create_fee / tuition.collect_payment)
   */
  static canManageFees(user) {
    if (this.isSuperUser(user)) return { allowed: true };
    const role = (user.role || '').toLowerCase();
    if (['accountant', 'principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Chỉ Kế toán hoặc Hiệu trưởng mới có quyền thiết lập và thu học phí' };
  }

  /**
   * Phê duyệt miễn giảm học phí cho học sinh có hoàn cảnh đặc biệt (tuition.exempt_discount)
   */
  static canExemptDiscount(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };
    const role = (user.role || '').toLowerCase();
    if (role === 'principal' || role === 'vice_principal') {
      if (!context.reason || context.reason.trim().length < 5) {
        return { allowed: false, reason: 'Phê duyệt miễn giảm bắt buộc phải có lý do / hồ sơ chính sách chứng minh' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: 'Chỉ Ban Giám Hiệu mới có thẩm quyền phê duyệt chính sách miễn giảm học phí' };
  }
}

export default TuitionPolicy;
