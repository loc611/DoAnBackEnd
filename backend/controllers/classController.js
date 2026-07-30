import prisma from '../prismaClient.js';

export const getClasses = async (req, res) => {
    try {
        const classes = await prisma.class.findMany({
            include: {
                homeroomTeacher: true,
                _count: {
                    select: { students: true }
                }
            },
            orderBy: [
                { grade: 'asc' },
                { className: 'asc' }
            ]
        });

        const formatted = classes.map(c => ({
            ...c,
            studentCount: c._count.students,
            _count: undefined
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học' });
    }
};

export const getClassById = async (req, res) => {
    try {
        const classInfo = await prisma.class.findUnique({
            where: { id: req.params.id },
            include: {
                homeroomTeacher: true
            }
        });
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }
        res.json(classInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

export const createClass = async (req, res) => {
    try {
        const { className, grade, schoolYear, homeroomTeacherId } = req.body;

        const classExists = await prisma.class.findFirst({ where: { className } });
        if (classExists) {
            return res.status(400).json({ message: 'Tên lớp đã tồn tại' });
        }

        if (homeroomTeacherId) {
            const teacherAssigned = await prisma.class.findFirst({
                where: { homeroomTeacherId, academicYear: schoolYear }
            });
            if (teacherAssigned) {
                return res.status(400).json({ message: 'Giáo viên này đã chủ nhiệm một lớp khác trong năm học này' });
            }
        }

        const newClass = await prisma.class.create({
            data: {
                className,
                grade: parseInt(grade) || 10,
                academicYear: schoolYear || '2025-2026',
                homeroomTeacherId: homeroomTeacherId || null
            }
        });

        res.status(201).json({ message: 'Tạo lớp học thành công', class: newClass });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
};

export const updateClass = async (req, res) => {
    try {
        const classInfo = await prisma.class.findUnique({ where: { id: req.params.id } });
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        const { className, homeroomTeacherId, schoolYear } = req.body;

        if (homeroomTeacherId && homeroomTeacherId !== classInfo.homeroomTeacherId) {
            const teacherAssigned = await prisma.class.findFirst({
                where: { 
                    homeroomTeacherId, 
                    academicYear: schoolYear || classInfo.academicYear,
                    id: { not: classInfo.id }
                }
            });
            if (teacherAssigned) {
                return res.status(400).json({ message: 'Giáo viên này đã chủ nhiệm một lớp khác trong năm học này' });
            }
        }

        const updated = await prisma.class.update({
            where: { id: req.params.id },
            data: {
                className: className || undefined,
                homeroomTeacherId: homeroomTeacherId !== undefined ? homeroomTeacherId : undefined
            }
        });

        res.json({ message: 'Cập nhật thành công', class: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi cập nhật lớp học' });
    }
};

export const deleteClass = async (req, res) => {
    try {
        const classInfo = await prisma.class.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { students: true } } }
        });

        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        if (classInfo._count.students > 0) {
            return res.status(400).json({ message: 'Lớp học vẫn còn học sinh. Vui lòng chuyển hoặc xóa toàn bộ học sinh trước khi xóa lớp.' });
        }

        await prisma.class.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Đã xóa lớp học' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi xóa lớp học' });
    }
};

export const getStudentsInClass = async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            where: { classId: req.params.id },
            include: { user: { select: { email: true, status: true } } }
        });
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách học sinh' });
    }
};

export const addStudentsToClass = async (req, res) => {
    try {
        const { studentIds } = req.body;
        const classId = req.params.id;

        const classInfo = await prisma.class.findUnique({ where: { id: classId } });
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ message: 'Chưa chọn học sinh nào' });
        }

        await prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: { classId: classId }
        });

        res.json({ message: `Đã thêm ${studentIds.length} học sinh vào lớp` });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Lỗi khi gán học sinh' });
    }
};

export const removeStudentFromClass = async (req, res) => {
    try {
        const { id, studentId } = req.params;

        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.classId !== id) {
            return res.status(400).json({ message: 'Học sinh không thuộc lớp này' });
        }

        await prisma.student.update({
            where: { id: studentId },
            data: { classId: null }
        });

        res.json({ message: 'Đã xóa học sinh khỏi lớp' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Lỗi khi xóa học sinh khỏi lớp' });
    }
};
