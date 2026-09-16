import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  calculateSubjectSemesterAverage, 
  calculateSubjectYearlyAverage, 
  evaluateSemesterSummary,
  roundScore 
} from '../utils/gradeCalculator.js';
import { CORE_ROLE_PERMISSION_MATRIX } from '../utils/seedRbacScope.js';

describe('1. Kiểm thử Công thức Tính điểm Thông tư 22/2021/TT-BGDĐT', () => {
  it('Tính ĐTBmhk chuẩn: 2 cột TX, 1 GK, 1 CK', () => {
    // TX1 = 8.0, TX2 = 9.0, GK = 7.5 (x2), CK = 8.5 (x3)
    // Tổng = 8 + 9 + 15 + 25.5 = 57.5. Hệ số = 2 + 2 + 3 = 7.
    // ĐTB = 57.5 / 7 = 8.214... Làm tròn 1 chữ số thập phân = 8.2
    const result = calculateSubjectSemesterAverage({
      regularScores: [8.0, 9.0],
      midtermScore: 7.5,
      finalScore: 8.5,
      assessmentType: 'score'
    });

    assert.strictEqual(result.avgScore, 8.2);
    assert.strictEqual(result.isComplete, true);
  });

  it('Tính ĐTBmhk với đầy đủ 4 cột TX, 1 GK, 1 CK', () => {
    // TX = [8, 8.5, 9, 9.5] -> Tổng TX = 35 (hệ số 4)
    // GK = 8.0 (x2) -> 16
    // CK = 9.0 (x3) -> 27
    // Tổng = 35 + 16 + 27 = 78. Hệ số = 4 + 2 + 3 = 9.
    // ĐTB = 78 / 9 = 8.666... -> Làm tròn = 8.7
    const result = calculateSubjectSemesterAverage({
      regularScores: [8, 8.5, 9, 9.5],
      midtermScore: 8.0,
      finalScore: 9.0,
      assessmentType: 'score'
    });

    assert.strictEqual(result.avgScore, 8.7);
    assert.strictEqual(result.isComplete, true);
  });

  it('Môn học Đánh giá nhận xét (Thể dục, HĐTN) trả về Đạt/Chưa đạt', () => {
    const passResult = calculateSubjectSemesterAverage({
      assessmentType: 'feedback',
      feedbackResult: 'Đ'
    });
    assert.strictEqual(passResult.avgScore, null);
    assert.strictEqual(passResult.feedbackResult, 'Đ');
    assert.strictEqual(passResult.isComplete, true);

    const failResult = calculateSubjectSemesterAverage({
      assessmentType: 'feedback',
      feedbackResult: 'CĐ'
    });
    assert.strictEqual(failResult.feedbackResult, 'CĐ');
    assert.strictEqual(failResult.isComplete, true);
  });

  it('Tính ĐTB môn cả năm (ĐTBmcn) = (HK1 + 2 * HK2) / 3', () => {
    // HK1 = 7.8, HK2 = 8.4
    // (7.8 + 2 * 8.4) / 3 = (7.8 + 16.8) / 3 = 24.6 / 3 = 8.2
    const yearlyAvg = calculateSubjectYearlyAverage(7.8, 8.4);
    assert.strictEqual(yearlyAvg, 8.2);
  });

  it('Đánh giá Xếp loại Học sinh Giỏi theo Thông tư 22', () => {
    // Giả lập 8 môn tính điểm (tất cả >= 6.5, có >= 6 môn >= 8.0) và 1 môn nhận xét Đạt
    const subjects = [
      { avgScore: 8.5, assessmentType: 'score' },
      { avgScore: 8.2, assessmentType: 'score' },
      { avgScore: 9.0, assessmentType: 'score' },
      { avgScore: 8.0, assessmentType: 'score' },
      { avgScore: 8.4, assessmentType: 'score' },
      { avgScore: 8.8, assessmentType: 'score' },
      { avgScore: 7.0, assessmentType: 'score' },
      { avgScore: 7.5, assessmentType: 'score' },
      { feedbackResult: 'Đ', assessmentType: 'feedback' }
    ];

    const evaluation = evaluateSemesterSummary(subjects, 'Tốt');
    assert.strictEqual(evaluation.academicRank, 'Tốt');
    assert.strictEqual(evaluation.titleAwarded, 'Học sinh Giỏi');
    assert.strictEqual(evaluation.overallAvg, 8.2);
  });

  it('Đánh giá Học sinh Xuất sắc (Rèn luyện Tốt, Học tập Tốt, >= 6 môn >= 9.0)', () => {
    const subjects = [
      { avgScore: 9.2, assessmentType: 'score' },
      { avgScore: 9.5, assessmentType: 'score' },
      { avgScore: 9.0, assessmentType: 'score' },
      { avgScore: 9.1, assessmentType: 'score' },
      { avgScore: 9.3, assessmentType: 'score' },
      { avgScore: 9.0, assessmentType: 'score' },
      { avgScore: 8.5, assessmentType: 'score' },
      { avgScore: 8.8, assessmentType: 'score' },
      { feedbackResult: 'Đ', assessmentType: 'feedback' }
    ];

    const evaluation = evaluateSemesterSummary(subjects, 'Tốt');
    assert.strictEqual(evaluation.academicRank, 'Tốt');
    assert.strictEqual(evaluation.titleAwarded, 'Học sinh Xuất sắc');
  });
});

describe('2. Kiểm thử Ma trận Phân quyền 2-Tier RBAC Scope Matrix', () => {
  it('Admin có toàn quyền quản trị và override', () => {
    const adminPerms = CORE_ROLE_PERMISSION_MATRIX.admin;
    assert.ok(adminPerms.includes('grade:write'));
    assert.ok(adminPerms.includes('grade:override'));
    assert.ok(adminPerms.includes('export:batch'));
  });

  it('Giáo viên bộ môn có quyền ghi điểm (grade:write) nhưng KHÔNG có quyền override hoặc export batch', () => {
    const teacherPerms = CORE_ROLE_PERMISSION_MATRIX.subject_teacher;
    assert.ok(teacherPerms.includes('grade:write'));
    assert.ok(!teacherPerms.includes('grade:override'));
    assert.ok(!teacherPerms.includes('export:batch'));
  });

  it('Giáo viên chủ nhiệm có quyền đánh giá hạnh kiểm (conduct:write) và xem điểm nhưng KHÔNG sửa điểm môn học khác', () => {
    const homeroomPerms = CORE_ROLE_PERMISSION_MATRIX.homeroom_teacher;
    assert.ok(homeroomPerms.includes('conduct:write'));
    assert.ok(homeroomPerms.includes('grade:read'));
    assert.ok(!homeroomPerms.includes('grade:write'));
  });

  it('Học sinh chỉ có quyền đọc (read), không có bất kỳ quyền write nào', () => {
    const studentPerms = CORE_ROLE_PERMISSION_MATRIX.student;
    assert.ok(studentPerms.includes('grade:read'));
    assert.ok(!studentPerms.includes('grade:write'));
    assert.ok(!studentPerms.includes('conduct:write'));
    assert.ok(!studentPerms.includes('attendance:write'));
  });
});

describe('3. Kiểm thử Policy Engine Học Phí & Đối Tượng Ưu Tiên', () => {
  it('Miễn 100% học phí cho con thương binh, liệt sĩ (MARTYR_CHILD)', async () => {
    const { calculateStudentTuition } = await import('../utils/feePolicyEngine.js');
    const baseAmount = 3000000;
    const policies = [{
      id: 'p1',
      policyType: 'MARTYR_CHILD',
      policyName: 'Con thương binh, liệt sĩ',
      discountRate: 1.0,
      status: 'ACTIVE'
    }];

    const result = calculateStudentTuition(baseAmount, policies);
    assert.strictEqual(result.originalAmount, 3000000);
    assert.strictEqual(result.discountAmount, 3000000);
    assert.strictEqual(result.finalAmount, 0);
    assert.strictEqual(result.effectiveRate, 1.0);
  });

  it('Giảm 70% học phí cho diện Hộ nghèo (POOR_HOUSEHOLD)', async () => {
    const { calculateStudentTuition } = await import('../utils/feePolicyEngine.js');
    const baseAmount = 2500000;
    const policies = [{
      id: 'p2',
      policyType: 'POOR_HOUSEHOLD',
      policyName: 'Hộ nghèo',
      discountRate: 0.7,
      status: 'ACTIVE'
    }];

    const result = calculateStudentTuition(baseAmount, policies);
    assert.strictEqual(result.originalAmount, 2500000);
    assert.strictEqual(result.discountAmount, 1750000);
    assert.strictEqual(result.finalAmount, 750000);
    assert.strictEqual(result.effectiveRate, 0.7);
  });

  it('Từ chối chính sách đã hết hạn giấy tờ (documentExpiryDate < now)', async () => {
    const { calculateStudentTuition } = await import('../utils/feePolicyEngine.js');
    const baseAmount = 2000000;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10); // Hết hạn 10 ngày trước

    const policies = [{
      id: 'p3',
      policyType: 'NEAR_POOR',
      policyName: 'Hộ cận nghèo',
      discountRate: 0.5,
      documentExpiryDate: pastDate,
      status: 'ACTIVE'
    }];

    const result = calculateStudentTuition(baseAmount, policies);
    assert.strictEqual(result.discountAmount, 0);
    assert.strictEqual(result.finalAmount, 2000000); // Phải đóng 100%
  });
});

