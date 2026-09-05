import BasePolicy from './BasePolicy.js';

/**
 * AttendancePolicy - Xử lý kiểm tra phân quyền ABAC cho Module Điểm Danh & Chuyên Cần
 */
class AttendancePolicy extends BasePolicy {
  /**
   * Xem lịch sử điểm danh (attendance.view)
   */
  static canView(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    const { studentId } = context;

    if (role === 'student') {
      if (user.student?.id === studentId) return { allowed: true };
      return { allowed: false, reason: 'Học sinh chỉ được xem lịch sử điểm danh của chính mình' };
    }

    if (role === 'parent') {
      return this.getParentCustodyAccess(user.parent, studentId, 'general');
    }

    if (['teacher', 'guest_teacher', 'homeroom_teacher', 'student_affairs', 'vice_principal', 'principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Không có quyền truy cập dữ liệu điểm danh' };
  }

  /**
   * Ghi nhận điểm danh (attendance.mark)
   */
  static canMark(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    // Kiểm tra giáo viên thỉnh giảng hết hạn
    if (this.isGuestTeacherExpired(user.teacher)) {
      return { allowed: false, reason: 'Hợp đồng giáo viên thỉnh giảng đã hết hạn' };
    }

    // Kiểm tra giáo viên nghỉ phép dài hạn
    if (this.isTeacherOnLongLeave(user.teacher)) {
      return { allowed: false, reason: 'Tài khoản giáo viên đang trong thời gian nghỉ phép dài hạn' };
    }

    const role = (user.role || '').toLowerCase();
    if (['teacher', 'guest_teacher', 'homeroom_teacher', 'student_affairs'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ giáo viên hoặc giám thị mới được ghi nhận điểm danh' };
  }

  /**
   * Duyệt đơn nghỉ phép / Sửa trạng thái vắng có phép (attendance.edit_excused)
   */
  static canEditExcused(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['homeroom_teacher', 'student_affairs', 'vice_principal', 'principal'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ GVCN hoặc Giám thị mới có thẩm quyền duyệt đơn xin nghỉ có phép' };
  }
}

export default AttendancePolicy;
