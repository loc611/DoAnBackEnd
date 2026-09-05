/**
 * BasePolicy - Lớp cơ sở cho toàn bộ các Policy phân quyền ABAC
 */
class BasePolicy {
  /**
   * Kiểm tra người dùng có phải là Quản trị viên tối cao hoặc Hiệu trưởng không
   */
  static isSuperUser(user) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'admin' || role === 'it_admin' || role === 'principal';
  }

  /**
   * Kiểm tra giáo viên thỉnh giảng có còn trong thời hạn hợp đồng không
   */
  static isGuestTeacherExpired(teacher) {
    if (!teacher) return false;
    if (teacher.teacherType === 'guest' && teacher.contractExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(teacher.contractExpiresAt);
      return now > expiresAt;
    }
    return false;
  }

  /**
   * Kiểm tra giáo viên có đang trong thời gian nghỉ phép dài hạn không
   */
  static isTeacherOnLongLeave(teacher) {
    if (!teacher) return false;
    if (teacher.leaveStatus === 'long_term_leave') {
      const now = new Date();
      if (teacher.leaveStartDate && teacher.leaveEndDate) {
        const start = new Date(teacher.leaveStartDate);
        const end = new Date(teacher.leaveEndDate);
        return now >= start && now <= end;
      }
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra quan hệ và quyền giám hộ của phụ huynh với học sinh
   * @param {Object} parent - Profile phụ huynh
   * @param {string} studentId - ID học sinh cần tra cứu
   * @param {string} accessType - 'grades' | 'financial' | 'general'
   */
  static getParentCustodyAccess(parent, studentId, accessType = 'general') {
    const links = parent?.guardianLinks || parent?.studentRelations || [];
    if (!parent || links.length === 0) {
      return { allowed: false, reason: 'Không tìm thấy liên kết phụ huynh - học sinh' };
    }

    const relation = links.find(r => r.studentId === studentId);
    if (!relation) {
      return { allowed: false, reason: 'Phụ huynh không có quyền giám hộ với học sinh này' };
    }

    const custody = (relation.custodyType || 'full').toLowerCase();
    if (custody === 'none') {
      return { allowed: false, reason: 'Quyền giám hộ đã bị tước bỏ theo quyết định của tòa án' };
    }

    if (accessType === 'grades' && (relation.accessGrades === false || relation.accessGradeRecords === false)) {
      return { allowed: false, reason: 'Bị hạn chế quyền truy cập kết quả học tập' };
    }

    if (accessType === 'financial' && (relation.accessFinances === false || relation.accessFinancialRecords === false)) {
      return { allowed: false, reason: 'Bị hạn chế quyền xem thông tin tài chính/học phí' };
    }

    return { allowed: true, relation };
  }
}

export default BasePolicy;
