import prisma from '../prismaClient.js';
import { isValidSubjectCode } from '../utils/validator.js';

export const getSubjects = async (req, res) => {
    try {
        const subjects = await prisma.subject.findMany({
            include: {
                teacher: {
                    select: {
                        fullName: true,
                        teacherCode: true
                    }
                }
            }
        });
        // Frontend expects teacherId object to have fullName and teacherCode
        const formatted = subjects.map(s => ({
            ...s,
            teacherId: s.teacher ? { fullName: s.teacher.fullName, teacherCode: s.teacher.teacherCode } : null
        }));
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách môn học' });
    }
};

export const createSubject = async (req, res) => {
    try {
        let { subjectCode, name, grade, periodsPerWeek, credits, type, teacherId } = req.body;

        if (!subjectCode || !subjectCode.trim()) {
            return res.status(400).json({ message: 'Mã môn học không được để trống' });
        }

        subjectCode = subjectCode.trim().toUpperCase();

        if (!isValidSubjectCode(subjectCode)) {
            return res.status(400).json({ 
                message: 'Mã môn học không hợp lệ (chỉ gồm 2-20 ký tự chữ và số, không khoảng trắng, ví dụ: TOAN10, MH01)' 
            });
        }
        
        const existing = await prisma.subject.findFirst({ 
            where: { subjectCode: { equals: subjectCode, mode: 'insensitive' } } 
        });
        if (existing) {
            return res.status(400).json({ message: 'Mã môn học đã tồn tại' });
        }

        const parsedPeriods = parseInt(periodsPerWeek || credits, 10) || 2;
        const parsedGrade = parseInt(grade, 10) || 0; // 0: Toàn trường, 10: Khối 10, 11: Khối 11, 12: Khối 12

        const createdSubject = await prisma.subject.create({
            data: {
                subjectCode,
                name: name ? name.trim() : '',
                grade: parsedGrade,
                periodsPerWeek: parsedPeriods,
                credits: parsedPeriods,
                type: type || 'Bắt buộc',
                teacherId: teacherId || null
            }
        });
        res.status(201).json(createdSubject);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi server khi tạo môn học' });
    }
};

export const updateSubject = async (req, res) => {
    try {
        const { name, grade, periodsPerWeek, credits, type, teacherId } = req.body;
        const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
        if (!subject) return res.status(404).json({ message: 'Không tìm thấy môn học' });

        const updated = await prisma.subject.update({
            where: { id: req.params.id },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                grade: grade !== undefined ? parseInt(grade, 10) : undefined,
                periodsPerWeek: periodsPerWeek !== undefined ? parseInt(periodsPerWeek, 10) : undefined,
                credits: credits !== undefined ? parseInt(credits, 10) : undefined,
                type: type || undefined,
                teacherId: teacherId !== undefined ? (teacherId === '' ? null : teacherId) : undefined
            },
            include: {
                teacher: {
                    select: { fullName: true, teacherCode: true }
                }
            }
        });
        res.json({
            ...updated,
            teacherId: updated.teacher ? { fullName: updated.teacher.fullName, teacherCode: updated.teacher.teacherCode } : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Lỗi khi cập nhật môn học' });
    }
};

export const deleteSubject = async (req, res) => {
    try {
        const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
        if (!subject) {
            return res.status(404).json({ message: 'Không tìm thấy môn học' });
        }

        await prisma.subject.delete({ where: { id: req.params.id } });
        res.json({ message: 'Đã xóa môn học' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi xóa môn học' });
    }
};
