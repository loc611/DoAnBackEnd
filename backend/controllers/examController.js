import prisma from '../prismaClient.js';

// Lấy danh sách lịch thi (có bộ lọc)
export const getAllExams = async (req, res) => {
    try {
        const { semester, academicYear, grade, examType, classId } = req.query;

        const where = {};
        if (semester) where.semester = semester;
        if (academicYear) where.academicYear = academicYear;
        if (examType && examType !== 'all') where.examType = examType;
        if (grade && grade !== '0' && grade !== 'all') where.grade = parseInt(grade, 10);
        if (classId && classId !== 'all') where.classId = classId;

        const exams = await prisma.examSchedule.findMany({
            where,
            include: {
                class: {
                    select: { id: true, className: true }
                }
            },
            orderBy: [
                { examDate: 'asc' },
                { startTime: 'asc' }
            ]
        });

        res.json(exams);
    } catch (error) {
        console.error('Lỗi getAllExams:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách lịch thi' });
    }
};

// Lấy lịch thi cho học sinh đang đăng nhập
export const getStudentExams = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'student') {
            return res.status(403).json({ message: 'Chỉ học sinh mới có thể dùng endpoint này' });
        }

        const student = await prisma.student.findUnique({
            where: { userId: req.user.id },
            include: { class: true }
        });

        if (!student || !student.class) {
            return res.json([]);
        }

        const studentGrade = student.class.grade;
        const studentClassId = student.class.id;

        // Lấy các lịch thi áp dụng cho toàn trường (grade 0), hoặc đúng khối này, hoặc đúng lớp này
        const exams = await prisma.examSchedule.findMany({
            where: {
                OR: [
                    { grade: 0 },
                    { grade: studentGrade, classId: null },
                    { classId: studentClassId }
                ]
            },
            include: {
                class: {
                    select: { id: true, className: true }
                }
            },
            orderBy: [
                { examDate: 'asc' },
                { startTime: 'asc' }
            ]
        });

        res.json({
            student: {
                fullName: student.fullName,
                studentCode: student.studentCode,
                className: student.class.className,
                grade: studentGrade
            },
            exams
        });
    } catch (error) {
        console.error('Lỗi getStudentExams:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy lịch thi cá nhân' });
    }
};

// Tạo lịch thi mới (Admin)
export const createExam = async (req, res) => {
    try {
        const {
            examName,
            examType = 'Giữa kỳ',
            subjectName,
            grade = 10,
            classId,
            examDate,
            startTime,
            duration = 45,
            room,
            examFormat = 'Trắc nghiệm',
            semester = 'HK1_2026',
            academicYear = '2026-2027',
            notes
        } = req.body;

        if (!examName || !subjectName || !examDate || !startTime || !room) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' });
        }

        const newExam = await prisma.examSchedule.create({
            data: {
                examName,
                examType,
                subjectName,
                grade: parseInt(grade, 10),
                classId: classId && classId !== '' ? classId : null,
                examDate: new Date(examDate),
                startTime,
                duration: parseInt(duration, 10),
                room,
                examFormat,
                semester,
                academicYear,
                notes: notes || null
            },
            include: {
                class: true
            }
        });

        res.status(201).json({ message: 'Tạo lịch thi thành công', exam: newExam });
    } catch (error) {
        console.error('Lỗi createExam:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo lịch thi' });
    }
};

// Cập nhật lịch thi (Admin)
export const updateExam = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            examName,
            examType,
            subjectName,
            grade,
            classId,
            examDate,
            startTime,
            duration,
            room,
            examFormat,
            semester,
            academicYear,
            notes
        } = req.body;

        const updated = await prisma.examSchedule.update({
            where: { id },
            data: {
                examName,
                examType,
                subjectName,
                grade: grade !== undefined ? parseInt(grade, 10) : undefined,
                classId: classId !== undefined ? (classId && classId !== '' ? classId : null) : undefined,
                examDate: examDate ? new Date(examDate) : undefined,
                startTime,
                duration: duration !== undefined ? parseInt(duration, 10) : undefined,
                room,
                examFormat,
                semester,
                academicYear,
                notes
            },
            include: {
                class: true
            }
        });

        res.json({ message: 'Cập nhật lịch thi thành công', exam: updated });
    } catch (error) {
        console.error('Lỗi updateExam:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật lịch thi' });
    }
};

// Xóa lịch thi (Admin)
export const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.examSchedule.delete({ where: { id } });
        res.json({ message: 'Xóa lịch thi thành công' });
    } catch (error) {
        console.error('Lỗi deleteExam:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa lịch thi' });
    }
};
