import mongoose from 'mongoose';
import Class from '../models/Class.js';
import Student from '../models/Student.js';

// @desc    Lấy danh sách tất cả lớp học
// @route   GET /api/classes
export const getClasses = async (req, res) => {
    try {
        const classes = await Class.find()
            .populate('homeroomTeacher', 'fullName teacherCode phone')
            .sort({ grade: 1, className: 1 });
        res.json(classes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học' });
    }
};

// @desc    Lấy chi tiết 1 lớp học
// @route   GET /api/classes/:id
export const getClassById = async (req, res) => {
    try {
        const classInfo = await Class.findById(req.params.id)
            .populate('homeroomTeacher', 'fullName teacherCode phone email');
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }
        res.json(classInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Thêm lớp học mới
// @route   POST /api/classes
export const createClass = async (req, res) => {
    try {
        const { classCode, className, grade, schoolYear, homeroomTeacher, description, status } = req.body;

        const classExists = await Class.findOne({ classCode });
        if (classExists) {
            return res.status(400).json({ message: 'Mã lớp đã tồn tại' });
        }

        // Optional: Check if homeroomTeacher is already assigned to another class
        if (homeroomTeacher) {
            const teacherAssigned = await Class.findOne({ homeroomTeacher, schoolYear });
            if (teacherAssigned) {
                return res.status(400).json({ message: 'Giáo viên này đã chủ nhiệm một lớp khác trong năm học này' });
            }
        }

        const newClass = await Class.create({
            classCode,
            className,
            grade,
            schoolYear,
            homeroomTeacher: homeroomTeacher || null,
            description,
            status,
            studentCount: 0
        });

        res.status(201).json({ message: 'Tạo lớp học thành công', class: newClass });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
};

// @desc    Cập nhật lớp học
// @route   PUT /api/classes/:id
export const updateClass = async (req, res) => {
    try {
        const classInfo = await Class.findById(req.params.id);
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        const { className, homeroomTeacher, description, status } = req.body;

        if (homeroomTeacher && homeroomTeacher !== classInfo.homeroomTeacher?.toString()) {
            const teacherAssigned = await Class.findOne({ homeroomTeacher, schoolYear: classInfo.schoolYear, _id: { $ne: classInfo._id } });
            if (teacherAssigned) {
                return res.status(400).json({ message: 'Giáo viên này đã chủ nhiệm một lớp khác trong năm học này' });
            }
        }

        classInfo.className = className || classInfo.className;
        classInfo.homeroomTeacher = homeroomTeacher || null;
        classInfo.description = description;
        classInfo.status = status || classInfo.status;

        await classInfo.save();
        res.json({ message: 'Cập nhật thành công', class: classInfo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi cập nhật lớp học' });
    }
};

// @desc    Xóa lớp học
// @route   DELETE /api/classes/:id
export const deleteClass = async (req, res) => {
    try {
        const classInfo = await Class.findById(req.params.id);
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        if (classInfo.studentCount > 0) {
            return res.status(400).json({ message: 'Lớp học vẫn còn học sinh. Vui lòng chuyển hoặc xóa toàn bộ học sinh trước khi xóa lớp.' });
        }

        await Class.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã xóa lớp học' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi xóa lớp học' });
    }
};

// @desc    Lấy danh sách học sinh trong lớp
// @route   GET /api/classes/:id/students
export const getStudentsInClass = async (req, res) => {
    try {
        const students = await Student.find({ classId: req.params.id }).populate('userId', 'email status');
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách học sinh' });
    }
};

// @desc    Thêm học sinh vào lớp (có thể chọn nhiều)
// @route   POST /api/classes/:id/students
export const addStudentsToClass = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { studentIds } = req.body; // Array of student _id
        const classId = req.params.id;

        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
            throw new Error('Không tìm thấy lớp học');
        }

        if (!studentIds || studentIds.length === 0) {
            throw new Error('Chưa chọn học sinh nào');
        }

        // We need to decrease the count of the previous classes for these students
        const studentsToUpdate = await Student.find({ _id: { $in: studentIds } }).session(session);
        
        for (const student of studentsToUpdate) {
            if (student.classId && student.classId.toString() !== classId) {
                await Class.findByIdAndUpdate(student.classId, { $inc: { studentCount: -1 } }, { session });
            }
        }

        // Update students to new class
        const result = await Student.updateMany(
            { _id: { $in: studentIds } },
            { $set: { classId: classId } },
            { session }
        );

        // Update the new class studentCount
        const currentCount = await Student.countDocuments({ classId: classId }).session(session);
        // Wait, since we are in transaction, countDocuments might not reflect updateMany instantly depending on write concern, 
        // but it's safer to just increment or explicitly recount.
        // Let's just do an inc for the ones that actually changed (who were not already in this class)
        
        // Let's recount safely
        classInfo.studentCount = await Student.countDocuments({ classId: classId }).session(session);
        await classInfo.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: `Đã thêm ${studentIds.length} học sinh vào lớp` });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi khi gán học sinh' });
    }
};

// @desc    Xóa/Chuyển học sinh khỏi lớp
// @route   DELETE /api/classes/:id/students/:studentId
export const removeStudentFromClass = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id, studentId } = req.params;

        const student = await Student.findById(studentId).session(session);
        if (!student || student.classId?.toString() !== id) {
            throw new Error('Học sinh không thuộc lớp này');
        }

        student.classId = null;
        await student.save({ session });

        const classInfo = await Class.findById(id).session(session);
        classInfo.studentCount = Math.max(0, classInfo.studentCount - 1);
        await classInfo.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Đã xóa học sinh khỏi lớp' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi khi xóa học sinh khỏi lớp' });
    }
};
