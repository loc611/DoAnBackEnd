import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import PermissionService from '../services/permissionService.js';

let cachedSettings = { maintenanceMode: false, lastFetched: 0 };

const isMaintenanceActive = async () => {
    const now = Date.now();
    if (now - cachedSettings.lastFetched > 15000) { // Cache 15 giây
        try {
            const s = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' }, select: { maintenanceMode: true } });
            if (s) {
                cachedSettings = { maintenanceMode: !!s.maintenanceMode, lastFetched: now };
            }
        } catch (e) {
            // Ignore DB error
        }
    }
    return cachedSettings.maintenanceMode;
};

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
        
        // Tối ưu hóa truy vấn: Chỉ nạp quan hệ tương ứng với Role của người dùng
        const includeOptions = {
            userRoles: {
                include: { role: true }
            }
        };

        if (role.includes('teacher') || role === 'department_head') {
            includeOptions.teacher = {
                include: {
                    homeroomAssignments: true,
                    teacherAssignments: {
                        include: {
                            subject: true,
                            class: true
                        }
                    }
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
                    guardianLinks: {
                        include: {
                            student: {
                                include: { class: true }
                            }
                        }
                    }
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

        // Kiểm tra Chế độ Bảo trì (Maintenance Mode)
        const inMaintenance = await isMaintenanceActive();
        const isAdmin = user.role === 'admin' || user.role === 'principal' || user.role === 'it_admin';
        if (inMaintenance && !isAdmin) {
            return res.status(503).json({ 
                success: false, 
                message: 'Hệ thống đang trong thời gian bảo trì kỹ thuật theo kế hoạch của nhà trường. Vui lòng quay lại sau.' 
            });
        }

        // Gắn method user.can('permission.name', context) cho controller và middleware sử dụng
        PermissionService.attachUserCan(user);
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn. Vui lòng làm mới token.' });
        }
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập' });
        }
        
        const userRole = (req.user.role || '').toLowerCase();
        const normalizedRoles = roles.map(r => r.toLowerCase());

        // Admin luôn có quyền truy cập các route cơ bản
        if (userRole === 'admin' || userRole === 'principal') {
            return next();
        }

        // Kiểm tra role chính hoặc các role phụ trong userRoles
        const hasMainRole = normalizedRoles.includes(userRole);
        const hasUserRole = req.user.userRoles?.some(ur => normalizedRoles.includes(ur.role?.name?.toLowerCase()));

        if (!hasMainRole && !hasUserRole) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không có quyền thực hiện hành động này (Cần vai trò: ' + roles.join(', ') + ')' 
            });
        }
        next();
    };
};
