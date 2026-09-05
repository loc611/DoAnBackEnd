import BasePolicy from './BasePolicy.js';

/**
 * StudentPolicy - Xử lý kiểm tra phân quyền ABAC cho Module Hồ Sơ Học Sinh
 * Bao gồm các ca đặc biệt: Khuyết tật/nhu cầu đặc biệt, chuyển trường, lưu ban, phụ huynh ly hôn
 */
class StudentPolicy extends BasePolicy {
  /**
   * Xem hồ sơ cơ bản (profile.view_basic)
   */
  static canViewBasic(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    const { student, studentId } = context;
    const targetStudentId = studentId || student?.id;

    // Học sinh: Xem hồ sơ của chính mình
    if (role === 'student') {
      if (user.student?.id === targetStudentId || user.id === student?.userId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Học sinh chỉ được xem hồ sơ cá nhân của mình' };
    }

    // Phụ huynh: Kiểm tra quan hệ giám hộ
    if (role === 'parent') {
      const custodyCheck = this.getParentCustodyAccess(user.parent, targetStudentId, 'general');
      return custodyCheck;
    }

    // Giáo viên & Cán bộ nhân viên nhà trường
    if (['teacher', 'guest_teacher', 'homeroom_teacher', 'department_head', 'counselor', 'academic_affairs', 'student_affairs', 'accountant', 'librarian', 'vice_principal', 'principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Không có quyền truy cập hồ sơ học sinh' };
  }

  /**
   * Xem hồ sơ bảo mật nhạy cảm (profile.view_sensitive)
   * (Thông tin khuyết tật, bệnh án, hoàn cảnh gia đình đặc biệt, tranh chấp giám hộ ly hôn)
   */
  static canViewSensitive(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    const { student, studentId } = context;
    const targetStudentId = studentId || student?.id;

    // 1. Cán bộ tham vấn tâm lý & Ban Giám Hiệu
    if (['counselor', 'principal', 'vice_principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    // 2. Giáo viên chủ nhiệm của chính học sinh đó
    if (role === 'homeroom_teacher' || role === 'teacher') {
      if (user.teacher?.homeroomClasses?.some(c => c.id === student?.classId)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Hồ sơ sức khỏe / tâm lý đặc biệt chỉ dành cho GV Chủ nhiệm và Cán bộ Tham vấn' };
    }

    // 3. Phụ huynh của chính học sinh đó (nếu quyền giám hộ hợp lệ)
    if (role === 'parent') {
      const custodyCheck = this.getParentCustodyAccess(user.parent, targetStudentId, 'general');
      return custodyCheck;
    }

    return { allowed: false, reason: 'Không có quyền tiếp cận hồ sơ bảo mật nhạy cảm của học sinh' };
  }

  /**
   * Xử lý Chuyển trường / Lưu ban / Học sinh lớp chuyên (profile.transfer_process)
   */
  static canProcessTransfer(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['academic_affairs', 'vice_principal', 'principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ Phòng Giáo Vụ hoặc Ban Giám Hiệu mới có thẩm quyền tiếp nhận/chuyển trường/xử lý lưu ban' };
  }

  /**
   * Quyết định Kỷ luật / Đình chỉ học tập (conduct.suspend_student)
   */
  static canSuspendStudent(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['principal', 'student_affairs'].includes(role)) {
      if (!context.reason || context.reason.trim().length < 5) {
        return { allowed: false, reason: 'Quyết định đình chỉ bắt buộc phải có biên bản / lý do kỷ luật rõ ràng' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ Hội đồng Kỷ luật / Hiệu trưởng mới có thẩm quyền ra quyết định đình chỉ học tập' };
  }
}

export default StudentPolicy;
