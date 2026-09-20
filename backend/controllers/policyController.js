import prisma from '../prismaClient.js';
import { calculateStudentTuition, STANDARD_POLICY_TYPES } from '../utils/feePolicyEngine.js';

/**
 * Lấy danh sách danh mục chính sách tiêu chuẩn
 */
export const getStandardPolicyTypes = async (req, res) => {
  res.json({
    success: true,
    data: STANDARD_POLICY_TYPES
  });
};

/**
 * Lấy danh sách chính sách miễn giảm học phí
 */
export const getStudentPolicies = async (req, res) => {
  try {
    const { studentId, classId, policyType, status } = req.query;
    const where = {};

    if (studentId) where.studentId = studentId;
    if (policyType) where.policyType = policyType;
    if (status) where.status = status;

    // Phân quyền: Học sinh chỉ xem của mình
    if (req.user?.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học sinh' });
      where.studentId = student.id;
    } else if (req.user?.role === 'teacher' && classId) {
      where.student = { classId };
    }

    const policies = await prisma.studentPolicy.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            class: { select: { className: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error('Error fetching student policies:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách chính sách' });
  }
};

// Helper: Tự động tính toán và cập nhật lại toàn bộ hóa đơn của học sinh khi có thay đổi chính sách
const syncStudentUnpaidBills = async (studentId) => {
  try {
    const allPolicies = await prisma.studentPolicy.findMany({
      where: { studentId, status: 'ACTIVE' }
    });

    // Tìm các hóa đơn chưa nộp hoặc từng được miễn 100% để tái tính toán
    const targetBills = await prisma.feeBill.findMany({
      where: {
        studentId,
        OR: [
          { status: 'unpaid' },
          { finalAmount: 0 }
        ]
      },
      include: { feeProfile: true, transactions: true }
    });

    for (const bill of targetBills) {
      const baseAmount = bill.originalAmount || bill.feeProfile?.amount || 0;
      const calc = calculateStudentTuition(baseAmount, allPolicies);
      const isFullExempt = calc.finalAmount === 0;
      const hasRealTransaction = bill.transactions && bill.transactions.length > 0;

      await prisma.feeBill.update({
        where: { id: bill.id },
        data: {
          originalAmount: baseAmount,
          discountAmount: calc.discountAmount,
          finalAmount: calc.finalAmount,
          appliedPolicySnapshot: calc.calculationSnapshot,
          status: isFullExempt || hasRealTransaction ? 'paid' : 'unpaid',
          paidAt: isFullExempt || hasRealTransaction ? (bill.paidAt || new Date()) : null
        }
      });
    }
  } catch (err) {
    console.error('Error syncing student unpaid bills with policy:', err);
  }
};

/**
 * Thêm mới chính sách ưu tiên cho học sinh
 */
export const createStudentPolicy = async (req, res) => {
  try {
    const {
      studentId,
      policyType,
      policyName,
      discountRate,
      fixedDiscount,
      documentNumber,
      documentIssuedDate,
      documentExpiryDate,
      notes
    } = req.body;

    if (!studentId || !policyType) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp học sinh và loại chính sách' });
    }

    const standardInfo = STANDARD_POLICY_TYPES[policyType] || {};
    const effectiveName = policyName || standardInfo.name || policyType;
    const effectiveRate = discountRate !== undefined ? Number(discountRate) : (standardInfo.defaultRate || 0.0);

    const newPolicy = await prisma.studentPolicy.create({
      data: {
        studentId,
        policyType,
        policyName: effectiveName,
        discountRate: Math.min(1.0, Math.max(0, effectiveRate)),
        fixedDiscount: fixedDiscount ? Number(fixedDiscount) : null,
        documentNumber,
        documentIssuedDate: documentIssuedDate ? new Date(documentIssuedDate) : null,
        documentExpiryDate: documentExpiryDate ? new Date(documentExpiryDate) : null,
        status: 'ACTIVE',
        approvedById: req.user?.id,
        notes
      }
    });

    // Tự động gạch nợ / giảm trừ tức thì cho các hóa đơn chưa nộp hiện tại của học sinh
    await syncStudentUnpaidBills(studentId);

    res.status(201).json({
      success: true,
      message: 'Thêm chính sách miễn giảm thành công và đã tự động cập nhật công nợ học sinh',
      data: newPolicy
    });
  } catch (error) {
    console.error('Error creating student policy:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo chính sách' });
  }
};

/**
 * Cập nhật chính sách
 */
export const updateStudentPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      policyType,
      policyName,
      discountRate,
      fixedDiscount,
      documentNumber,
      documentIssuedDate,
      documentExpiryDate,
      status,
      notes
    } = req.body;

    const updated = await prisma.studentPolicy.update({
      where: { id },
      data: {
        policyType,
        policyName,
        discountRate: discountRate !== undefined ? Math.min(1.0, Math.max(0, Number(discountRate))) : undefined,
        fixedDiscount: fixedDiscount !== undefined ? Number(fixedDiscount) : undefined,
        documentNumber,
        documentIssuedDate: documentIssuedDate ? new Date(documentIssuedDate) : undefined,
        documentExpiryDate: documentExpiryDate ? new Date(documentExpiryDate) : undefined,
        status,
        notes,
        updatedAt: new Date()
      }
    });

    // Cập nhật lại công nợ
    await syncStudentUnpaidBills(updated.studentId);

    res.json({
      success: true,
      message: 'Cập nhật chính sách thành công và đã đồng bộ lại công nợ',
      data: updated
    });
  } catch (error) {
    console.error('Error updating student policy:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật chính sách' });
  }
};

/**
 * Xóa chính sách
 */
export const deleteStudentPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.studentPolicy.findUnique({ where: { id } });
    if (existing) {
      await prisma.studentPolicy.delete({ where: { id } });
      await syncStudentUnpaidBills(existing.studentId);
    }
    res.json({ success: true, message: 'Xóa chính sách thành công và đã hoàn nguyên công nợ' });
  } catch (error) {
    console.error('Error deleting student policy:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa chính sách' });
  }
};

/**
 * Xem trước (Preview) học phí được giảm sau khi áp dụng chính sách
 */
export const previewTuitionWithPolicy = async (req, res) => {
  try {
    const { studentId, baseAmount } = req.body;
    if (!studentId || !baseAmount) {
      return res.status(400).json({ success: false, message: 'Thiếu studentId hoặc baseAmount' });
    }

    const policies = await prisma.studentPolicy.findMany({
      where: { studentId, status: 'ACTIVE' }
    });

    const calculation = calculateStudentTuition(baseAmount, policies);

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Error previewing tuition:', error);
    res.status(500).json({ success: false, message: 'Lỗi tính toán xem trước học phí' });
  }
};
