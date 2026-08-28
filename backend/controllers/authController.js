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
                teacher: {
                    include: {
                        homeroomClasses: true,
                        subjects: true
                    }
                },
                student: {
                    include: {
                        class: {
                            include: {
                                homeroomTeacher: true
                            }
                        }
                    }
                }
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

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            name: profile ? profile.fullName : user.username,
            profileId: profile ? profile.id : null,
            phone: profile?.phone || '',
            // Student specific fields
            classId: user.student ? user.student.classId : null,
            className: user.student?.class?.className || null,
            studentCode: user.student ? user.student.studentCode : null,
            homeroomTeacher: user.student?.class?.homeroomTeacher ? user.student.class.homeroomTeacher.fullName : null,
            dateOfBirth: user.student?.dateOfBirth || null,
            gender: user.student?.gender || null,
            address: user.student?.address || null,
            parentName: user.student?.parentName || null,
            parentPhone: user.student?.parentPhone || null,
            // Teacher specific fields
            teacherCode: user.teacher ? user.teacher.teacherCode : null,
            specialization: user.teacher ? user.teacher.specialization : null,
            homeroomClasses: user.teacher ? user.teacher.homeroomClasses : [],
            subjects: user.teacher ? user.teacher.subjects : [],
            profileData: profile
        };

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: userData
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
                teacher: {
                    include: {
                        homeroomClasses: true,
                        subjects: true
                    }
                },
                student: {
                    include: {
                        class: {
                            include: {
                                homeroomTeacher: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
        }

        let profile = user.admin || user.teacher || user.student;

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            name: profile ? profile.fullName : user.username,
            profileId: profile ? profile.id : null,
            phone: profile?.phone || '',
            classId: user.student ? user.student.classId : null,
            className: user.student?.class?.className || null,
            studentCode: user.student ? user.student.studentCode : null,
            homeroomTeacher: user.student?.class?.homeroomTeacher ? user.student.class.homeroomTeacher.fullName : null,
            dateOfBirth: user.student?.dateOfBirth || null,
            gender: user.student?.gender || null,
            address: user.student?.address || null,
            parentName: user.student?.parentName || null,
            parentPhone: user.student?.parentPhone || null,
            teacherCode: user.teacher ? user.teacher.teacherCode : null,
            specialization: user.teacher ? user.teacher.specialization : null,
            homeroomClasses: user.teacher ? user.teacher.homeroomClasses : [],
            subjects: user.teacher ? user.teacher.subjects : [],
            profileData: profile
        };

        res.json({ 
            user: userData
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};
