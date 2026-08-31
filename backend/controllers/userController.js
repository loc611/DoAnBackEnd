import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { 
    isValidPhoneNumber, 
    isValidStudentCode, 
    isValidTeacherCode, 
    isPhoneTakenInSystem, 
    isStudentCodeTaken, 
    isTeacherCodeTaken 
} from '../utils/validator.js';
import { autoAssignFeeProfilesForStudent } from '../utils/feeAutoAssign.js';

export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                admin: true,
                teacher: true,
                student: true
            }
        });

        const enrichedUsers = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            let profile = null;
            if (user.role === 'admin') profile = user.admin;
            else if (user.role === 'teacher') profile = user.teacher;
            else if (user.role === 'student') profile = user.student;

            return {
                ...userWithoutPassword,
                profile
            };
        });

        res.json(enrichedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách tài khoản' });
    }
};

export const createUser = async (req, res) => {
    try {
        const { username, email, password, role, ...profileData } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        // Validate SĐT cá nhân (bắt buộc đúng 10 số & duy nhất toàn hệ thống)
        if (profileData.phone) {
            const cleanPhone = String(profileData.phone).trim();
            if (!isValidPhoneNumber(cleanPhone)) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            const phoneExists = await isPhoneTakenInSystem(prisma, cleanPhone);
            if (phoneExists) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân này đã được sử dụng trong hệ thống' });
            }
            profileData.phone = cleanPhone;
        }

        // Validate SĐT phụ huynh đối với học sinh
        if (role === 'student' && profileData.parentPhone) {
            const cleanParentPhone = String(profileData.parentPhone).trim();
            if (!isValidPhoneNumber(cleanParentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            profileData.parentPhone = cleanParentPhone;
        }

        const userExists = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });
        
        if (userExists) {
            return res.status(400).json({ message: 'Email hoặc Username đã tồn tại' });
        }

        // Validate mã giáo viên / mã học sinh
        if (role === 'teacher' && profileData.teacherCode && profileData.teacherCode.trim()) {
            profileData.teacherCode = profileData.teacherCode.trim().toUpperCase();
            if (!isValidTeacherCode(profileData.teacherCode)) {
                return res.status(400).json({ 
                    message: 'Mã giáo viên không đúng định dạng (phải bắt đầu bằng GV và theo sau là các chữ số, VD: GV123456)' 
                });
            }
            const exists = await isTeacherCodeTaken(prisma, profileData.teacherCode);
            if (exists) {
                return res.status(400).json({ message: 'Mã giáo viên đã tồn tại trong hệ thống' });
            }
        }

        if (role === 'student' && profileData.studentCode && profileData.studentCode.trim()) {
            profileData.studentCode = profileData.studentCode.trim().toUpperCase();
            if (!isValidStudentCode(profileData.studentCode)) {
                return res.status(400).json({ 
                    message: 'Mã học sinh không đúng định dạng (phải bắt đầu bằng HS và theo sau là các chữ số, VD: HS123456)' 
                });
            }
            const exists = await isStudentCodeTaken(prisma, profileData.studentCode);
            if (exists) {
                return res.status(400).json({ message: 'Mã học sinh đã tồn tại trong hệ thống' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role,
                    status: 'active'
                }
            });

            if (role === 'admin') {
                await tx.admin.create({
                    data: {
                        userId: user.id,
                        fullName: profileData.fullName ? profileData.fullName.trim() : '',
                        phone: profileData.phone || null
                    }
                });
            } else if (role === 'teacher') {
                let code = profileData.teacherCode;
                if (!code) {
                    let isUnique = false;
                    while (!isUnique) {
                        const testCode = `GV${Math.floor(100000 + Math.random() * 900000)}`;
                        const exists = await tx.teacher.findUnique({ where: { teacherCode: testCode } });
                        if (!exists) {
                            code = testCode;
                            isUnique = true;
                        }
                    }
                }
                await tx.teacher.create({
                    data: {
                        userId: user.id,
                        teacherCode: code,
                        fullName: profileData.fullName ? profileData.fullName.trim() : '',
                        phone: profileData.phone || null,
                        specialization: profileData.subject || null
                    }
                });
            } else if (role === 'student') {
                let code = profileData.studentCode;
                if (!code) {
                    let isUnique = false;
                    while (!isUnique) {
                        const testCode = `HS${Math.floor(100000 + Math.random() * 900000)}`;
                        const exists = await tx.student.findUnique({ where: { studentCode: testCode } });
                        if (!exists) {
                            code = testCode;
                            isUnique = true;
                        }
                    }
                }
                const createdStudent = await tx.student.create({
                    data: {
                        userId: user.id,
                        studentCode: code,
                        fullName: profileData.fullName ? profileData.fullName.trim() : '',
                        phone: profileData.phone || null,
                        gender: profileData.gender || 'Nam',
                        classId: profileData.classId || null,
                        parentPhone: profileData.parentPhone || null
                    }
                });
                if (createdStudent.classId) {
                    // Sẽ chạy sau transaction
                }
            }

            return user;
        });

        if (newUser.role === 'student') {
            const student = await prisma.student.findUnique({ where: { userId: newUser.id } });
            if (student && student.classId) {
                await autoAssignFeeProfilesForStudent(student.id, student.classId);
            }
        }

        res.status(201).json({ message: 'Tạo tài khoản thành công', user: newUser });
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(400).json({ message: error.message || 'Lỗi khi tạo tài khoản' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        let { fullName, phone, department, subject, classId, parentPhone, gender } = req.body;

        if (phone !== undefined && phone !== null && phone !== '') {
            phone = String(phone).trim();
            if (!isValidPhoneNumber(phone)) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            const phoneExists = await isPhoneTakenInSystem(prisma, phone, { excludeUserId: user.id });
            if (phoneExists) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân này đã được sử dụng trong hệ thống' });
            }
        }

        if (user.role === 'student' && parentPhone !== undefined && parentPhone !== null && parentPhone !== '') {
            parentPhone = String(parentPhone).trim();
            if (!isValidPhoneNumber(parentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
        }

        if (user.role === 'admin') {
            await prisma.admin.update({
                where: { userId: user.id },
                data: { 
                    fullName: fullName !== undefined ? fullName.trim() : undefined, 
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined 
                }
            });
        } else if (user.role === 'teacher') {
            await prisma.teacher.update({
                where: { userId: user.id },
                data: { 
                    fullName: fullName !== undefined ? fullName.trim() : undefined, 
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined, 
                    specialization: subject 
                }
            });
        } else if (user.role === 'student') {
            const oldStudent = await prisma.student.findUnique({ where: { userId: user.id } });
            const updatedStudent = await prisma.student.update({
                where: { userId: user.id },
                data: { 
                    fullName: fullName !== undefined ? fullName.trim() : undefined, 
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined, 
                    gender: gender || undefined, 
                    classId: classId !== undefined ? (classId === '' ? null : classId) : undefined, 
                    parentPhone: parentPhone !== undefined ? (parentPhone === '' ? null : parentPhone) : undefined 
                }
            });

            if (updatedStudent.classId && updatedStudent.classId !== oldStudent?.classId) {
                await autoAssignFeeProfilesForStudent(updatedStudent.id, updatedStudent.classId);
            }
        }

        res.json({ message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Lỗi khi cập nhật tài khoản' });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        const updatedUser = await prisma.user.update({
            where: { id: req.params.id },
            data: { status: req.body.status }
        });

        res.json({ message: `Đã ${updatedUser.status === 'active' ? 'mở khóa' : 'khóa'} tài khoản` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi đổi trạng thái' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: req.params.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Đã đặt lại mật khẩu' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({ message: 'Tài khoản không tồn tại' });
        }
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Không thể tự xóa tài khoản của chính mình' });
        }

        await prisma.user.delete({
            where: { id: user.id }
        });

        res.json({ message: 'Đã xóa tài khoản và hồ sơ liên quan' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Lỗi khi xóa tài khoản' });
    }
};
