import prisma from '../prismaClient.js';

// Tạo mới hồ sơ học phí
export const createFeeProfile = async (req, res) => {
    try {
        const { name, amount, targetGrades, academicYear, semester } = req.body;

        if (!name || !amount || !targetGrades || !academicYear || !semester) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
        }

        const feeProfile = await prisma.feeProfile.create({
            data: {
                name,
                amount: parseFloat(amount),
                targetGrades,
                academicYear,
                semester
            }
        });

        res.status(201).json({
            message: 'Tạo hồ sơ học phí thành công',
            data: feeProfile
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
        const { name, amount, targetGrades, academicYear, semester } = req.body;

        const feeProfile = await prisma.feeProfile.findUnique({ where: { id } });
        if (!feeProfile) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ học phí' });
        }

        const updatedFeeProfile = await prisma.feeProfile.update({
            where: { id },
            data: {
                name: name || feeProfile.name,
                amount: amount ? parseFloat(amount) : feeProfile.amount,
                targetGrades: targetGrades || feeProfile.targetGrades,
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

// Gán hồ sơ học phí cho học sinh
export const assignFeeProfile = async (req, res) => {
    try {
        const { feeProfileId, targetGrades, classId } = req.body;

        if (!feeProfileId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp ID hồ sơ học phí' });
        }

        const feeProfile = await prisma.feeProfile.findUnique({
            where: { id: feeProfileId }
        });

        if (!feeProfile) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ học phí' });
        }

        let whereCondition = {};
        
        if (classId) {
            whereCondition.classId = classId;
        } else if (targetGrades && targetGrades.length > 0) {
            // Find classes that belong to the target grades
            const classes = await prisma.class.findMany({
                where: {
                    grade: { in: targetGrades }
                }
            });
            const classIds = classes.map(c => c.id);
            whereCondition.classId = { in: classIds };
        } else {
            return res.status(400).json({ message: 'Vui lòng cung cấp classId hoặc targetGrades' });
        }

        // Lấy tất cả học sinh thỏa mãn điều kiện
        const students = await prisma.student.findMany({
            where: whereCondition
        });

        if (students.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy học sinh nào phù hợp' });
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
            return res.status(200).json({ message: 'Tất cả học sinh trong phạm vi đã được gán hồ sơ học phí này trước đó' });
        }

        // Ngày đến hạn mặc định là 30 ngày sau khi gán
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Tạo hóa đơn hàng loạt
        const dataToInsert = studentsToAssign.map(s => ({
            feeProfileId,
            studentId: s.id,
            status: 'unpaid',
            dueDate
        }));

        await prisma.feeBill.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });

        res.status(200).json({
            message: `Gán hồ sơ học phí thành công cho ${dataToInsert.length} học sinh`,
            assignedCount: dataToInsert.length
        });

    } catch (error) {
        console.error('Error assigning fee profile:', error);
        res.status(500).json({ message: 'Lỗi server khi gán hồ sơ học phí' });
    }
};
