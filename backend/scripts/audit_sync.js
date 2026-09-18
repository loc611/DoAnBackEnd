import prisma from '../prismaClient.js';

async function audit() {
  const counts = {
    user: await prisma.user.count(),
    teacher: await prisma.teacher.count(),
    student: await prisma.student.count(),
    class: await prisma.class.count(),
    subject: await prisma.subject.count(),
    teacherAssignment: await prisma.teacherAssignment.count(),
    homeroomAssignment: await prisma.homeroomAssignment.count(),
    grade: await prisma.grade.count(),
    subjectGrade: await prisma.subjectGrade.count(),
    subjectGradeDetail: await prisma.subjectGradeDetail.count(),
    attendance: await prisma.attendance.count(),
    feeProfile: await prisma.feeProfile.count(),
    feeBill: await prisma.feeBill.count(),
    paymentTransaction: await prisma.paymentTransaction.count(),
    studentPetition: await prisma.studentPetition.count(),
    absenceRequest: await prisma.absenceRequest.count(),
    gradeReviewRequest: await prisma.gradeReviewRequest.count(),
    academicAlert: await prisma.academicAlert.count(),
    lessonLog: await prisma.lessonLog.count(),
    schedule: await prisma.schedule.count(),
    examSchedule: await prisma.examSchedule.count()
  };

  console.log('=== DATABASE TABLE RECORD COUNTS ===');
  console.log(JSON.stringify(counts, null, 2));

  // Check sample Grade records
  const sampleGrades = await prisma.grade.findMany({ take: 3 });
  console.log('=== SAMPLE GRADE RECORDS ===');
  console.log(JSON.stringify(sampleGrades, null, 2));

  // Check subjects
  const subjects = await prisma.subject.findMany();
  console.log('=== SUBJECTS COUNT & CODES ===');
  console.log(subjects.map(s => ({ id: s.id, code: s.subjectCode, name: s.name, type: s.type })));

  // Check teacher assignments
  const ta = await prisma.teacherAssignment.findMany({ take: 5, include: { teacher: true, subject: true, class: true } });
  console.log('=== SAMPLE TEACHER ASSIGNMENTS ===');
  console.log(ta.map(t => `${t.teacher.fullName} (${t.teacher.teacherCode}) -> ${t.subject.name} -> ${t.class.className}`));
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
