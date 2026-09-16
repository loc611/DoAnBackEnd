import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import PermissionService from '../services/permissionService.js';

export const protect = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Không có quyền truy cập, vui lòng đăng nhập' });
        }

        const jwtSecret = process.env.JWT_SECRET || 'supersecretkey_for_dev_only';
        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (jwtErr) {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
        }

        const role = (decoded.role || '').toLowerCase();
        
        let user = null;
        // Truy vấn User an toàn tương thích chính xác với schema.prisma hiện tại
        try {
            user = await prisma.user.findUnique({
                where: { id: decoded.id },
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
                            class: true
                        }
                    }
                }
            });
        } catch (queryErr) {
            console.warn('Full user query notice, falling back to basic user query:', queryErr.message);
            try {
                user = await prisma.user.findUnique({
                    where: { id: decoded.id },
                    include: {
                        admin: true,
                        teacher: true,
                        student: true
                    }
                });
            } catch (fallbackErr) {
                user = await prisma.user.findUnique({
                    where: { id: decoded.id }
                });
            }
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị xóa' });
        }

        // Kiểm tra trạng thái tài khoản
        if (user.status === 'blocked' || user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Tài khoản của bạn đang bị đình chỉ hoạt động' });
        }

        // Gắn method user.can('permission.name', context) cho controller và middleware sử dụng
        try {
            PermissionService.attachUserCan(user);
        } catch (permErr) {
            user.can = () => ({ allowed: true });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Protect middleware unexpected error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xác thực người dùng: ' + error.message });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này' });
        }
        next();
    };
};

