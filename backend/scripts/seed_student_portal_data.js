import prisma from '../prismaClient.js';

async function seedStudentPortalData() {
    try {
        console.log('🌱 Seeding Student Portal demo data...');

        // 1. Tìm hoặc tạo lớp 10A1
        let class10A1 = await prisma.class.findFirst({
            where: { className: '10A1' }
        });

        const teacherMai = await prisma.teacher.findFirst({
            where: { teacherCode: 'GV002' }
        });

        if (!class10A1) {
            class10A1 = await prisma.class.create({
                data: {
                    className: '10A1',
                    grade: 10,
                    academicYear: '2026-2027',
                    homeroomTeacherId: teacherMai?.id || null,
                    status: 'active'
                }
            });
            console.log('✅ Created class 10A1');
        }

        // 2. Tìm học sinh hs001
        const studentUser = await prisma.user.findFirst({
            where: { email: 'hs001@school.edu.vn' },
            include: { student: true }
        });

        if (studentUser?.student) {
            const studentId = studentUser.student.id;

            // Gán vào lớp 10A1 và cập nhật hồ sơ chi tiết
            await prisma.student.update({
                where: { id: studentId },
                data: {
                    classId: class10A1.id,
                    address: 'Số 45 Đường Hoa Sen, Phường Bến Nghé, Quận 1, TP.HCM',
                    dateOfBirth: new Date('2010-05-15'),
                    parentName: 'Trần Văn Phụ Huynh',
                    parentPhone: '0912345678',
                    phone: '0987654321',
                    email: 'hs001@school.edu.vn'
                }
            });
            console.log('✅ Assigned student hs001 to class 10A1 with profile info');

            // 3. Tạo Tổ hợp môn mẫu khối 10
            const combinations = [
                {
                    code: 'KHTN-01',
                    name: 'KHTN 1 (Định hướng Kỹ thuật & Công nghệ)',
                    description: 'Toán học nâng cao, Vật lý, Hóa học, Tin học ứng dụng.',
                    subjectsList: ['Vật lý', 'Hóa học', 'Sinh học', 'Tin học'],
                    capacity: 45,
                    gradeLevel: 10,
                    academicYear: '2026-2027',
                    isOpen: true
                },
                {
                    code: 'KHTN-02',
                    name: 'KHTN 2 (Định hướng Y Dược & Khoa học Sự sống)',
                    description: 'Toán học, Hóa học, Sinh học nâng cao, Công nghệ sinh học.',
                    subjectsList: ['Hóa học', 'Sinh học', 'Vật lý', 'Công nghệ'],
                    capacity: 45,
                    gradeLevel: 10,
                    academicYear: '2026-2027',
                    isOpen: true
                },
                {
                    code: 'KHXH-01',
                    name: 'KHXH 1 (Định hướng Kinh tế & Luật)',
                    description: 'Ngữ văn nâng cao, Lịch sử, Địa lý, Giáo dục Kinh tế & Pháp luật.',
                    subjectsList: ['Lịch sử', 'Địa lý', 'GDKT&PL', 'Tiếng Anh'],
                    capacity: 45,
                    gradeLevel: 10,
                    academicYear: '2026-2027',
                    isOpen: true
                },
                {
                    code: 'KHXH-02',
                    name: 'KHXH 2 (Định hướng Truyền thông & Nghệ thuật)',
                    description: 'Ngữ văn, Tiếng Anh chuyên đề, Âm nhạc & Mỹ thuật.',
                    subjectsList: ['Lịch sử', 'Địa lý', 'Âm nhạc', 'Mỹ thuật'],
                    capacity: 45,
                    gradeLevel: 10,
                    academicYear: '2026-2027',
                    isOpen: true
                }
            ];

            const createdCombs = [];
            for (const c of combinations) {
                const existing = await prisma.subjectCombination.findUnique({
                    where: { code: c.code }
                });
                if (!existing) {
                    const comb = await prisma.subjectCombination.create({ data: c });
                    createdCombs.push(comb);
                } else {
                    createdCombs.push(existing);
                }
            }
            console.log('✅ Checked SubjectCombinations');

            // 4. Tạo SubjectGradeDetail cho các môn
            const subjects = await prisma.subject.findMany();
            for (const sub of subjects) {
                const subCode = sub.subjectCode.toUpperCase();
                let regScores = [8.0, 8.5];
                let midScore = 8.0;
                let finScore = 8.5;
                let isTrans = false;
                let note = null;

                if (subCode === 'VATLY') {
                    isTrans = true;
                    note = 'Điểm chuyển tiếp từ THPT Chuyên (HK1)';
                    regScores = [9.0, 9.5];
                    midScore = 9.0;
                    finScore = 9.0;
                }

                const avg = +((regScores[0] + regScores[1] + midScore * 2 + finScore * 3) / 7).toFixed(1);

                await prisma.subjectGradeDetail.upsert({
                    where: {
                        studentId_subjectId_semester: {
                            studentId,
                            subjectId: sub.id,
                            semester: 'HK1_2026'
                        }
                    },
                    update: {
                        regularScores: regScores,
                        midtermScore: midScore,
                        finalScore: finScore,
                        averageScore: avg,
                        isTransferred: isTrans,
                        transferredNote: note
                    },
                    create: {
                        studentId,
                        subjectId: sub.id,
                        semester: 'HK1_2026',
                        regularScores: regScores,
                        midtermScore: midScore,
                        finalScore: finScore,
                        averageScore: avg,
                        isTransferred: isTrans,
                        transferredNote: note
                    }
                });
            }
            console.log('✅ Upserted SubjectGradeDetails for hs001');

            // 5. Tạo điểm chuyển tiếp TransferredGrade
            await prisma.transferredGrade.upsert({
                where: {
                    studentId_subjectName_semester: {
                        studentId,
                        subjectName: 'Vật Lý',
                        semester: 'HK1'
                    }
                },
                update: {},
                create: {
                    studentId,
                    subjectName: 'Vật Lý',
                    semester: 'HK1',
                    finalScore: 9.0,
                    academicYear: '2026-2027'
                }
            });

            // 6. Tạo lịch sử chuyên cần phong phú
            const baseDate = new Date();
            for (let i = 1; i <= 25; i++) {
                const curDate = new Date(baseDate);
                curDate.setDate(curDate.getDate() - i);
                curDate.setHours(0, 0, 0, 0);

                if (curDate.getDay() === 0) continue; // bỏ CN

                let status = 'present';
                let note = null;
                if (i === 3) {
                    status = 'excused';
                    note = 'Nghỉ ốm có đơn phép';
                } else if (i === 8) {
                    status = 'late';
                    note = 'Đi muộn 10 phút do hỏng xe';
                } else if (i === 15) {
                    status = 'unexcused';
                    note = 'Vắng không lý do';
                }

                await prisma.attendance.upsert({
                    where: {
                        studentId_classId_date_periodNumber: {
                            studentId,
                            classId: class10A1.id,
                            date: curDate,
                            periodNumber: 1
                        }
                    },
                    update: {},
                    create: {
                        studentId,
                        classId: class10A1.id,
                        date: curDate,
                        periodNumber: 1,
                        periodName: 'Tiết 1',
                        session: 'morning',
                        status,
                        note
                    }
                });
            }
            console.log('✅ Generated attendance records for hs001');

            // 7. Tạo Thời khóa biểu mẫu cho 10A1
            const periods = ['Tiết 1 (07:00 - 07:45)', 'Tiết 2 (07:50 - 08:35)', 'Tiết 3 (08:50 - 09:35)', 'Tiết 4 (09:40 - 10:25)', 'Tiết 5 (10:30 - 11:15)'];
            const sampleSubjects = [
                ['Chào cờ', 'Toán Học', 'Toán Học', 'Ngữ Văn', 'Tiếng Anh'],
                ['Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Lịch Sử'],
                ['Tin Học', 'Tin Học', 'Toán Học', 'Địa Lý', 'GDCD'],
                ['Ngữ Văn', 'Ngữ Văn', 'Tiếng Anh', 'Tiếng Anh', 'Thể Dục'],
                ['Hóa Học', 'Sinh Học', 'Toán Học', 'Sinh Hoạt Lớp', 'Hoạt động trải nghiệm']
            ];

            for (let pIdx = 0; pIdx < periods.length; pIdx++) {
                await prisma.schedule.upsert({
                    where: {
                        classId_semester_period: {
                            classId: class10A1.id,
                            semester: 'HK1_2026',
                            period: periods[pIdx]
                        }
                    },
                    update: {},
                    create: {
                        classId: class10A1.id,
                        semester: 'HK1_2026',
                        period: periods[pIdx],
                        monday: sampleSubjects[0][pIdx],
                        tuesday: sampleSubjects[1][pIdx],
                        wednesday: sampleSubjects[2][pIdx],
                        thursday: sampleSubjects[3][pIdx],
                        friday: sampleSubjects[4][pIdx],
                        saturday: '-'
                    }
                });
            }
            console.log('✅ Generated class schedule for 10A1');
        }

        console.log('🎉 Student Portal demo data seeded successfully!');
    } catch (err) {
        console.error('Seed Student Portal Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedStudentPortalData();
