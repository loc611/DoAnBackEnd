import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

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
        console.log('Cleared existing users');

        // Create Admin
        const admin = new User({
            email: 'admin@school.edu.vn',
            password: 'admin123',
            name: 'Quản trị viên',
            role: 'admin',
        });
        await admin.save();

        // Create Teacher
        const teacher = new User({
            email: 'teacher@school.edu.vn',
            password: 'teacher123',
            name: 'Nguyễn Văn Giáo Viên',
            role: 'teacher',
        });
        await teacher.save();

        // Create Student
        const student = new User({
            email: 'student@school.edu.vn',
            password: 'student123',
            name: 'Trần Học Sinh',
            role: 'student',
        });
        await student.save();

        console.log('Mock accounts created successfully!');
        process.exit();
    } catch (error) {
        console.error('Error with seed data:', error);
        process.exit(1);
    }
};

seedData();
