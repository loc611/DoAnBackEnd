/**
 * Fee Policy Engine - Bộ máy tính toán và áp dụng chính sách miễn giảm học phí
 * Tuân thủ quy định về an sinh giáo dục và chính sách nội bộ trường học
 */

export const STANDARD_POLICY_TYPES = {
  MARTYR_CHILD: { name: 'Con thương binh, liệt sĩ', defaultRate: 1.0, maxCap: 1.0 },
  POOR_HOUSEHOLD: { name: 'Hộ nghèo', defaultRate: 0.7, maxCap: 1.0 },
  NEAR_POOR: { name: 'Hộ cận nghèo', defaultRate: 0.5, maxCap: 0.7 },
  DISABILITY: { name: 'Học sinh khuyết tật', defaultRate: 0.7, maxCap: 1.0 },
  TEACHER_CHILD: { name: 'Con cán bộ / giáo viên', defaultRate: 0.3, maxCap: 0.5 },
  ETHNIC_MINORITY: { name: 'Dân tộc thiểu số vùng khó khăn', defaultRate: 0.5, maxCap: 0.7 },
  ORPHAN: { name: 'Học sinh mồ côi', defaultRate: 0.7, maxCap: 1.0 },
  MERIT_SCHOLARSHIP: { name: 'Học bổng khuyến học', defaultRate: 0.5, maxCap: 1.0 },
  OTHER: { name: 'Chính sách hỗ trợ khác', defaultRate: 0.2, maxCap: 1.0 }
};

/**
 * Tính toán học phí thực nộp dựa trên danh sách chính sách miễn giảm của học sinh
 * @param {number} baseAmount - Học phí gốc (VNĐ)
 * @param {Array} policies - Danh sách chính sách của học sinh (từ bảng StudentPolicy)
 * @param {Object} options - Tùy chọn tính toán (stackingMode: 'highest' | 'additive', maxCap: 1.0)
 * @returns {Object} { originalAmount, discountAmount, finalAmount, appliedPolicies, calculationSnapshot }
 */
export function calculateStudentTuition(baseAmount, policies = [], options = {}) {
  const originalAmount = Math.max(0, Number(baseAmount) || 0);
  const now = new Date();

  // 1. Lọc các chính sách còn hiệu lực (ACTIVE và chưa hết hạn)
  const activePolicies = (policies || []).filter(p => {
    if (!p) return false;
    if (p.status && p.status !== 'ACTIVE') return false;
    if (p.documentExpiryDate) {
      const expDate = new Date(p.documentExpiryDate);
      if (expDate < now) return false; // Đã hết hạn giấy tờ
    }
    return true;
  });

  if (activePolicies.length === 0) {
    return {
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      effectiveRate: 0,
      appliedPolicies: [],
      calculationSnapshot: {
        method: 'NO_POLICY',
        baseAmount: originalAmount,
        calculatedAt: now.toISOString()
      }
    };
  }

  const stackingMode = options.stackingMode || 'highest'; // 'highest' (chọn mức ưu đãi cao nhất) hoặc 'additive' (cộng dồn có trần)
  const globalCap = options.maxCap !== undefined ? options.maxCap : 1.0; // Trần giảm tối đa (100%)

  let totalRate = 0;
  let fixedDeduction = 0;
  let appliedList = [];

  if (stackingMode === 'highest') {
    // Tìm chính sách có tỷ lệ giảm cao nhất
    let highestPolicy = null;
    let maxRate = 0;

    for (const p of activePolicies) {
      const rate = Number(p.discountRate) || 0;
      if (rate > maxRate) {
        maxRate = rate;
        highestPolicy = p;
      }
      if (p.fixedDiscount && Number(p.fixedDiscount) > fixedDeduction) {
        fixedDeduction = Number(p.fixedDiscount);
      }
    }

    totalRate = Math.min(globalCap, maxRate);
    if (highestPolicy) {
      appliedList.push({
        id: highestPolicy.id,
        type: highestPolicy.policyType,
        name: highestPolicy.policyName,
        rate: highestPolicy.discountRate,
        docNo: highestPolicy.documentNumber
      });
    }
  } else {
    // Cộng dồn các chính sách (có trần tối đa)
    for (const p of activePolicies) {
      const rate = Number(p.discountRate) || 0;
      totalRate += rate;
      if (p.fixedDiscount) {
        fixedDeduction += Number(p.fixedDiscount);
      }
      appliedList.push({
        id: p.id,
        type: p.policyType,
        name: p.policyName,
        rate: p.discountRate,
        docNo: p.documentNumber
      });
    }
    totalRate = Math.min(globalCap, totalRate);
  }

  // Tính số tiền được giảm theo tỷ lệ %
  const percentageDiscount = Math.round(originalAmount * totalRate);
  // Tổng tiền giảm = Giảm theo % + Giảm tiền mặt cố định (nếu có)
  const totalDiscount = Math.min(originalAmount, percentageDiscount + fixedDeduction);
  const finalAmount = Math.max(0, originalAmount - totalDiscount);

  return {
    originalAmount,
    discountAmount: totalDiscount,
    finalAmount,
    effectiveRate: Number((totalDiscount / (originalAmount || 1)).toFixed(2)),
    appliedPolicies: appliedList,
    calculationSnapshot: {
      mode: stackingMode,
      baseAmount: originalAmount,
      discountAmount: totalDiscount,
      finalAmount,
      appliedList,
      calculatedAt: now.toISOString()
    }
  };
}
