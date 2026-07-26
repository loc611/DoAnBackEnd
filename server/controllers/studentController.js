import Student from '../models/Student.js';
import User from '../models/User.js';

// @desc    Get all students
// @route   GET /api/students
// @access  Private
export const getStudents = async (req, res) => {
    try {
        // If user is a student, only return their own record
        if (req.user.role === 'student') {
            const student = await Student.findOne({ user: req.user.id }).populate('user', 'email');
            return res.json(student ? [student] : []);
        }
        
        // Admin and Teacher can see all
        const students = await Student.find({}).populate('user', 'email').sort({ createdAt: -1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách học sinh' });
    }
};

// @desc    Create a new student
// @route   POST /api/students
// @access  Private/Admin
export const createStudent = async (req, res) => {
    try {
        const { studentId, name, gender, dob, className, phone } = req.body;

        const studentExists = await Student.findOne({ studentId });
        if (studentExists) {
            return res.status(400).json({ message: 'Mã học sinh đã tồn tại' });
        }

        // 1. Create User account for the student
        // Default email format: studentId@school.edu.vn, password: student123
        const email = `${studentId.toLowerCase()}@school.edu.vn`;
        
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email tài khoản đã tồn tại' });
        }

        const user = await User.create({
            email,
            password: 'student123',
            name,
            role: 'student',
            phone
        });

        // 2. Create Student profile
        const student = await Student.create({
            user: user._id,
            studentId,
            name,
            gender,
            dob,
            className,
            phone
        });

        res.status(201).json(student);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi tạo học sinh' });
    }
};

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private/Admin
export const updateStudent = async (req, res) => {
    try {
        const { name, gender, dob, className, phone, status } = req.body;

        const student = await Student.findById(req.params.id);

        if (student) {
            student.name = name || student.name;
            student.gender = gender || student.gender;
            student.dob = dob || student.dob;
            student.className = className || student.className;
            student.phone = phone || student.phone;
            student.status = status || student.status;

            const updatedStudent = await student.save();
            
            // Sync name and phone to User model
            await User.findByIdAndUpdate(student.user, { name: updatedStudent.name, phone: updatedStudent.phone });

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
    try {
        const student = await Student.findById(req.params.id);

        if (student) {
            // Delete associated User account first
            await User.findByIdAndDelete(student.user);
            
            // Delete student profile
            await student.deleteOne();
            res.json({ message: 'Đã xoá học sinh' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi xoá' });
    }
};
