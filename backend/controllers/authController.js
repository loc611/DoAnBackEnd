import prisma from '../prismaClient.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// In-memory brute-force protection (5 attempts / 15 minutes)
const loginAttempts = new Map();

const getFailedAttempts = (key) => {
    const record = loginAttempts.get(key);
    if (!record) return { count: 0, lockUntil: 0 };
    if (Date.now() > record.lockUntil) {
        loginAttempts.delete(key);
        return { count: 0, lockUntil: 0 };
    }
    return record;
};

const recordFailedAttempt = (key) => {
    const record = getFailedAttempts(key);
    const newCount = record.count + 1;
    const lockUntil = newCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    loginAttempts.set(key, { count: newCount, lockUntil });
    return { count: newCount, lockUntil };
};

const clearFailedAttempts = (key) => {
    loginAttempts.delete(key);
};

/**
 * Đăng nhập an toàn - Loại bỏ 100% Backdoor
 */
export const login = async (req, res) => {
    try {
        let { email, username, identifier, password } = req.body;
        const loginIdentifier = String(email || username || identifier || '').trim();
        const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
        const rateLimitKey = `${clientIp}_${loginIdentifier.toLowerCase()}`;

        if (!loginIdentifier || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email/username và mật khẩu' });
        }

        // Kiểm tra cơ chế khóa tài khoản khi nhập sai liên tiếp
        const attemptRecord = getFailedAttempts(rateLimitKey);
        if (attemptRecord.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((attemptRecord.lockUntil - Date.now()) / (60 * 1000));
            return res.status(429).json({
                message: `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút để đảm bảo an toàn.`
            });
        }

        const inputPassword = String(password);

        // Tìm kiếm người dùng trong Database
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: loginIdentifier, mode: 'insensitive' } },
                    { username: { equals: loginIdentifier, mode: 'insensitive' } }
                ]
            },
            include: {
                admin: true,
                teacher: true,
                student: {
                    include: { class: true }
                },
                parent: true
            }
        });

        // Xác thực mật khẩu
        let isMatch = false;
        if (user && user.password) {
            isMatch = await bcrypt.compare(inputPassword, user.password);
        }

        if (!user || !isMatch) {
            const updatedAttempts = recordFailedAttempt(rateLimitKey);
            const remaining = Math.max(0, 5 - updatedAttempts.count);
            return res.status(401).json({
                message: 'Email/Username hoặc mật khẩu không chính xác',
                remainingAttempts: remaining > 0 ? remaining : 0
            });
        }

        // Reset bộ đếm thử sai khi đăng nhập thành công
        clearFailedAttempts(rateLimitKey);

        // Kiểm tra trạng thái tài khoản
        if (user.status === 'blocked' || user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị KHÓA bởi Quản trị viên. Vui lòng liên hệ nhà trường.' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Tài khoản của bạn đang trong thời gian ĐÌNH CHỈ hoạt động. Vui lòng liên hệ ban giám hiệu.' });
        }

        const profile = user.admin || user.teacher || user.student || user.parent;
        const primaryRole = user.role || (user.admin ? 'admin' : (user.teacher ? 'teacher' : 'student'));
        const jwtSecret = process.env.JWT_SECRET || 'supersecretkey_for_dev_only';
        
        // 1. Tạo Access Token ngắn hạn (15 phút)
        const accessToken = jwt.sign(
            { id: user.id, role: primaryRole },
            jwtSecret,
            { expiresIn: '15m' }
        );

        // 2. Tạo Refresh Token dài hạn (7 ngày) lưu trong Database
        const refreshTokenValue = crypto.randomBytes(40).toString('hex');
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await prisma.refreshToken.create({
            data: {
                token: refreshTokenValue,
                userId: user.id,
                expiresAt: refreshExpiresAt
            }
        });

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: primaryRole,
            status: user.status,
            name: profile ? profile.fullName : (primaryRole === 'admin' ? 'Super Admin' : user.username),
            profileId: profile ? profile.id : null,
            phone: profile?.phone || '',
            // Student fields
            classId: user.student ? user.student.classId : null,
            className: user.student?.class?.className || null,
            studentCode: user.student ? user.student.studentCode : null,
            // Teacher fields
            teacherCode: user.teacher ? user.teacher.teacherCode : null,
            specialization: user.teacher ? user.teacher.specialization : null,
            position: user.teacher ? user.teacher.position : null,
            profileData: profile
        };

        return res.json({
            message: 'Đăng nhập thành công',
            token: accessToken, // Tương thích ngược với frontend hiện có
            accessToken,
            refreshToken: refreshTokenValue,
            expiresIn: 15 * 60,
            user: userData
        });
    } catch (error) {
        console.error('Fatal Login error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập: ' + error.message });
    }
};

/**
 * Cấp lại Access Token mới bằng Refresh Token
 */
export const refreshTokenHandler = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Vui lòng cung cấp refresh token' });
        }

        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
        }

        const user = tokenRecord.user;
        if (!user || user.status === 'blocked' || user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản không hợp lệ hoặc đã bị khóa' });
        }

        const jwtSecret = process.env.JWT_SECRET || 'supersecretkey_for_dev_only';
        const newAccessToken = jwt.sign(
            { id: user.id, role: user.role },
            jwtSecret,
            { expiresIn: '15m' }
        );

        return res.json({
            accessToken: newAccessToken,
            token: newAccessToken,
            expiresIn: 15 * 60
        });
    } catch (error) {
        console.error('RefreshToken error:', error);
        return res.status(500).json({ message: 'Lỗi khi làm mới phiên đăng nhập' });
    }
};

/**
 * Đăng xuất an toàn - Thu hồi Refresh Token
 */
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { revoked: true }
            });
        }
        return res.json({ message: 'Đăng xuất thành công' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Lỗi khi đăng xuất' });
    }
};

/**
 * Đổi mật khẩu & Thu hồi toàn bộ Refresh Token của tài khoản
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedNewPassword }
            }),
            prisma.refreshToken.updateMany({
                where: { userId: user.id },
                data: { revoked: true }
            })
        ]);

        return res.json({ message: 'Đổi mật khẩu thành công. Các phiên đăng nhập cũ đã được thu hồi.' });
    } catch (error) {
        console.error('ChangePassword error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đổi mật khẩu' });
    }
};

/**
 * Lấy thông tin người dùng hiện tại
 */
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
                },
                parent: {
                    include: {
                        guardianLinks: {
                            include: {
                                student: {
                                    include: { class: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        if (user.status === 'blocked' || user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Tài khoản đang bị đình chỉ' });
        }

        const profile = user.admin || user.teacher || user.student || user.parent;

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
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
            position: user.teacher ? user.teacher.position : null,
            homeroomClasses: user.teacher ? user.teacher.homeroomClasses : [],
            subjects: user.teacher ? user.teacher.subjects : [],
            guardianStudents: user.parent?.guardianLinks?.map(l => ({
                studentId: l.studentId,
                studentCode: l.student.studentCode,
                fullName: l.student.fullName,
                className: l.student.class?.className || '',
                accessGrades: l.accessGrades,
                accessFinances: l.accessFinances
            })) || [],
            profileData: profile
        };

        res.json({ 
            user: userData
        });
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin người dùng' });
    }
};
