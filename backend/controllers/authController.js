import prisma from '../prismaClient.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email/username và mật khẩu' });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: email }
                ]
            },
            include: {
                admin: true,
                teacher: true,
                student: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Email/Username hoặc mật khẩu không đúng' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email/Username hoặc mật khẩu không đúng' });
        }

        let profile = user.admin || user.teacher || user.student;
        
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: profile ? profile.fullName : user.username,
                profileId: profile ? profile.id : null,
                classId: user.student ? user.student.classId : null,
                studentCode: user.student ? user.student.studentCode : null,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                admin: true,
                teacher: true,
                student: true
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
        }

        let profile = user.admin || user.teacher || user.student;

        res.json({ 
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: profile ? profile.fullName : user.username,
                profileData: profile
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};
