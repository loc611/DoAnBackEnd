import Student from '../models/Student.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Get all students
// @route   GET /api/students
// @access  Private
export const getStudents = async (req, res) => {
    try {
        // If user is a student, only return their own record
        if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.id })
                .populate('userId', 'email status')
                .populate('classId', 'className');
            return res.json(student ? [student] : []);
        }
        
        // Admin and Teacher can see all
        const students = await Student.find({})
            .populate('userId', 'email status')
            .populate('classId', 'className')
            .sort({ createdAt: -1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách học sinh' });
    }
};

// @desc    Create a new student
// @route   POST /api/students
// @access  Private/Admin
export const createStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { studentCode, fullName, gender, classId, phone, parentPhone } = req.body;

        const studentExists = await Student.findOne({ studentCode }).session(session);
        if (studentExists) {
            throw new Error('Mã học sinh đã tồn tại');
        }

        // Generate email/username based on studentCode
        const username = studentCode.toLowerCase();
        const email = `${username}@school.edu.vn`;
        
        const userExists = await User.findOne({ $or: [{ email }, { username }] }).session(session);
        if (userExists) {
            throw new Error('Tài khoản cho mã học sinh này đã tồn tại');
        }

        const newUser = await User.create([{
            username,
            email,
            password: 'student123',
            role: 'student',
            status: 'active'
        }], { session });

        const newStudent = await Student.create([{
            userId: newUser[0]._id,
            studentCode,
            fullName,
            gender: gender || 'Nam',
            classId: classId || null,
            phone,
            parentPhone
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(newStudent[0]);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi server khi tạo học sinh' });
    }
};

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private/Admin
export const updateStudent = async (req, res) => {
    try {
        const { fullName, gender, classId, phone, parentPhone } = req.body;

        const student = await Student.findById(req.params.id);

        if (student) {
            student.fullName = fullName || student.fullName;
            student.gender = gender || student.gender;
            student.classId = classId || student.classId;
            student.phone = phone || student.phone;
            student.parentPhone = parentPhone || student.parentPhone;

            const updatedStudent = await student.save();
            res.json(updatedStudent);
        } else {
            res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật' });
    }
};

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/Admin
export const deleteStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const student = await Student.findById(req.params.id).session(session);

        if (student) {
            // Delete associated User account
            if (student.userId) {
                await User.findByIdAndDelete(student.userId).session(session);
            }
            
            // Delete student profile
            await Student.findByIdAndDelete(student._id).session(session);
            
            await session.commitTransaction();
            session.endSession();
            res.json({ message: 'Đã xoá học sinh' });
        } else {
            throw new Error('Không tìm thấy học sinh');
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message || 'Lỗi server khi xoá' });
    }
};
