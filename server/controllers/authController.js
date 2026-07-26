import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email và mật khẩu' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey_for_dev_only',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};
