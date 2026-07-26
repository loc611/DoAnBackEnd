import mongoose from 'mongoose';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import bcrypt from 'bcryptjs';

// @desc    Get all users (with profiles)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        
        // Fetch profiles for all users
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            let profile = null;
            if (user.role === 'admin') profile = await Admin.findOne({ userId: user._id });
            else if (user.role === 'teacher') profile = await Teacher.findOne({ userId: user._id });
            else if (user.role === 'student') profile = await Student.findOne({ userId: user._id });

            return {
                ...user.toObject(),
                profile
            };
        }));

        res.json(enrichedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách tài khoản' });
    }
};

// @desc    Create a new user with profile
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { username, email, password, role, ...profileData } = req.body;

        // Check exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] }).session(session);
        if (userExists) {
            throw new Error('Email hoặc Username đã tồn tại');
        }

        // 1. Create User
        // Note: mongoose pre('save') hook handles password hashing, so we must use .save() or .create()
        // If we use .create([docs], {session}), it triggers the hook.
        const [newUser] = await User.create([{
            username,
            email,
            password,
            role,
            status: 'active'
        }], { session });

        let newProfile;
        
        // 2. Create corresponding Profile
        if (role === 'admin') {
            [newProfile] = await Admin.create([{
                userId: newUser._id,
                fullName: profileData.fullName,
                phone: profileData.phone
            }], { session });
        } else if (role === 'teacher') {
            [newProfile] = await Teacher.create([{
                userId: newUser._id,
                teacherCode: profileData.teacherCode,
                fullName: profileData.fullName,
                gender: profileData.gender || 'Nam',
                subject: profileData.subject,
                department: profileData.department,
                phone: profileData.phone
            }], { session });
        } else if (role === 'student') {
            [newProfile] = await Student.create([{
                userId: newUser._id,
                studentCode: profileData.studentCode,
                fullName: profileData.fullName,
                gender: profileData.gender || 'Nam',
                classId: profileData.classId || null,
                phone: profileData.phone,
                parentPhone: profileData.parentPhone
            }], { session });
        } else {
            throw new Error('Role không hợp lệ');
        }

        // Link profileId to user
        newUser.profileId = newProfile._id;
        await newUser.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ message: 'Tạo tài khoản thành công', user: newUser });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create User Error:', error);
        res.status(400).json({ message: error.message || 'Lỗi khi tạo tài khoản' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        const { fullName, phone, department, subject, classId, parentPhone, gender } = req.body;

        if (user.role === 'admin') {
            await Admin.findOneAndUpdate({ userId: user._id }, { fullName, phone });
        } else if (user.role === 'teacher') {
            await Teacher.findOneAndUpdate({ userId: user._id }, { fullName, phone, department, subject, gender });
        } else if (user.role === 'student') {
            await Student.findOneAndUpdate({ userId: user._id }, { fullName, phone, classId: classId || null, parentPhone, gender });
        }

        res.json({ message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi cập nhật tài khoản' });
    }
};

// @desc    Change user status (Lock/Unlock)
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
export const updateStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        user.status = req.body.status; // 'active' or 'inactive'
        await user.save();

        res.json({ message: `Đã ${user.status === 'active' ? 'mở khóa' : 'khóa'} tài khoản` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi đổi trạng thái' });
    }
};

// @desc    Reset password
// @route   PATCH /api/users/:id/reset-password
// @access  Private/Admin
export const resetPassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        user.password = password;
        await user.save(); // pre-save hook will hash it

        res.json({ message: 'Đã đặt lại mật khẩu' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu' });
    }
};

// @desc    Delete user and profile
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findById(req.params.id).session(session);
        if (!user) {
            throw new Error('Tài khoản không tồn tại');
        }

        if (user.role === 'admin') {
            await Admin.findOneAndDelete({ userId: user._id }).session(session);
        } else if (user.role === 'teacher') {
            await Teacher.findOneAndDelete({ userId: user._id }).session(session);
        } else if (user.role === 'student') {
            await Student.findOneAndDelete({ userId: user._id }).session(session);
        }

        await User.findByIdAndDelete(user._id).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Đã xóa tài khoản và hồ sơ liên quan' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi khi xóa tài khoản' });
    }
};
