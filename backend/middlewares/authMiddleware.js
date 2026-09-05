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
        const decoded = jwt.verify(token, jwtSecret);
        const role = (decoded.role || '').toLowerCase();
        
        // Tối ưu hóa truy vấn: Chỉ nạp quan hệ tương ứng với Role của người dùng để giảm thiểu SQL JOIN overhead
        const includeOptions = {
            userRoles: {
                include: { role: true }
            }
        };

        if (role.includes('teacher') || role === 'department_head') {
            includeOptions.teacher = {
                include: {
                    homeroomAssignments: true,
                    teacherAssignments: true
                }
            };
        } else if (role === 'student' || role === 'alumni') {
            includeOptions.student = {
                include: {
                    class: true,
                    guardianLinks: true
                }
            };
        } else if (role === 'parent') {
            includeOptions.parent = {
                include: {
                    guardianLinks: true
                }
            };
        } else if (role === 'admin' || role === 'it_admin' || role === 'principal' || role === 'vice_principal') {
            includeOptions.admin = true;
        } else {
            includeOptions.admin = true;
            includeOptions.teacher = true;
            includeOptions.student = true;
            includeOptions.parent = true;
        }

        let user = null;
        try {
            user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: includeOptions
            });
        } catch (queryErr) {
            // Fallback nếu có schema mismatch
            user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: {
                    admin: true,
                    teacher: true,
                    student: true,
                    parent: true
                }
            });
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
        PermissionService.attachUserCan(user);
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
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

