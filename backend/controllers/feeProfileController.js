import prisma from '../prismaClient.js';
import { calculateStudentTuition } from '../utils/feePolicyEngine.js';

// Tạo mới hồ sơ học phí
export const createFeeProfile = async (req, res) => {
    try {
        const { name, amount, targetGrades, targetClassIds, academicYear, semester } = req.body;

        if (!name || !amount || !academicYear || !semester) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
        }

        const feeProfile = await prisma.feeProfile.create({
            data: {
                name,
                amount: parseFloat(amount),
                targetGrades: Array.isArray(targetGrades) ? targetGrades.map(Number) : [],
                targetClassIds: Array.isArray(targetClassIds) ? targetClassIds : [],
                academicYear,
                semester
            }
        });

        // Tự động gán hóa đơn cho học sinh theo phạm vi khối/lớp ngay khi tạo
        let assignedCount = 0;
        try {
            const assignResult = await executeAssignFeeProfile({
                feeProfileId: feeProfile.id,
                targetGrades: feeProfile.targetGrades,
                targetClassIds: feeProfile.targetClassIds
            });
            assignedCount = assignResult.count || 0;
        } catch (assignError) {
            console.warn('Lỗi khi tự động gán hóa đơn cho học sinh:', assignError);
        }

        res.status(201).json({
            message: assignedCount > 0 
                ? `Tạo đợt thu thành công và đã tự động gán cho ${assignedCount} học sinh`
                : 'Tạo hồ sơ học phí thành công',
            data: feeProfile,
            assignedCount
        });
    } catch (error) {
        console.error('Error creating fee profile:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo hồ sơ học phí' });
    }
};

// Lấy danh sách hồ sơ học phí
export const getFeeProfiles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { academicYear, semester } = req.query;

        const skip = (page - 1) * limit;
        
        let where = {};
        if (academicYear) where.academicYear = academicYear;
        if (semester) where.semester = semester;

        const feeProfiles = await prisma.feeProfile.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                _count: {
                    select: { feeBills: true }
                }
            }
        });

        const total = await prisma.feeProfile.count({ where });

        res.status(200).json({
            data: feeProfiles,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching fee profiles:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách hồ sơ học phí' });
    }
};

// Cập nhật hồ sơ học phí
export const updateFeeProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, amount, targetGrades, targetClassIds, academicYear, semester } = req.body;

        const feeProfile = await prisma.feeProfile.findUnique({ where: { id } });
        if (!feeProfile) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ học phí' });
        }

        const updatedFeeProfile = await prisma.feeProfile.update({
            where: { id },
            data: {
                name: name || feeProfile.name,
                amount: amount !== undefined ? parseFloat(amount) : feeProfile.amount,
                targetGrades: targetGrades !== undefined ? (Array.isArray(targetGrades) ? targetGrades.map(Number) : []) : feeProfile.targetGrades,
                targetClassIds: targetClassIds !== undefined ? (Array.isArray(targetClassIds) ? targetClassIds : []) : feeProfile.targetClassIds,
                academicYear: academicYear || feeProfile.academicYear,
                semester: semester || feeProfile.semester
            }
        });

        res.status(200).json({
            message: 'Cập nhật hồ sơ học phí thành công',
            data: updatedFeeProfile
        });
    } catch (error) {
        console.error('Error updating fee profile:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật hồ sơ học phí' });
    }
};

/**
 * Thực thi gán hóa đơn học phí cho học sinh theo phạm vi khối / lớp
 */
export const executeAssignFeeProfile = async ({ feeProfileId, targetGrades, classId, targetClassIds }) => {
    const feeProfile = await prisma.feeProfile.findUnique({
        where: { id: feeProfileId }
    });

    if (!feeProfile) {
        throw new Error('Không tìm thấy hồ sơ học phí');
    }

    const effectiveClassIds = (targetClassIds && targetClassIds.length > 0)
        ? targetClassIds
        : (feeProfile.targetClassIds && feeProfile.targetClassIds.length > 0 ? feeProfile.targetClassIds : []);

    const effectiveGrades = (targetGrades && targetGrades.length > 0)
        ? targetGrades
        : (feeProfile.targetGrades && feeProfile.targetGrades.length > 0 ? feeProfile.targetGrades : []);

    let whereCondition = {};

    if (effectiveClassIds.length > 0) {
        whereCondition.classId = { in: effectiveClassIds };
    } else if (classId) {
        whereCondition.classId = classId;
    } else if (effectiveGrades.length > 0) {
        const classes = await prisma.class.findMany({
            where: {
                grade: { in: effectiveGrades.map(Number) }
            }
        });
        const classIds = classes.map(c => c.id);
        if (classIds.length === 0) {
            return { count: 0, message: 'Không tìm thấy lớp nào phù hợp với các khối đã chọn' };
        }
        whereCondition.classId = { in: classIds };
    } else {
        return { count: 0, message: 'Chưa cấu hình khối hoặc lớp áp dụng' };
    }

    // Lấy tất cả học sinh thỏa mãn điều kiện kèm chính sách ưu đãi đang có
    const students = await prisma.student.findMany({
        where: whereCondition,
        include: {
            policies: {
                where: { status: 'ACTIVE' }
            }
        }
    });

    if (students.length === 0) {
        return { count: 0, message: 'Không tìm thấy học sinh nào phù hợp với phạm vi đã chọn' };
    }

    // Lấy danh sách các hóa đơn đã tồn tại cho hồ sơ này để tránh tạo trùng
    const existingBills = await prisma.feeBill.findMany({
        where: {
            feeProfileId,
            studentId: { in: students.map(s => s.id) }
        },
        select: { studentId: true }
    });

    const existingStudentIds = existingBills.map(b => b.studentId);

    // Lọc ra các học sinh chưa được gán hóa đơn này
    const studentsToAssign = students.filter(s => !existingStudentIds.includes(s.id));

    if (studentsToAssign.length === 0) {
        return { count: 0, message: 'Tất cả học sinh trong phạm vi đã được gán hồ sơ học phí này trước đó' };
    }

    // Ngày đến hạn mặc định là 30 ngày sau khi gán
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Tạo hóa đơn hàng loạt có áp dụng Policy Engine miễn giảm
    const dataToInsert = studentsToAssign.map(s => {
        const calc = calculateStudentTuition(feeProfile.amount, s.policies || []);
        const isFullExempt = calc.finalAmount === 0;

        return {
            feeProfileId,
            studentId: s.id,
            originalAmount: feeProfile.amount,
            discountAmount: calc.discountAmount,
            finalAmount: calc.finalAmount,
            appliedPolicySnapshot: calc.calculationSnapshot,
            status: isFullExempt ? 'paid' : 'unpaid',
            dueDate,
            paidAt: isFullExempt ? new Date() : null
        };
    });

    await prisma.feeBill.createMany({
        data: dataToInsert,
        skipDuplicates: true
    });

    return {
        count: dataToInsert.length,
        message: `Gán hồ sơ học phí thành công cho ${dataToInsert.length} học sinh (Đã tự động tính toán miễn giảm chính sách)`
    };
};

// Gán hồ sơ học phí cho học sinh
export const assignFeeProfile = async (req, res) => {
    try {
        const { feeProfileId, targetGrades, classId, targetClassIds } = req.body;

        if (!feeProfileId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp ID hồ sơ học phí' });
        }

        const result = await executeAssignFeeProfile({
            feeProfileId,
            targetGrades,
            classId,
            targetClassIds
        });

        res.status(200).json({
            message: result.message,
            assignedCount: result.count
        });
    } catch (error) {
        console.error('Error assigning fee profile:', error);
        res.status(500).json({ message: error.message || 'Lỗi server khi gán hồ sơ học phí' });
    }
};

// Helper thực hiện quét và gán bù hóa đơn học phí cho học sinh
export const backfillFeeProfilesHelper = async () => {
    try {
        const feeProfiles = await prisma.feeProfile.findMany();
        let totalAssigned = 0;
        const details = [];

        for (const fp of feeProfiles) {
            try {
                const result = await executeAssignFeeProfile({
                    feeProfileId: fp.id,
                    targetGrades: fp.targetGrades,
                    targetClassIds: fp.targetClassIds
                });
                if (result.count > 0) {
                    totalAssigned += result.count;
                    details.push({
                        name: fp.name,
                        assignedCount: result.count
                    });
                }
            } catch (err) {
                console.warn(`Lỗi khi gán bù cho đợt thu ${fp.name}:`, err.message);
            }
        }

        if (totalAssigned > 0) {
            console.log(`✅ [Học Phí] Đã tự động gán bù ${totalAssigned} hóa đơn học phí cho học sinh.`);
        }

        return { totalAssigned, details };
    } catch (error) {
        console.error('Error in backfillFeeProfilesHelper:', error);
        return { totalAssigned: 0, details: [] };
    }
};

// Gán bù toàn bộ đợt thu học phí chưa được phát sinh hóa đơn cho học sinh (API Endpoint)
export const backfillUnassignedFeeProfiles = async (req, res) => {
    try {
        const { totalAssigned, details } = await backfillFeeProfilesHelper();

        res.status(200).json({
            success: true,
            message: totalAssigned > 0
                ? `Đã tự động gán bù ${totalAssigned} hóa đơn học phí cho học sinh`
                : 'Tất cả học sinh trong phạm vi đã có đầy đủ hóa đơn học phí',
            totalAssigned,
            details
        });
    } catch (error) {
        console.error('Error in backfillUnassignedFeeProfiles:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi gán bù học phí: ' + error.message });
    }
};
