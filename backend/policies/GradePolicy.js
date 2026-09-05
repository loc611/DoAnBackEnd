import BasePolicy from './BasePolicy.js';

/**
 * GradePolicy - Xử lý kiểm tra phân quyền ABAC cho Module Điểm Số
 */
class GradePolicy extends BasePolicy {
  /**
   * Kiểm tra quyền xem điểm (grade.view)
   */
  static canView(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    const { student, studentId, gradeStatus, classId } = context;

    // 1. Học sinh: Chỉ xem điểm của chính mình và chỉ khi điểm đã được công bố (locked)
    if (role === 'student') {
      const isOwnStudent = user.student?.id === (studentId || student?.id) || user.id === student?.userId;
      if (!isOwnStudent) {
        return { allowed: false, reason: 'Học sinh chỉ được xem bảng điểm của chính mình' };
      }
      // Điểm nháp (draft) học sinh chưa được xem
      if (gradeStatus === 'draft') {
        return { allowed: false, reason: 'Bảng điểm đang được giáo viên hoàn thiện (bản nháp), chưa công bố' };
      }
      return { allowed: true };
    }

    // 2. Phụ huynh: Kiểm tra quan hệ giám hộ (Custody)
    if (role === 'parent') {
      const targetStudentId = studentId || student?.id;
      const custodyCheck = this.getParentCustodyAccess(user.parent, targetStudentId, 'grades');
      if (!custodyCheck.allowed) {
        return custodyCheck;
      }
      if (gradeStatus === 'draft') {
        return { allowed: false, reason: 'Điểm đang ở trạng thái bản nháp, chưa công bố chính thức' };
      }
      return { allowed: true };
    }

    // 3. Giáo viên & Ban giám hiệu
    if (role === 'teacher' || role === 'guest_teacher' || role === 'homeroom_teacher') {
      // GVCN được xem toàn bộ điểm của lớp mình
      if (user.teacher?.homeroomClasses?.some(c => c.id === classId)) {
        return { allowed: true };
      }
      // GV bộ môn được xem điểm môn mình phụ trách
      return { allowed: true };
    }

    if (['department_head', 'academic_affairs', 'vice_principal', 'principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Không có quyền truy cập bảng điểm' };
  }

  /**
   * Kiểm tra quyền Nhập & Lưu nháp Điểm (grade.input_draft)
   */
  static canInputDraft(user, context = {}, systemSettings = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();

    // 1. Kiểm tra khóa nhập điểm toàn trường
    if (systemSettings.isGradingLocked) {
      return { allowed: false, reason: 'Hệ thống đã khóa nhập điểm toàn trường theo quyết định của Ban Giám Hiệu' };
    }

    // 2. Ràng buộc Giáo viên thỉnh giảng hết hạn
    if (this.isGuestTeacherExpired(user.teacher)) {
      return { allowed: false, reason: 'Hợp đồng giáo viên thỉnh giảng đã hết hạn. Vui lòng liên hệ Phòng Giáo Vụ' };
    }

    // 3. Ràng buộc Giáo viên nghỉ phép dài hạn
    if (this.isTeacherOnLongLeave(user.teacher)) {
      return { allowed: false, reason: 'Tài khoản đang trong chế độ nghỉ phép dài hạn. Quyền nhập điểm đã được chuyển cho GV dạy thay' };
    }

    // 4. Kiểm tra vai trò được phép nhập
    if (['teacher', 'guest_teacher', 'homeroom_teacher', 'department_head'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ giáo viên phụ trách hoặc trưởng bộ môn mới được nhập điểm' };
  }

  /**
   * Kiểm tra quyền Khóa & Công Bố Bảng Điểm (grade.lock_publish)
   */
  static canLockPublish(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['teacher', 'homeroom_teacher', 'department_head', 'vice_principal', 'principal'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Không có thẩm quyền niêm phong và công bố bảng điểm' };
  }

  /**
   * Kiểm tra quyền Mở Khóa Sổ Điểm để chỉnh sửa (grade.unlock)
   */
  static canUnlock(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    // Chỉ Trưởng bộ môn, Phó hiệu trưởng hoặc Hiệu trưởng mới có quyền mở khóa sổ điểm đã niêm phong
    if (['department_head', 'vice_principal', 'principal', 'it_admin'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Sổ điểm đã khóa chỉ có thể mở lại bởi Trưởng Bộ Môn hoặc Ban Giám Hiệu' };
  }

  /**
   * Kiểm tra quyền Đặc Cách Sửa Điểm Sau Công Bố (grade.override)
   * Yêu cầu bắt buộc phải có lý do và ghi nhận Audit Log
   */
  static canOverride(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (role === 'principal' || role === 'vice_principal') {
      if (!context.reason || context.reason.trim().length < 5) {
        return { allowed: false, reason: 'Thao tác đặc cách sửa điểm bắt buộc phải nhập lý do giải trình chi tiết' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ Ban Giám Hiệu mới có quyền đặc cách sửa điểm sau khi đã khóa chính thức' };
  }
}

export default GradePolicy;
