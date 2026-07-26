import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Admin from './models/Admin.js';
import Teacher from './models/Teacher.js';
import Student from './models/Student.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Vui lòng thiết lập biến môi trường MONGO_URI trong file .env");
    process.exit(1);
}

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB Atlas for seeding');

        // Clear existing data
        await User.deleteMany({});
        await Admin.deleteMany({});
        await Teacher.deleteMany({});
        await Student.deleteMany({});
        console.log('Cleared existing data');

        // Create Master Admin
        const masterAdmin = new User({
            username: 'admin',
            email: 'admin@school.edu.vn',
            password: 'admin123',
            role: 'admin',
            status: 'active'
        });
        await masterAdmin.save();

        const adminProfile = new Admin({
            userId: masterAdmin._id,
            fullName: 'Super Admin',
            phone: '0988888888'
        });
        await adminProfile.save();
        
        masterAdmin.profileId = adminProfile._id;
        await masterAdmin.save();

        // Create Demo Teacher
        const demoTeacher = new User({
            username: 'gv001',
            email: 'teacher@school.edu.vn',
            password: 'teacher123',
            role: 'teacher',
            status: 'active'
        });
        await demoTeacher.save();

        const teacherProfile = new Teacher({
            userId: demoTeacher._id,
            teacherCode: 'GV001',
            fullName: 'Nguyễn Văn Giáo Viên',
            gender: 'Nam',
            subject: 'Toán Học',
            department: 'Tổ Toán - Tin',
            phone: '0977777777'
        });
        await teacherProfile.save();

        demoTeacher.profileId = teacherProfile._id;
        await demoTeacher.save();

        // Create Demo Student
        const demoStudent = new User({
            username: 'hs001',
            email: 'student@school.edu.vn',
            password: 'student123',
            role: 'student',
            status: 'active'
        });
        await demoStudent.save();

        const studentProfile = new Student({
            userId: demoStudent._id,
            studentCode: 'HS001',
            fullName: 'Trần Học Sinh',
            gender: 'Nam',
            classId: '10A1',
            phone: '0966666666',
            parentPhone: '0955555555'
        });
        await studentProfile.save();

        demoStudent.profileId = studentProfile._id;
        await demoStudent.save();

        console.log('Mock accounts created successfully!');
        process.exit();
    } catch (error) {
        console.error('Error with seed data:', error);
        process.exit(1);
    }
};

seedData();
