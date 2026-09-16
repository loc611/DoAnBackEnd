import prisma from '../prismaClient.js';

async function main() {
  console.log('🔄 Bắt đầu cập nhật Thời khóa biểu 3 Buổi (Sáng, Chiều, Tối) và Thứ Bảy...');

  const classes = await prisma.class.findMany();
  if (classes.length === 0) {
    console.log('❌ Không tìm thấy lớp học nào trong CSDL');
    return;
  }

  const SEMESTER = 'HK1_2026';

  const scheduleTemplate = [
    // --- BUỔI SÁNG ---
    { period: 'Tiết 1 (07:00 - 07:45)', monday: 'Toán Học', tuesday: 'Ngữ Văn', wednesday: 'Vật Lý', thursday: 'Hóa Học', friday: 'Tiếng Anh', saturday: 'Toán Học' },
    { period: 'Tiết 2 (07:50 - 08:35)', monday: 'Toán Học', tuesday: 'Ngữ Văn', wednesday: 'Vật Lý', thursday: 'Hóa Học', friday: 'Tiếng Anh', saturday: 'Toán Học' },
    { period: 'Tiết 3 (08:55 - 09:40)', monday: 'Tiếng Anh', tuesday: 'Tin Học', wednesday: 'Lịch Sử', thursday: 'Sinh Học', friday: 'Toán Học', saturday: 'Vật Lý' },
    { period: 'Tiết 4 (09:45 - 10:30)', monday: 'Tiếng Anh', tuesday: 'Tin Học', wednesday: 'Địa Lý', thursday: 'GDCD', friday: 'Ngữ Văn', saturday: 'Hóa Học' },
    { period: 'Tiết 5 (10:35 - 11:20)', monday: 'Chào cờ', tuesday: 'Thể dục', wednesday: 'Địa Lý', thursday: 'QPAN', friday: 'Sinh hoạt lớp', saturday: 'Sinh Hoạt CLB' },

    // --- BUỔI CHIỀU ---
    { period: 'Tiết 6 (13:00 - 13:45)', monday: 'Thể dục', tuesday: 'Tiếng Anh Tăng Cường', wednesday: 'Tin Học Ứng Dụng', thursday: 'Bồi Dưỡng Toán', friday: 'Hoạt Động Trải Nghiệm', saturday: '-' },
    { period: 'Tiết 7 (13:50 - 14:35)', monday: 'Thể dục', tuesday: 'Tiếng Anh Tăng Cường', wednesday: 'Tin Học Ứng Dụng', thursday: 'Bồi Dưỡng Toán', friday: 'Hoạt Động Trải Nghiệm', saturday: '-' },
    { period: 'Tiết 8 (14:55 - 15:40)', monday: 'Giáo Dục Địa Phương', tuesday: 'Thực Hành Lý - Hóa', wednesday: 'Kỹ Năng Sống', thursday: 'Bồi Dưỡng Văn', friday: 'Văn Nghệ & Thể Thao', saturday: '-' },
    { period: 'Tiết 9 (15:45 - 16:30)', monday: 'Giáo Dục Địa Phương', tuesday: 'Thực Hành Lý - Hóa', wednesday: 'Kỹ Năng Sống', thursday: 'Bồi Dưỡng Văn', friday: '-', saturday: '-' },
    { period: 'Tiết 10 (16:35 - 17:20)', monday: '-', tuesday: '-', wednesday: '-', thursday: '-', friday: '-', saturday: '-' },

    // --- BUỔI TỐI ---
    { period: 'Tiết 11 (17:45 - 18:30)', monday: 'Tự Học Có Hướng Dẫn', tuesday: 'Ôn Thi Tốt Nghiệp', wednesday: 'Tự Học Có Hướng Dẫn', thursday: 'Ôn Luyện Tiếng Anh', friday: '-', saturday: '-' },
    { period: 'Tiết 12 (18:35 - 19:20)', monday: 'Tự Học Có Hướng Dẫn', tuesday: 'Ôn Thi Tốt Nghiệp', wednesday: 'Tự Học Có Hướng Dẫn', thursday: 'Ôn Luyện Tiếng Anh', friday: '-', saturday: '-' },
    { period: 'Tiết 13 (19:25 - 20:10)', monday: 'Giải Đáp Thắc Mắc', tuesday: 'Học Nhóm', wednesday: 'Giải Đáp Thắc Mắc', thursday: '-', friday: '-', saturday: '-' }
  ];

  for (const cls of classes) {
    for (const item of scheduleTemplate) {
      await prisma.schedule.upsert({
        where: {
          classId_semester_period: {
            classId: cls.id,
            semester: SEMESTER,
            period: item.period
          }
        },
        update: {
          monday: item.monday,
          tuesday: item.tuesday,
          wednesday: item.wednesday,
          thursday: item.thursday,
          friday: item.friday,
          saturday: item.saturday
        },
        create: {
          classId: cls.id,
          semester: SEMESTER,
          period: item.period,
          monday: item.monday,
          tuesday: item.tuesday,
          wednesday: item.wednesday,
          thursday: item.thursday,
          friday: item.friday,
          saturday: item.saturday
        }
      });
    }
    console.log(`  ✅ Đã cập nhật TKB 3 buổi cho lớp ${cls.className}`);
  }

  console.log('🎉 Hoàn tất nạp dữ liệu TKB 3 buổi!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed TKB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
