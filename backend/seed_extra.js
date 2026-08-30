import prisma from './prismaClient.js';

const seedExtra = async () => {
    try {
        console.log('Seeding Exam Schedules and Sample Attendance...');

        // 1. Seed Exam Schedules
        const existingExams = await prisma.examSchedule.findMany();
        if (existingExams.length === 0) {
            const sampleExams = [
                {
                    examName: 'Thi Giữa Học Kỳ 1 - 2026',
                    examType: 'Giữa kỳ',
                    subjectName: 'Toán Học',
                    grade: 10,
                    examDate: new Date('2026-11-15T07:30:00Z'),
                    startTime: '07:30',
                    duration: 90,
                    room: 'Phòng A1-101',
                    examFormat: 'Trắc nghiệm + Tự luận',
                    semester: 'HK1_2026',
                    academicYear: '2026-2027',
                    notes: 'Học sinh mang theo máy tính cầm tay Casio fx-580VN'
                },
                {
                    examName: 'Thi Giữa Học Kỳ 1 - 2026',
                    examType: 'Giữa kỳ',
                    subjectName: 'Ngữ Văn',
                    grade: 10,
                    examDate: new Date('2026-11-15T14:00:00Z'),
                    startTime: '14:00',
                    duration: 90,
                    room: 'Phòng A1-101',
                    examFormat: 'Tự luận',
                    semester: 'HK1_2026',
                    academicYear: '2026-2027',
                    notes: 'Không sử dụng tài liệu'
                },
                {
                    examName: 'Thi Giữa Học Kỳ 1 - 2026',
                    examType: 'Giữa kỳ',
                    subjectName: 'Tiếng Anh',
                    grade: 10,
                    examDate: new Date('2026-11-16T08:00:00Z'),
                    startTime: '08:00',
                    duration: 60,
                    room: 'Phòng Lab Ngoại Ngữ 1',
                    examFormat: 'Trắc nghiệm',
                    semester: 'HK1_2026',
                    academicYear: '2026-2027',
                    notes: 'Bao gồm phần thi Nghe (Listening 15 phút)'
                },
                {
                    examName: 'Thi Giữa Học Kỳ 1 - 2026',
                    examType: 'Giữa kỳ',
                    subjectName: 'Vật Lý',
                    grade: 10,
                    examDate: new Date('2026-11-17T07:30:00Z'),
                    startTime: '07:30',
                    duration: 45,
                    room: 'Phòng A1-102',
                    examFormat: 'Trắc nghiệm',
                    semester: 'HK1_2026',
                    academicYear: '2026-2027',
                    notes: 'Được dùng bảng tuần hoàn & máy tính'
                },
                {
                    examName: 'Thi Giữa Học Kỳ 1 - 2026',
                    examType: 'Giữa kỳ',
                    subjectName: 'Hóa Học',
                    grade: 11,
                    examDate: new Date('2026-11-16T09:30:00Z'),
                    startTime: '09:30',
                    duration: 45,
                    room: 'Phòng B2-203',
                    examFormat: 'Trắc nghiệm',
                    semester: 'HK1_2026',
                    academicYear: '2026-2027',
                    notes: 'Chuẩn bị bút chì 2B để tô phiếu trả lời'
                },
                {
                    examName: 'Khảo Sát Chất Lượng Đầu Năm',
                    examType: 'Khảo sát',
                    subjectName: 'Toán Học',
                    grade: 12,
                    examDate: new Date('2026-10-20T08:00:00Z'),
                    startTime: '08:00',
                    duration: 90,
                    room: 'Hội Trường Lớn',
                    examFormat: 'Trắc nghiệm',
                    semester: 'HK1_2026',
                    academicYear: '2026-2027',
                    notes: 'Đánh giá năng lực hướng thi Tốt nghiệp THPT'
                }
            ];

            for (const item of sampleExams) {
                await prisma.examSchedule.create({ data: item });
            }
            console.log('Sample exam schedules created!');
        }

        // 2. Seed Sample Attendance for existing students
        const students = await prisma.student.findMany({
            include: { class: true }
        });

        if (students.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < 5; i++) {
                const pastDate = new Date(today);
                pastDate.setDate(today.getDate() - i);

                for (const student of students) {
                    if (!student.classId) continue;

                    let status = 'present';
                    let note = null;
                    if (i === 1 && Math.random() > 0.7) {
                        status = 'late';
                        note = 'Kẹt xe đến muộn 10 phút';
                    } else if (i === 3 && Math.random() > 0.8) {
                        status = 'excused';
                        note = 'Gia đình có đơn xin nghỉ phép';
                    }

                    await prisma.attendance.upsert({
                        where: {
                            studentId_classId_date_session: {
                                studentId: student.id,
                                classId: student.classId,
                                date: pastDate,
                                session: 'morning'
                            }
                        },
                        update: { status, note },
                        create: {
                            studentId: student.id,
                            classId: student.classId,
                            date: pastDate,
                            session: 'morning',
                            status,
                            note
                        }
                    });
                }
            }
            console.log('Sample attendance data seeded!');
        }

        console.log('Done extra seeding!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding extra:', err);
        process.exit(1);
    }
};

seedExtra();
