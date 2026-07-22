import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_for_dev_only');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
        }
        next();
    };
};
