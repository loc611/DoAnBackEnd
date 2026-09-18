import prisma from '../prismaClient.js';

const DEPARTMENTS = [
  {
    code: 'TOAN_TIN',
    name: 'Tổ Toán - Tin học',
    description: 'Quản lý giảng dạy các môn Toán học, Tin học và Chuyên đề Toán ứng dụng.',
    subjects: ['Toán học', 'Tin học']
  },
  {
    code: 'NGU_VAN',
    name: 'Tổ Ngữ văn',
    description: 'Quản lý giảng dạy môn Ngữ văn và Chuyên đề Văn học.',
    subjects: ['Ngữ văn']
  },
  {
    code: 'NGOAI_NGU',
    name: 'Tổ Ngoại ngữ',
    description: 'Quản lý giảng dạy môn Tiếng Anh và các chứng chỉ ngoại ngữ chuẩn đầu ra.',
    subjects: ['Tiếng Anh']
  },
  {
    code: 'KHTN',
    name: 'Tổ Khoa học Tự nhiên',
    description: 'Quản lý giảng dạy các môn Vật lý, Hóa học, Sinh học.',
    subjects: ['Vật lý', 'Hóa học', 'Sinh học']
  },
  {
    code: 'KHXH',
    name: 'Tổ Khoa học Xã hội',
    description: 'Quản lý giảng dạy các môn Lịch sử, Địa lý, Giáo dục kinh tế & pháp luật (GDCD).',
    subjects: ['Lịch sử', 'Địa lý', 'Giáo dục công dân']
  },
  {
    code: 'THE_DUC_QP',
    name: 'Tổ Giáo dục Thể chất & QPAN',
    description: 'Quản lý giảng dạy môn Thể dục và Giáo dục quốc phòng an ninh.',
    subjects: ['Thể dục', 'Giáo dục quốc phòng']
  },
  {
    code: 'NGHE_THUAT_CN',
    name: 'Tổ Nghệ thuật - Công nghệ',
    description: 'Quản lý môn Công nghệ, Mỹ thuật, Âm nhạc và Hoạt động trải nghiệm.',
    subjects: ['Công nghệ']
  },
  {
    code: 'VAN_PHONG',
    name: 'Tổ Văn phòng & Quản trị',
    description: 'Công tác giáo vụ, giám thị, thư viện và quản trị cơ sở vật chất.',
    subjects: []
  }
];

async function seedDepartments() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu Tổ chuyên môn chuẩn THPT...');

  const departmentMap = {};

  for (const dept of DEPARTMENTS) {
    let d = await prisma.department.findUnique({
      where: { code: dept.code }
    });

    if (!d) {
      d = await prisma.department.create({
        data: {
          code: dept.code,
          name: dept.name,
          description: dept.description
        }
      });
      console.log(`+ Tạo mới Tổ: ${d.name} (${d.code})`);
    } else {
      console.log(`= Đã tồn tại Tổ: ${d.name}`);
    }
    departmentMap[dept.code] = d;

    // Gán departmentId vào các môn học tương ứng
    if (dept.subjects.length > 0) {
      await prisma.subject.updateMany({
        where: {
          name: { in: dept.subjects }
        },
        data: {
          departmentId: d.id
        }
      });
    }
  }

  // Gán giáo viên hiện có vào Tổ chuyên môn dựa trên specialization
  const teachers = await prisma.teacher.findMany();
  console.log(`🔍 Tìm thấy ${teachers.length} giáo viên cần phân bổ vào Tổ...`);

  for (const t of teachers) {
    const spec = (t.specialization || '').toLowerCase();
    let targetDeptCode = 'TOAN_TIN'; // Mặc định

    if (spec.includes('toán') || spec.includes('tin')) {
      targetDeptCode = 'TOAN_TIN';
    } else if (spec.includes('văn')) {
      targetDeptCode = 'NGU_VAN';
    } else if (spec.includes('anh') || spec.includes('ngoại ngữ')) {
      targetDeptCode = 'NGOAI_NGU';
    } else if (spec.includes('lý') || spec.includes('vật lý') || spec.includes('hóa') || spec.includes('sinh')) {
      targetDeptCode = 'KHTN';
    } else if (spec.includes('sử') || spec.includes('địa') || spec.includes('công dân') || spec.includes('gdcd')) {
      targetDeptCode = 'KHXH';
    } else if (spec.includes('thể dục') || spec.includes('quốc phòng')) {
      targetDeptCode = 'THE_DUC_QP';
    } else if (spec.includes('công nghệ')) {
      targetDeptCode = 'NGHE_THUAT_CN';
    } else if (t.position === 'Giám thị') {
      targetDeptCode = 'VAN_PHONG';
    }

    const targetDept = departmentMap[targetDeptCode];
    if (targetDept) {
      // Tính định mức tiết theo vị trí
      let baseQuotas = 17;
      let quotaReduction = 0;
      let reductionReason = null;

      if (t.position === 'Tổ trưởng chuyên môn') {
        quotaReduction += 3;
        reductionReason = 'Tổ trưởng chuyên môn (-3 tiết/tuần)';
      } else if (t.position === 'Tổ phó chuyên môn') {
        quotaReduction += 1;
        reductionReason = 'Tổ phó chuyên môn (-1 tiết/tuần)';
      } else if (t.position === 'Hiệu trưởng') {
        quotaReduction += 15;
        reductionReason = 'Hiệu trưởng phụ trách chung (dạy 2 tiết/tuần)';
      } else if (t.position === 'Phó Hiệu trưởng') {
        quotaReduction += 13;
        reductionReason = 'Phó Hiệu trưởng (dạy 4 tiết/tuần)';
      }

      await prisma.teacher.update({
        where: { id: t.id },
        data: {
          departmentId: targetDept.id,
          academicDegree: t.academicDegree || (t.position?.includes('Hiệu') ? 'Thạc sĩ' : 'Cử nhân'),
          nationalIdCard: t.nationalIdCard || `079${Math.floor(100000000 + Math.random() * 900000000)}`,
          bankAccountNumber: t.bankAccountNumber || `10${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          bankName: t.bankName || 'Vietcombank',
          bankBranch: t.bankBranch || 'Chi nhánh TP.HCM',
          baseQuotas,
          quotaReduction,
          reductionReason,
          workStatus: t.workStatus || 'working'
        }
      });
    }
  }

  // Đặt Tổ trưởng cho các tổ nếu chưa có
  for (const dept of DEPARTMENTS) {
    const d = departmentMap[dept.code];
    if (!d) continue;

    const headCandidate = await prisma.teacher.findFirst({
      where: {
        departmentId: d.id,
        position: 'Tổ trưởng chuyên môn'
      }
    });

    if (headCandidate && !d.headTeacherId) {
      await prisma.department.update({
        where: { id: d.id },
        data: { headTeacherId: headCandidate.id }
      });
      console.log(`⭐ Gán Tổ trưởng cho ${d.name}: ${headCandidate.fullName}`);
    }
  }

  console.log('✅ Hoàn tất khởi tạo Tổ chuyên môn và đồng bộ dữ liệu giáo viên!');
}

seedDepartments()
  .catch((e) => {
    console.error('❌ Lỗi seed Tổ chuyên môn:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
