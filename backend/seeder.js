import prisma from './prismaClient.js';
import bcrypt from 'bcryptjs';

const seedData = async () => {
    try {
        console.log('Clearing existing data...');
        // Order matters due to foreign keys. Delete in reverse order of dependencies.
        await prisma.grade.deleteMany();
        await prisma.schedule.deleteMany();
        await prisma.notification.deleteMany();
        
        await prisma.student.deleteMany();
        await prisma.subject.deleteMany();
        await prisma.class.deleteMany();
        
        await prisma.admin.deleteMany();
        await prisma.teacher.deleteMany();
        await prisma.user.deleteMany();
        
        console.log('Creating Admin...');
        const adminPass = await bcrypt.hash('admin123', 10);
        await prisma.$transaction(async (tx) => {
            const adminUser = await tx.user.create({
                data: {
                    username: 'admin',
                    email: 'admin@school.edu.vn',
                    password: adminPass,
                    role: 'admin',
                    status: 'active'
                }
            });
            await tx.admin.create({
                data: {
                    userId: adminUser.id,
                    fullName: 'Super Admin',
                    phone: '0988888888'
                }
            });
        });

        console.log('Creating Teacher...');
        const teacherPass = await bcrypt.hash('teacher123', 10);
        await prisma.$transaction(async (tx) => {
            const teacherUser = await tx.user.create({
                data: {
                    username: 'gv001',
                    email: 'teacher@school.edu.vn',
                    password: teacherPass,
                    role: 'teacher',
                    status: 'active'
                }
            });
            await tx.teacher.create({
                data: {
                    userId: teacherUser.id,
                    teacherCode: 'GV001',
                    fullName: 'Nguyễn Văn Giáo Viên',
                    phone: '0977777777',
                    specialization: 'Toán Học'
                }
            });
        });

        console.log('Creating Student...');
        const studentPass = await bcrypt.hash('student123', 10);
        await prisma.$transaction(async (tx) => {
            const studentUser = await tx.user.create({
                data: {
                    username: 'hs001',
                    email: 'student@school.edu.vn',
                    password: studentPass,
                    role: 'student',
                    status: 'active'
                }
            });
            await tx.student.create({
                data: {
                    userId: studentUser.id,
                    studentCode: 'HS001',
                    fullName: 'Trần Học Sinh',
                    gender: 'Nam',
                    parentPhone: '0955555555'
                }
            });
        });

        console.log('Mock accounts created successfully! Login with admin/admin123');
        process.exit();
    } catch (error) {
        console.error('Error with seed data:', error);
        process.exit(1);
    }
};

seedData();
