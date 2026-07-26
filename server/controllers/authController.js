import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email/username và mật khẩu' });
        }

        // Allow login by email or username
        const user = await User.findOne({ 
            $or: [{ email: email }, { username: email }]
        });

        if (!user) {
            return res.status(401).json({ message: 'Email/Username hoặc mật khẩu không đúng' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email/Username hoặc mật khẩu không đúng' });
        }

        // Get Profile Data
        let profile = null;
        if (user.role === 'admin') {
            profile = await Admin.findOne({ userId: user._id });
        } else if (user.role === 'teacher') {
            profile = await Teacher.findOne({ userId: user._id });
        } else if (user.role === 'student') {
            profile = await Student.findOne({ userId: user._id });
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
                username: user.username,
                email: user.email,
                role: user.role,
                name: profile ? profile.fullName : user.username,
                profileId: profile ? profile._id : null
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

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
        }

        // Get Profile Data
        let profile = null;
        if (user.role === 'admin') {
            profile = await Admin.findOne({ userId: user._id });
        } else if (user.role === 'teacher') {
            profile = await Teacher.findOne({ userId: user._id });
        } else if (user.role === 'student') {
            profile = await Student.findOne({ userId: user._id });
        }

        res.json({ 
            user: {
                id: user._id,
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
