import prisma from '../prismaClient.js';

/**
 * MOET Report Exporter - Xuất Sổ Gọi Tên & Ghi Điểm Chuẩn Quy Cách Bộ GD&ĐT
 * Và định dạng gói dữ liệu liên thông Cơ sở dữ liệu ngành (moet.gov.vn)
 */
export async function generateMasterGradebook(classId, semester = 'HK1_2026') {
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      homeroomTeacher: { select: { fullName: true, teacherCode: true } },
      schoolYear: true
    }
  });

  if (!classInfo) {
    throw new Error('Không tìm thấy lớp học');
  }

  // Lấy danh sách môn học và học sinh trong lớp
  const [subjects, students, grades, subjectGrades] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    prisma.student.findMany({
      where: { classId },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        studentCode: true,
        moetStudentCode: true,
        fullName: true,
        gender: true,
        dateOfBirth: true
      }
    }),
    prisma.grade.findMany({
      where: { classId, semester }
    }),
    prisma.subjectGrade.findMany({
      where: { classId, semester }
    })
  ]);

  // Tổ chức ma trận điểm theo từng học sinh
  const studentRows = students.map(st => {
    const studentSummary = grades.find(g => g.studentId === st.id) || {};
    const studentSubjGrades = subjectGrades.filter(sg => sg.studentId === st.id);

    const subjectMap = {};
    for (const sub of subjects) {
      const sg = studentSubjGrades.find(item => item.subjectId === sub.id);
      subjectMap[sub.name] = {
        tx1: sg?.tx1 ?? null,
        tx2: sg?.tx2 ?? null,
        tx3: sg?.tx3 ?? null,
        tx4: sg?.tx4 ?? null,
        gk: sg?.gk ?? null,
        ck: sg?.ck ?? null,
        avgScore: sg?.avgScore ?? null,
        feedback: sg?.feedbackResult ?? null
      };
    }

    return {
      id: st.id,
      studentCode: st.studentCode,
      moetStudentCode: st.moetStudentCode || 'Chưa đồng bộ',
      fullName: st.fullName,
      gender: st.gender,
      dateOfBirth: st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString('vi-VN') : '',
      subjects: subjectMap,
      overallAvgScore: studentSummary.overallAvgScore ?? null,
      conductScore: studentSummary.conductScore ?? 'Tốt',
      academicRank: studentSummary.academicRank ?? 'Khá',
      titleAwarded: studentSummary.titleAwarded ?? 'Không',
      teacherRemark: studentSummary.teacherRemark ?? ''
    };
  });

  return {
    meta: {
      ministryTitle: 'BỘ GIÁO DỤC VÀ ĐÀO TẠO',
      subTitle: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
      reportTitle: 'SỔ GỌI TÊN VÀ GHI ĐIỂM HỌC SINH THPT',
      regulation: 'Theo Thông tư số 22/2021/TT-BGDĐT ngày 20/7/2021',
      className: classInfo.className,
      grade: classInfo.grade,
      academicYear: classInfo.academicYear,
      semester,
      homeroomTeacher: classInfo.homeroomTeacher?.fullName || 'Chưa phân công',
      totalStudents: students.length,
      generatedAt: new Date().toISOString()
    },
    subjectsList: subjects.map(s => ({ id: s.id, code: s.subjectCode, name: s.name })),
    students: studentRows
  };
}

/**
 * Tạo gói dữ liệu chuẩn liên thông Cơ sở dữ liệu ngành MOET
 */
export async function generateMoetSyncPayload(academicYear = '2026-2027', semester = 'HK1_2026') {
  const students = await prisma.student.findMany({
    include: {
      class: true,
      grades: { where: { semester } },
      subjectGrades: { where: { semester }, include: { subject: true } }
    }
  });

  const payload = {
    provider: 'SmartCampus-THPT-Portal',
    version: '1.0-MOET',
    syncTimestamp: new Date().toISOString(),
    academicYear,
    semester,
    recordsCount: students.length,
    students: students.map(s => {
      const summary = s.grades[0] || {};
      return {
        maDinhDanhBo: s.moetStudentCode || null,
        maHocSinhTruong: s.studentCode,
        hoVaTen: s.fullName,
        ngaySinh: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().slice(0, 10) : null,
        gioiTinh: s.gender === 'Nữ' ? 2 : 1,
        lopHoc: s.class?.className || '',
        khoiLop: s.class?.grade || 0,
        ketQuaHocTap: {
          diemTrungBinhChung: summary.overallAvgScore,
          ketQuaRenLuyen: summary.conductScore,
          ketQuaHocTap: summary.academicRank,
          danhHieu: summary.titleAwarded
        },
        diemCacMon: s.subjectGrades.map(sg => ({
          maMon: sg.subject?.subjectCode,
          tenMon: sg.subject?.name,
          dtbMon: sg.avgScore,
          danhGiaNhanXet: sg.feedbackResult
        }))
      };
    })
  };

  return payload;
}
