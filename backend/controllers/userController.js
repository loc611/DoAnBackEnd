import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

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

        const userExists = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });
        
        if (userExists) {
            return res.status(400).json({ message: 'Email hoặc Username đã tồn tại' });
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
                        fullName: profileData.fullName,
                        phone: profileData.phone
                    }
                });
            } else if (role === 'teacher') {
                await tx.teacher.create({
                    data: {
                        userId: user.id,
                        teacherCode: profileData.teacherCode,
                        fullName: profileData.fullName,
                        phone: profileData.phone,
                        specialization: profileData.subject
                    }
                });
            } else if (role === 'student') {
                await tx.student.create({
                    data: {
                        userId: user.id,
                        studentCode: profileData.studentCode,
                        fullName: profileData.fullName,
                        gender: profileData.gender || 'Nam',
                        classId: profileData.classId || null,
                        parentPhone: profileData.parentPhone
                    }
                });
            }

            return user;
        });

        res.status(201).json({ message: 'Tạo tài khoản thành công', user: newUser });
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(400).json({ message: 'Lỗi khi tạo tài khoản' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        const { fullName, phone, department, subject, classId, parentPhone, gender } = req.body;

        if (user.role === 'admin') {
            await prisma.admin.update({
                where: { userId: user.id },
                data: { fullName, phone }
            });
        } else if (user.role === 'teacher') {
            await prisma.teacher.update({
                where: { userId: user.id },
                data: { fullName, phone, specialization: subject }
            });
        } else if (user.role === 'student') {
            await prisma.student.update({
                where: { userId: user.id },
                data: { fullName, gender, classId: classId || null, parentPhone }
            });
        }

        res.json({ message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi cập nhật tài khoản' });
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

        // Prisma automatically handles cascading deletes if onDelete: Cascade is configured in schema.prisma.
        await prisma.user.delete({
            where: { id: user.id }
        });

        res.json({ message: 'Đã xóa tài khoản và hồ sơ liên quan' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Lỗi khi xóa tài khoản' });
    }
};
