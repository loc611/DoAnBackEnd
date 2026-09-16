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

    // 4. Nếu sổ điểm đang ở trạng thái KHÓA (locked), chỉ cho phép nhập nếu có Cửa sổ mở khóa tạm thời (TTL) còn hiệu lực
    if (context.isClassLocked && !context.hasActiveUnlock) {
      return { 
        allowed: false, 
        reason: 'Sổ điểm lớp đã bị khóa và niêm phong. Giáo viên vui lòng gửi Yêu cầu mở khóa tới Ban Giám Hiệu nếu cần sửa điểm.' 
      };
    }

    // 5. Kiểm tra vai trò được phép nhập
    if (['teacher', 'guest_teacher', 'homeroom_teacher', 'department_head', 'admin', 'principal', 'vice_principal'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ giáo viên phụ trách hoặc trưởng bộ môn mới được nhập điểm' };
  }

  /**
   * Kiểm tra quyền Khóa & Công Bố Bảng Điểm (grade.lock_publish)
   * Theo Thông tư 22/2021/TT-BGDĐT: Thẩm quyền khóa sổ và công bố thuộc về Ban Giám Hiệu (Hiệu trưởng / Phó Hiệu trưởng)
   */
  static canLockPublish(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['admin', 'principal', 'vice_principal', 'academic_affairs'].includes(role)) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: 'Theo Thông tư 22/2021/TT-BGDĐT, chỉ Ban Giám Hiệu mới có thẩm quyền Khóa sổ điểm và phê duyệt công bố toàn trường.' 
    };
  }

  /**
   * Kiểm tra quyền Gửi Yêu Cầu Mở Khóa Sổ Điểm (grade.request_unlock)
   */
  static canRequestUnlock(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['teacher', 'guest_teacher', 'homeroom_teacher', 'department_head'].includes(role)) {
      if (!context.reason || context.reason.trim().length < 5) {
        return { allowed: false, reason: 'Vui lòng cung cấp lý do điều chỉnh điểm cụ thể (tối thiểu 5 ký tự)' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ giáo viên phụ trách mới có quyền gửi yêu cầu mở khóa sửa điểm' };
  }

  /**
   * Kiểm tra quyền Phê Duyệt / Mở Khóa Sổ Điểm (grade.approve_unlock / grade.unlock)
   */
  static canApproveUnlock(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (['admin', 'principal', 'vice_principal'].includes(role)) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ Ban Giám Hiệu mới có quyền phê duyệt yêu cầu mở khóa sổ điểm' };
  }

  /**
   * Kiểm tra quyền Mở Khóa Sổ Điểm để chỉnh sửa (grade.unlock)
   */
  static canUnlock(user, context = {}) {
    return this.canApproveUnlock(user, context);
  }

  /**
   * Kiểm tra quyền Đặc Cách Sửa Điểm Sau Công Bố (grade.override)
   * Yêu cầu bắt buộc phải có lý do và ghi nhận Audit Log
   */
  static canOverride(user, context = {}) {
    if (this.isSuperUser(user)) return { allowed: true };

    const role = (user.role || '').toLowerCase();
    if (role === 'principal' || role === 'vice_principal' || role === 'admin') {
      if (!context.reason || context.reason.trim().length < 5) {
        return { allowed: false, reason: 'Thao tác đặc cách sửa điểm bắt buộc phải nhập lý do giải trình chi tiết' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'Chỉ Ban Giám Hiệu mới có quyền đặc cách sửa điểm sau khi đã khóa chính thức' };
  }
}

export default GradePolicy;
