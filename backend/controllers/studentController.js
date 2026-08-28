import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

export const getStudents = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            const student = await prisma.student.findFirst({
                where: { userId: req.user.id },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                }
            });
            return res.json(student ? [student] : []);
        }
        
        const students = await prisma.student.findMany({
            include: {
                user: { select: { email: true, status: true } },
                class: { select: { className: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách học sinh' });
    }
};

export const getStudentById = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { email: true, status: true, username: true } },
                class: { select: { className: true, grade: true, academicYear: true } },
                grades: true
            }
        });
        
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }
        
        res.json(student);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin học sinh' });
    }
};

export const createStudent = async (req, res) => {
    try {
        const { studentCode, fullName, gender, classId, phone, parentPhone } = req.body;

        const studentExists = await prisma.student.findUnique({ where: { studentCode } });
        if (studentExists) {
            return res.status(400).json({ message: 'Mã học sinh đã tồn tại' });
        }

        const username = studentCode.toLowerCase();
        const email = `${username}@school.edu.vn`;
        
        const userExists = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (userExists) {
            return res.status(400).json({ message: 'Tài khoản cho mã học sinh này đã tồn tại' });
        }

        const defaultPassword = req.body.password || `${studentCode}@123`;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newStudent = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role: 'student',
                    status: 'active'
                }
            });

            return await tx.student.create({
                data: {
                    userId: user.id,
                    studentCode,
                    fullName,
                    gender: gender || 'Nam',
                    classId: classId || null,
                    phone,
                    parentPhone
                }
            });
        });

        res.status(201).json(newStudent);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Lỗi server khi tạo học sinh' });
    }
};

export const updateStudent = async (req, res) => {
    try {
        const { fullName, gender, classId, phone, parentPhone, status } = req.body;

        const student = await prisma.student.findUnique({ 
            where: { id: req.params.id },
            include: { user: true }
        });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        const updatedStudent = await prisma.$transaction(async (tx) => {
            if (status && student.userId) {
                await tx.user.update({
                    where: { id: student.userId },
                    data: { status }
                });
            }

            return await tx.student.update({
                where: { id: req.params.id },
                data: {
                    fullName: fullName || undefined,
                    gender: gender || undefined,
                    classId: classId !== undefined ? (classId === '' ? null : classId) : undefined,
                    phone: phone !== undefined ? phone : undefined,
                    parentPhone: parentPhone || undefined
                },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                }
            });
        });

        res.json(updatedStudent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật' });
    }
};

export const deleteStudent = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { id: req.params.id } });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.student.delete({ where: { id: req.params.id } });
            if (student.userId) {
                await tx.user.delete({ where: { id: student.userId } });
            }
        });
        
        res.json({ message: 'Đã xoá học sinh' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi xoá' });
    }
};
