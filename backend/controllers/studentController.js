import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import AuditLogService from '../services/auditLogService.js';
import { 
    isValidPhoneNumber, 
    isValidStudentCode, 
    isPhoneTakenInSystem, 
    isStudentCodeTaken 
} from '../utils/validator.js';
import { autoAssignFeeProfilesForStudent } from '../utils/feeAutoAssign.js';

export const getStudents = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();

        // 1. Học sinh: Chỉ xem thông tin của chính mình
        if (userRole === 'student') {
            const student = await prisma.student.findFirst({
                where: { userId: req.user.id },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { className: true, grade: true } }
                }
            });
            return res.json(student ? [student] : []);
        }

        // 2. Phụ huynh: Chỉ xem danh sách con em của mình
        if (userRole === 'parent') {
            const parent = await prisma.parent.findFirst({
                where: { userId: req.user.id },
                include: { guardianLinks: { select: { studentId: true } } }
            });
            const studentIds = parent ? parent.guardianLinks.map(l => l.studentId) : [];
            const students = await prisma.student.findMany({
                where: { id: { in: studentIds } },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                },
                orderBy: { fullName: 'asc' }
            });
            return res.json(students);
        }

        // 3. Giáo viên bộ môn & Chủ nhiệm: Chỉ xem học sinh thuộc các lớp mình phụ trách
        const isBgh = userRole === 'admin' || userRole === 'principal' || req.user.teacher?.position?.includes('Trưởng khoa') || req.user.teacher?.position?.includes('Ban giám hiệu');

        if (userRole === 'teacher' && !isBgh && req.user.teacher) {
            const teacherId = req.user.teacher.id;
            const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId }, select: { classId: true } });
            const homerooms = await prisma.homeroomAssignment.findMany({ where: { teacherId }, select: { classId: true } });
            const classIds = [...new Set([...assignments.map(a => a.classId), ...homerooms.map(h => h.classId)])];

            const students = await prisma.student.findMany({
                where: { classId: { in: classIds } },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                },
                orderBy: { studentCode: 'asc' }
            });
            return res.json(students);
        }
        
        // 4. BGH / Admin / Giám thị: Xem danh sách toàn trường
        const students = await prisma.student.findMany({
            include: {
                user: { select: { username: true, email: true, status: true } },
                class: { select: { className: true, grade: true } }
            },
            orderBy: { studentCode: 'asc' }
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
                guardianLinks: {
                    include: {
                        parent: true
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

        const userRole = (req.user?.role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'principal';

        // Kiểm tra chống IDOR:
        if (userRole === 'student' && student.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Học sinh chỉ được xem hồ sơ của chính mình' });
        }

        if (userRole === 'parent') {
            const isAuthorizedParent = student.guardianLinks.some(link => 
                link.parent?.userId === req.user.id && link.custodyType !== 'none'
            );
            if (!isAuthorizedParent && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hồ sơ của học sinh này' });
            }
        }

        // Lọc bớt thông tin tài chính nhạy cảm nếu người xem không phải Admin, Kế toán, hoặc Phụ huynh/Học sinh đó
        const canViewFinance = isAdmin || 
                               userRole === 'accountant' || 
                               userRole === 'office_staff' ||
                               (userRole === 'student' && student.userId === req.user.id) ||
                               (userRole === 'parent' && student.guardianLinks.some(l => l.parent?.userId === req.user.id && l.accessFinances));

        if (!canViewFinance) {
            delete student.feeBills;
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

        const defaultPassword = req.body.password || '1111';
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

            // Tự động liên kết vai trò student trong RBAC Scope
            const studentRole = await tx.role.findUnique({ where: { name: 'student' } });
            if (studentRole) {
                await tx.userRole.create({
                    data: { userId: user.id, roleId: studentRole.id }
                });
            }

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
        let { 
            studentCode, 
            fullName, 
            gender, 
            classId, 
            phone, 
            parentName,
            parentPhone, 
            status,
            dateOfBirth,
            academicYear,
            email 
        } = req.body;

        const student = await prisma.student.findUnique({ 
            where: { id: req.params.id },
            include: { user: true }
        });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        // Quy tắc bất biến: Tuyệt đối không cho phép sửa mã học sinh
        if (studentCode !== undefined && studentCode !== null && studentCode !== '') {
            const normalizedCode = String(studentCode).trim().toUpperCase();
            if (normalizedCode !== student.studentCode) {
                return res.status(400).json({ message: 'Mã học sinh là trường bất biến, không thể thay đổi' });
            }
        }
        const immutableStudentCode = student.studentCode;

        // Validate Email nếu có cập nhật
        if (email !== undefined && email !== null && email !== '' && student.userId) {
            email = String(email).trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Email không đúng định dạng' });
            }
            const emailExists = await prisma.user.findFirst({
                where: { email, NOT: { id: student.userId } }
            });
            if (emailExists) {
                return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác' });
            }
        }

        // Validate Trạng thái tài khoản nếu có
        const allowedStatuses = ['active', 'suspended', 'withdrawn', 'blocked', 'inactive'];
        if (status !== undefined && status !== null && status !== '') {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: 'Trạng thái tài khoản không hợp lệ' });
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

        // Validate SĐT phụ huynh (SĐT liên hệ khẩn cấp) nếu có
        if (parentPhone !== undefined && parentPhone !== null && parentPhone !== '') {
            parentPhone = String(parentPhone).trim();
            if (!isValidPhoneNumber(parentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh (liên hệ khẩn cấp) phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
        }

        // Validate Ngày sinh
        let parsedDob = undefined;
        if (dateOfBirth !== undefined) {
            if (dateOfBirth === '' || dateOfBirth === null) {
                parsedDob = null;
            } else {
                const d = new Date(dateOfBirth);
                if (isNaN(d.getTime())) {
                    return res.status(400).json({ message: 'Ngày sinh không hợp lệ' });
                }
                parsedDob = d;
            }
        }

        const updatedStudent = await prisma.$transaction(async (tx) => {
            if (student.userId) {
                const userUpdateData = {};
                if (status && status !== student.user?.status) userUpdateData.status = status;
                if (email && email !== student.user?.email) userUpdateData.email = email;
                if (Object.keys(userUpdateData).length > 0) {
                    await tx.user.update({
                        where: { id: student.userId },
                        data: userUpdateData
                    });
                }
            }

            return await tx.student.update({
                where: { id: req.params.id },
                data: {
                    studentCode: immutableStudentCode,
                    fullName: fullName !== undefined ? fullName.trim() : undefined,
                    gender: gender !== undefined ? gender : undefined,
                    dateOfBirth: parsedDob,
                    parentName: parentName !== undefined ? (parentName === '' ? null : parentName.trim()) : undefined,
                    parentPhone: parentPhone !== undefined ? (parentPhone === '' ? null : parentPhone) : undefined,
                    academicYear: academicYear !== undefined ? (academicYear === '' ? null : academicYear.trim()) : undefined,
                    classId: classId !== undefined ? (classId === '' ? null : classId) : undefined,
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined
                },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { className: true, grade: true } }
                }
            });
        });

        // Nếu học sinh được xếp/chuyển vào lớp mới, tự động gán các khoản học phí của lớp đó
        if (updatedStudent.classId && updatedStudent.classId !== student.classId) {
            await autoAssignFeeProfilesForStudent(updatedStudent.id, updatedStudent.classId);
        }

        res.json(updatedStudent);
    } catch (error) {
        console.error('Update Student Error:', error);
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
