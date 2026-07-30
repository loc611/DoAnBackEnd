import prisma from '../prismaClient.js';

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
        const { subjectCode, name, credits, type, teacherId } = req.body;
        
        const existing = await prisma.subject.findUnique({ where: { subjectCode } });
        if (existing) {
            return res.status(400).json({ message: 'Mã môn học đã tồn tại' });
        }

        const createdSubject = await prisma.subject.create({
            data: {
                subjectCode,
                name,
                credits: parseInt(credits) || 0,
                type: type || 'Bắt buộc',
                teacherId: teacherId || null
            }
        });
        res.status(201).json(createdSubject);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi tạo môn học' });
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
