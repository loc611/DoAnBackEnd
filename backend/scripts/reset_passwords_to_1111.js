import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('🔄 Bắt đầu tiến trình đặt lại mật khẩu về "1111" cho toàn bộ Học sinh & Giáo viên...');

    const saltRounds = 10;
    const targetPassword = '1111';
    const hashedPassword = await bcrypt.hash(targetPassword, saltRounds);

    // Lấy toàn bộ người dùng cùng thông tin liên kết
    const allUsers = await prisma.user.findMany({
        include: {
            admin: true,
            teacher: true,
            student: true
        }
    });

    console.log(`📊 Tổng số người dùng tìm thấy trong hệ thống: ${allUsers.length}`);

    let teacherCount = 0;
    let studentCount = 0;
    let skippedAdminCount = 0;
    let otherCount = 0;

    const teacherIds = [];
    const studentIds = [];

    for (const u of allUsers) {
        const roleLower = (u.role || '').toLowerCase();
        const isTeacher = Boolean(u.teacher) || roleLower.includes('teacher') || roleLower.includes('giáo viên') || u.username.startsWith('gv');
        const isStudent = Boolean(u.student) || roleLower.includes('student') || roleLower.includes('học sinh') || u.username.startsWith('hs') || u.username.startsWith('test_hs');
        const isAdmin = Boolean(u.admin) || roleLower === 'admin' || u.username === 'admin';

        if (isAdmin && !isTeacher && !isStudent) {
            skippedAdminCount++;
            continue;
        }

        if (isTeacher) {
            teacherIds.push(u.id);
            teacherCount++;
        } else if (isStudent) {
            studentIds.push(u.id);
            studentCount++;
        } else {
            // Nếu không phải admin thuần túy, xếp loại kiểm tra thêm
            otherCount++;
            console.log(`ℹ️ Bỏ qua tài khoản khác: ${u.username} (role: ${u.role})`);
        }
    }

    const totalToUpdate = [...teacherIds, ...studentIds];

    if (totalToUpdate.length > 0) {
        // Cập nhật theo batch
        const updateResult = await prisma.user.updateMany({
            where: {
                id: { in: totalToUpdate }
            },
            data: {
                password: hashedPassword
            }
        });

        console.log(`✅ Đã cập nhật thành công mật khẩu về "${targetPassword}" cho ${updateResult.count} tài khoản!`);
        console.log(`   - Giáo viên: ${teacherCount} tài khoản`);
        console.log(`   - Học sinh: ${studentCount} tài khoản`);
        console.log(`   - Quản trị viên (Admin) giữ nguyên: ${skippedAdminCount} tài khoản`);
    } else {
        console.log('⚠️ Không tìm thấy tài khoản học sinh hoặc giáo viên nào để cập nhật.');
    }
}

main()
    .catch((err) => {
        console.error('❌ Lỗi khi đặt lại mật khẩu:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
