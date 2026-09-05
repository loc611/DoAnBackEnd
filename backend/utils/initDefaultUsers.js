import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

const DEFAULT_TEACHERS = [
    { username: 'gv001', email: 'gv001@school.edu.vn', teacherCode: 'GV001', fullName: 'Nguyễn Văn Giáo Viên', phone: '0977777771', specialization: 'Toán Học' },
    { username: 'gv002', email: 'gv002@school.edu.vn', teacherCode: 'GV002', fullName: 'Trần Thị Mai', phone: '0977777772', specialization: 'Ngữ Văn' },
    { username: 'gv003', email: 'gv003@school.edu.vn', teacherCode: 'GV003', fullName: 'Lê Hoàng Anh', phone: '0977777773', specialization: 'Tiếng Anh' },
    { username: 'gv004', email: 'gv004@school.edu.vn', teacherCode: 'GV004', fullName: 'Phạm Minh Đức', phone: '0977777774', specialization: 'Vật Lý' },
    { username: 'gv005', email: 'gv005@school.edu.vn', teacherCode: 'GV005', fullName: 'Hoàng Thu Trang', phone: '0977777775', specialization: 'Hóa Học' },
    { username: 'gv006', email: 'gv006@school.edu.vn', teacherCode: 'GV006', fullName: 'Vũ Thị Lan', phone: '0977777776', specialization: 'Sinh Học' },
    { username: 'gv007', email: 'gv007@school.edu.vn', teacherCode: 'GV007', fullName: 'Đỗ Thành Nam', phone: '0977777777', specialization: 'Lịch Sử' },
    { username: 'gv008', email: 'gv008@school.edu.vn', teacherCode: 'GV008', fullName: 'Bùi Thị Cúc', phone: '0977777778', specialization: 'Địa Lý' },
    { username: 'gv009', email: 'gv009@school.edu.vn', teacherCode: 'GV009', fullName: 'Ngô Quang Huy', phone: '0977777779', specialization: 'Tin Học' },
    { username: 'gv010', email: 'gv010@school.edu.vn', teacherCode: 'GV010', fullName: 'Nguyễn Thị Hằng', phone: '0977777780', specialization: 'Giáo Dục Công Dân' },
    { username: 'gv011', email: 'gv011@school.edu.vn', teacherCode: 'GV011', fullName: 'Đinh Quốc Bảo', phone: '0977777781', specialization: 'Giáo Dục Thể Chất' }
];

const DEFAULT_SUBJECTS = [
    { subjectCode: 'TOAN', name: 'Toán Học', grade: 0, periodsPerWeek: 4, credits: 4, type: 'Bắt buộc', teacherCode: 'GV001' },
    { subjectCode: 'VAN', name: 'Ngữ Văn', grade: 0, periodsPerWeek: 4, credits: 4, type: 'Bắt buộc', teacherCode: 'GV002' },
    { subjectCode: 'ANH', name: 'Tiếng Anh', grade: 0, periodsPerWeek: 3, credits: 3, type: 'Bắt buộc', teacherCode: 'GV003' },
    { subjectCode: 'VATLY', name: 'Vật Lý', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV004' },
    { subjectCode: 'HOAHOC', name: 'Hóa Học', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV005' },
    { subjectCode: 'SINHHOC', name: 'Sinh Học', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV006' },
    { subjectCode: 'LICHSU', name: 'Lịch Sử', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV007' },
    { subjectCode: 'DIALY', name: 'Địa Lý', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV008' },
    { subjectCode: 'TINHOC', name: 'Tin Học', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV009' },
    { subjectCode: 'GDCD', name: 'Giáo Dục Công Dân', grade: 0, periodsPerWeek: 1, credits: 1, type: 'Bắt buộc', teacherCode: 'GV010' },
    { subjectCode: 'THEDUC', name: 'Giáo Dục Thể Chất', grade: 0, periodsPerWeek: 2, credits: 2, type: 'Bắt buộc', teacherCode: 'GV011' },
    { subjectCode: 'QPAN', name: 'Giáo Dục Quốc Phòng - An Ninh', grade: 0, periodsPerWeek: 1, credits: 1, type: 'Bắt buộc', teacherCode: 'GV011' },
    { subjectCode: 'AMNHAC', name: 'Âm Nhạc & Nghệ Thuật', grade: 0, periodsPerWeek: 1, credits: 1, type: 'Tự chọn', teacherCode: 'GV002' }
];

export const initDefaultUsers = async () => {
    try {
        console.log('🔄 Checking default database seed (Admin, Teachers, Students, Subjects)...');

        // 1. Check Admin
        const adminUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: 'admin' },
                    { email: 'admin@school.edu.vn' }
                ]
            },
            include: { admin: true }
        });

        const adminPassHash = await bcrypt.hash('admin123', 10);

        if (!adminUser) {
            console.log('👑 Admin user not found. Creating default admin...');
            await prisma.$transaction(async (tx) => {
                const createdUser = await tx.user.create({
                    data: {
                        username: 'admin',
                        email: 'admin@school.edu.vn',
                        password: adminPassHash,
                        status: 'active'
                    }
                });
                await tx.admin.create({
                    data: {
                        userId: createdUser.id,
                        fullName: 'Super Admin',
                        phone: '0988888888'
                    }
                });
                const adminRole = await tx.role.findUnique({ where: { name: 'admin' } });
                if (adminRole) {
                    await tx.userRole.create({
                        data: { userId: createdUser.id, roleId: adminRole.id }
                    });
                }
            });
            console.log('✅ Default Admin created: admin / admin123 (or admin@school.edu.vn / admin123)');
        } else {
            if (!adminUser.admin) {
                await prisma.admin.create({
                    data: {
                        userId: adminUser.id,
                        fullName: 'Super Admin',
                        phone: '0988888888'
                    }
                });
            }
            await prisma.user.update({
                where: { id: adminUser.id },
                data: { 
                    password: adminPassHash,
                    role: 'admin',
                    status: 'active' 
                }
            });
            const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
            if (adminRole) {
                await prisma.userRole.upsert({
                    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
                    update: {},
                    create: { userId: adminUser.id, roleId: adminRole.id }
                });
            }
            console.log('✅ Admin account synced: admin / admin123');
        }

        // 2. Check Teachers
        const teacherPassHash = await bcrypt.hash('teacher123', 10);
        const teacherRole = await prisma.role.findUnique({ where: { name: 'subject_teacher' } }) ||
                            await prisma.role.findUnique({ where: { name: 'teacher' } });

        for (const teacherData of DEFAULT_TEACHERS) {
            const existingTeacher = await prisma.teacher.findFirst({
                where: {
                    OR: [
                        { teacherCode: teacherData.teacherCode },
                        { user: { username: teacherData.username } },
                        { user: { email: teacherData.email } },
                        { phone: teacherData.phone }
                    ]
                },
                include: { user: true }
            });

            if (!existingTeacher) {
                const existingUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { username: teacherData.username },
                            { email: teacherData.email }
                        ]
                    }
                });

                if (!existingUser) {
                    await prisma.$transaction(async (tx) => {
                        const createdUser = await tx.user.create({
                            data: {
                                username: teacherData.username,
                                email: teacherData.email,
                                password: teacherPassHash,
                                role: 'teacher',
                                status: 'active'
                            }
                        });
                        await tx.teacher.create({
                            data: {
                                userId: createdUser.id,
                                teacherCode: teacherData.teacherCode,
                                fullName: teacherData.fullName,
                                phone: teacherData.phone,
                                specialization: teacherData.specialization
                            }
                        });
                        if (teacherRole) {
                            await tx.userRole.create({
                                data: { userId: createdUser.id, roleId: teacherRole.id }
                            });
                        }
                    });
                    console.log(`✅ Default Teacher created: ${teacherData.teacherCode} - ${teacherData.fullName}`);
                }
            } else if (existingTeacher.user) {
                await prisma.user.update({
                    where: { id: existingTeacher.user.id },
                    data: {
                        password: teacherPassHash,
                        role: 'teacher',
                        status: 'active'
                    }
                });
                if (teacherRole) {
                    await prisma.userRole.upsert({
                        where: { userId_roleId: { userId: existingTeacher.user.id, roleId: teacherRole.id } },
                        update: {},
                        create: { userId: existingTeacher.user.id, roleId: teacherRole.id }
                    });
                }
            }
        }

        // 3. Check Student
        const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
        const studentUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: 'hs001' },
                    { email: 'hs001@school.edu.vn' },
                    { email: 'student@school.edu.vn' }
                ]
            },
            include: { student: true }
        });

        const studentPassHash = await bcrypt.hash('student123', 10);
        if (!studentUser) {
            await prisma.$transaction(async (tx) => {
                const createdUser = await tx.user.create({
                    data: {
                        username: 'hs001',
                        email: 'hs001@school.edu.vn',
                        password: studentPassHash,
                        role: 'student',
                        status: 'active'
                    }
                });
                await tx.student.create({
                    data: {
                        userId: createdUser.id,
                        studentCode: 'HS001',
                        fullName: 'Trần Học Sinh',
                        gender: 'Nam',
                        phone: '0955555555'
                    }
                });
                if (studentRole) {
                    await tx.userRole.create({
                        data: { userId: createdUser.id, roleId: studentRole.id }
                    });
                }
            });
            console.log('✅ Default Student created: hs001@school.edu.vn / student123');
        } else {
            await prisma.user.update({
                where: { id: studentUser.id },
                data: {
                    email: 'hs001@school.edu.vn',
                    password: studentPassHash,
                    role: 'student',
                    status: 'active'
                }
            });
            if (studentRole) {
                await prisma.userRole.upsert({
                    where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
                    update: {},
                    create: { userId: studentUser.id, roleId: studentRole.id }
                });
            }
        }

        // 4. Check Subjects
        for (const sub of DEFAULT_SUBJECTS) {
            const existingSub = await prisma.subject.findFirst({
                where: { subjectCode: { equals: sub.subjectCode, mode: 'insensitive' } }
            });

            if (!existingSub) {
                // Find assigned teacher if any
                let teacherId = null;
                if (sub.teacherCode) {
                    const teacher = await prisma.teacher.findFirst({
                        where: { teacherCode: { equals: sub.teacherCode, mode: 'insensitive' } }
                    });
                    if (teacher) {
                        teacherId = teacher.id;
                    }
                }

                await prisma.subject.create({
                    data: {
                        subjectCode: sub.subjectCode,
                        name: sub.name,
                        grade: sub.grade ?? 0,
                        periodsPerWeek: sub.periodsPerWeek ?? 2,
                        credits: sub.credits ?? 2,
                        type: sub.type,
                        teacherId: teacherId
                    }
                });
                console.log(`✅ Default Subject created: [${sub.subjectCode}] ${sub.name}`);
            }
        }

        console.log('✨ All default initial data checked & ready.');
    } catch (error) {
        console.error('⚠️ Warning: Failed to auto-initialize default data:', error.message);
    }
};
