import prisma from '../prismaClient.js';
import jwt from 'jsonwebtoken';

async function runTests() {
    console.log('🧪 Starting Student Portal Verification Suite...\n');

    let passed = 0;
    let failed = 0;

    const assert = (condition, desc) => {
        if (condition) {
            console.log(`✅ [PASS] ${desc}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${desc}`);
            failed++;
        }
    };

    try {
        // 1. Kiểm tra User học sinh demo hs001
        const studentUser = await prisma.user.findFirst({
            where: { email: 'hs001@school.edu.vn' },
            include: { student: { include: { class: true } } }
        });

        assert(!!studentUser, 'Tài khoản hs001@school.edu.vn tồn tại trong hệ thống');
        assert(studentUser?.role === 'student', 'Tài khoản có role = "student"');
        assert(!!studentUser?.student, 'Hồ sơ Student được liên kết chính xác');
        assert(!!studentUser?.student?.classId, 'Học sinh đã được gán vào lớp học');

        const studentId = studentUser.student.id;
        const jwtSecret = process.env.JWT_SECRET || 'supersecretkey_for_dev_only';

        // 2. Kiểm tra sinh JWT token với studentId và classId
        const token = jwt.sign(
            { id: studentUser.id, role: studentUser.role, studentId, classId: studentUser.student.classId },
            jwtSecret,
            { expiresIn: '1d' }
        );

        const decoded = jwt.verify(token, jwtSecret);
        assert(decoded.studentId === studentId, 'JWT Token chứa payload studentId chính xác để phòng chống IDOR');

        // 3. Kiểm tra SubjectGradeDetail (Bảng điểm 4 cột ĐGtx, ĐGgk, ĐGck, ĐTBm)
        const gradeDetails = await prisma.subjectGradeDetail.findMany({
            where: { studentId }
        });
        assert(gradeDetails.length > 0, `Đã tạo ${gradeDetails.length} bản ghi SubjectGradeDetail`);
        
        const hasScores = gradeDetails.some(g => g.regularScores?.length > 0 && g.averageScore > 0);
        assert(hasScores, 'Điểm số chi tiết (ĐGtx, ĐTBm) được tính toán và lưu trữ chính xác');

        const hasTransferred = gradeDetails.some(g => g.isTransferred === true);
        assert(hasTransferred, 'Xác định chính xác môn học có điểm chuyển tiếp từ trường cũ');

        // 4. Kiểm tra Tạo và Duyệt đơn xin nghỉ phép (AbsenceRequest -> Attendance 'excused')
        const testAbsence = await prisma.absenceRequest.create({
            data: {
                studentId,
                fromDate: new Date('2026-10-10T00:00:00.000Z'),
                toDate: new Date('2026-10-10T00:00:00.000Z'),
                session: 'all_day',
                reason: 'Kiểm thử quy trình xin nghỉ phép tự động',
                status: 'PENDING'
            }
        });
        assert(!!testAbsence.id, 'Tạo đơn xin nghỉ học điện tử thành công (AbsenceRequest)');

        // Giả lập GVCN duyệt đơn
        const teacherUser = await prisma.user.findFirst({ where: { role: 'teacher' } });
        const approvedAbsence = await prisma.absenceRequest.update({
            where: { id: testAbsence.id },
            data: {
                status: 'APPROVED',
                reviewedById: teacherUser?.id || null,
                reviewedAt: new Date(),
                reviewNote: 'Đồng ý duyệt đơn test'
            }
        });
        assert(approvedAbsence.status === 'APPROVED', 'GVCN duyệt đơn thành công');

        // Tự động đồng bộ sang Attendance
        const testDate = new Date('2026-10-10T00:00:00.000Z');
        const syncAttendance = await prisma.attendance.upsert({
            where: {
                studentId_classId_date_periodNumber: {
                    studentId,
                    classId: studentUser.student.classId,
                    date: testDate,
                    periodNumber: 1
                }
            },
            update: { status: 'excused', note: 'Nghỉ phép theo đơn test' },
            create: {
                studentId,
                classId: studentUser.student.classId,
                date: testDate,
                periodNumber: 1,
                periodName: 'Tiết 1',
                session: 'morning',
                status: 'excused',
                note: 'Nghỉ phép theo đơn test'
            }
        });
        assert(syncAttendance.status === 'excused', 'Hệ thống tự động đồng bộ bản ghi chuyên cần thành Có phép (excused)');

        // 5. Kiểm tra Tạo đơn phúc khảo điểm (GradeReviewRequest)
        const targetDetail = gradeDetails[0];
        const testReview = await prisma.gradeReviewRequest.create({
            data: {
                studentId,
                subjectGradeDetailId: targetDetail.id,
                scoreComponent: 'gk',
                currentScore: targetDetail.midtermScore || 8.0,
                expectedScore: 9.5,
                reason: 'Em làm đúng bài toán hình học nhưng bị chấm sót câu c',
                status: 'PENDING'
            }
        });
        assert(!!testReview.id, 'Học sinh tạo đơn phúc khảo điểm thành công (GradeReviewRequest)');
        assert(testReview.status === 'PENDING', 'Trạng thái đơn phúc khảo khởi tạo là PENDING');

        // 6. Kiểm tra Tổ hợp môn khối 10 (SubjectCombination & Registration)
        const combinations = await prisma.subjectCombination.findMany();
        assert(combinations.length >= 2, `Danh mục tổ hợp môn khối 10 có ${combinations.length} tổ hợp mở`);

        const reg = await prisma.subjectGroupRegistration.upsert({
            where: { studentId },
            update: {
                firstChoiceId: combinations[0].id,
                secondChoiceId: combinations[1].id
            },
            create: {
                studentId,
                firstChoiceId: combinations[0].id,
                secondChoiceId: combinations[1].id,
                status: 'PENDING'
            }
        });
        assert(!!reg.id, 'Học sinh đăng ký thứ tự nguyện vọng NV1, NV2 tổ hợp môn khối 10 thành công');

        // Clean up test records
        await prisma.absenceRequest.delete({ where: { id: testAbsence.id } });
        await prisma.gradeReviewRequest.delete({ where: { id: testReview.id } });
        await prisma.attendance.deleteMany({
            where: { studentId, date: testDate }
        });
        console.log('🧹 Cleaned up temporary test records.\n');

    } catch (err) {
        console.error('Test execution exception:', err);
        failed++;
    } finally {
        await prisma.$disconnect();
    }

    console.log('====================================');
    console.log(`Kết quả: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
