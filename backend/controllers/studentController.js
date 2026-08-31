import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { 
    isValidPhoneNumber, 
    isValidStudentCode, 
    isPhoneTakenInSystem, 
    isStudentCodeTaken 
} from '../utils/validator.js';
import { autoAssignFeeProfilesForStudent } from '../utils/feeAutoAssign.js';

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
                class: { 
                    select: { 
                        id: true, 
                        className: true, 
                        grade: true, 
                        academicYear: true,
                        homeroomTeacher: { select: { fullName: true, phone: true } }
                    } 
                },
                grades: true,
                attendances: { orderBy: { date: 'desc' }, take: 10 },
                feeBills: { 
                    include: { feeProfile: true },
                    orderBy: { createdAt: 'desc' }
                }
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

const generateRandomStudentCode = () => `HS${Math.floor(100000 + Math.random() * 900000)}`;

export const createStudent = async (req, res) => {
    try {
        let { studentCode, fullName, gender, classId, phone, parentPhone } = req.body;

        // Chuẩn hóa và validate mã học sinh
        if (studentCode && studentCode.trim()) {
            studentCode = studentCode.trim().toUpperCase();
            if (!isValidStudentCode(studentCode)) {
                return res.status(400).json({ 
                    message: 'Mã học sinh không đúng định dạng (phải bắt đầu bằng HS và theo sau là các chữ số, VD: HS123456)' 
                });
            }
            const exists = await isStudentCodeTaken(prisma, studentCode);
            if (exists) {
                return res.status(400).json({ message: 'Mã học sinh đã tồn tại trong hệ thống' });
            }
        } else {
            let isUnique = false;
            while (!isUnique) {
                const testCode = generateRandomStudentCode();
                const exists = await prisma.student.findUnique({ where: { studentCode: testCode } });
                if (!exists) {
                    studentCode = testCode;
                    isUnique = true;
                }
            }
        }

        // Validate SĐT cá nhân học sinh (bắt buộc đúng 10 số bắt đầu bằng 0 & duy nhất toàn hệ thống)
        if (phone) {
            phone = String(phone).trim();
            if (!isValidPhoneNumber(phone)) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            const phoneExists = await isPhoneTakenInSystem(prisma, phone);
            if (phoneExists) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân này đã được sử dụng trong hệ thống' });
            }
        }

        // Validate SĐT phụ huynh (đúng 10 số bắt đầu bằng 0, cho phép trùng giữa các học sinh)
        if (parentPhone) {
            parentPhone = String(parentPhone).trim();
            if (!isValidPhoneNumber(parentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
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
                    fullName: fullName ? fullName.trim() : '',
                    gender: gender || 'Nam',
                    classId: classId || null,
                    phone: phone || null,
                    parentPhone: parentPhone || null
                }
            });
        });

        // Tự động gán học phí của lớp cho học sinh mới
        if (newStudent.classId) {
            await autoAssignFeeProfilesForStudent(newStudent.id, newStudent.classId);
        }

        res.status(201).json(newStudent);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi server khi tạo học sinh' });
    }
};

export const updateStudent = async (req, res) => {
    try {
        let { studentCode, fullName, gender, classId, phone, parentPhone, status } = req.body;

        const student = await prisma.student.findUnique({ 
            where: { id: req.params.id },
            include: { user: true }
        });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        // Validate mã học sinh nếu có thay đổi
        if (studentCode !== undefined && studentCode.trim()) {
            studentCode = studentCode.trim().toUpperCase();
            if (!isValidStudentCode(studentCode)) {
                return res.status(400).json({ 
                    message: 'Mã học sinh không đúng định dạng (phải bắt đầu bằng HS và theo sau là các chữ số, VD: HS123456)' 
                });
            }
            const codeTaken = await isStudentCodeTaken(prisma, studentCode, req.params.id);
            if (codeTaken) {
                return res.status(400).json({ message: 'Mã học sinh đã tồn tại ở học sinh khác' });
            }
        }

        // Validate số điện thoại cá nhân (định dạng + duy nhất toàn hệ thống)
        if (phone !== undefined && phone !== null && phone !== '') {
            phone = String(phone).trim();
            if (!isValidPhoneNumber(phone)) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            const phoneTaken = await isPhoneTakenInSystem(prisma, phone, {
                excludeStudentId: req.params.id,
                excludeUserId: student.userId
            });
            if (phoneTaken) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân này đã được sử dụng trong hệ thống' });
            }
        }

        // Validate SĐT phụ huynh nếu có
        if (parentPhone !== undefined && parentPhone !== null && parentPhone !== '') {
            parentPhone = String(parentPhone).trim();
            if (!isValidPhoneNumber(parentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
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
                    studentCode: studentCode || undefined,
                    fullName: fullName !== undefined ? fullName.trim() : undefined,
                    gender: gender || undefined,
                    classId: classId !== undefined ? (classId === '' ? null : classId) : undefined,
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined,
                    parentPhone: parentPhone !== undefined ? (parentPhone === '' ? null : parentPhone) : undefined
                },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                }
            });
        });

        // Nếu học sinh được xếp/chuyển vào lớp mới, tự động gán các khoản học phí của lớp đó
        if (updatedStudent.classId && updatedStudent.classId !== student.classId) {
            await autoAssignFeeProfilesForStudent(updatedStudent.id, updatedStudent.classId);
        }

        res.json(updatedStudent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Lỗi server khi cập nhật' });
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
