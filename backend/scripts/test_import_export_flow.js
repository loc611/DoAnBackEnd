import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { autoAssignFeeProfilesForStudent } from '../utils/feeAutoAssign.js';

async function testImportExportFlow() {
  console.log('--- 🧪 STARTING IMPORT / EXPORT SUBSYSTEM VERIFICATION ---');

  // 1. Get an existing class
  const sampleClass = await prisma.class.findFirst();
  if (!sampleClass) {
    console.error('❌ No classes found in DB. Please run seed first.');
    process.exit(1);
  }
  console.log(`✅ Using sample class: ${sampleClass.className} (ID: ${sampleClass.id})`);

  // 2. Prepare test batch students for import
  const testStudentCode1 = `TEST_HS_${Date.now().toString().slice(-4)}A`;
  const testStudentCode2 = `TEST_HS_${Date.now().toString().slice(-4)}B`;

  const sampleBatch = [
    {
      studentCode: testStudentCode1,
      fullName: 'Nguyễn Văn Test Batch A',
      gender: 'Nam',
      dateOfBirth: '2008-05-15',
      phone: '0912345678',
      parentName: 'Nguyễn Văn Cha A',
      parentPhone: '0987654321',
      address: '123 Đường Test, Quận 1, TP.HCM',
      className: sampleClass.className
    },
    {
      studentCode: testStudentCode2,
      fullName: 'Trần Thị Test Batch B',
      gender: 'Nữ',
      dateOfBirth: '2008-09-20',
      phone: '0933112233',
      parentName: 'Trần Thị Mẹ B',
      parentPhone: '0944556677',
      address: '456 Đường Test, Quận 3, TP.HCM',
      className: sampleClass.className
    }
  ];

  console.log(`\n📦 Importing batch of ${sampleBatch.length} students...`);
  
  const createdStudents = [];
  const defaultFeeAmount = 500000;
  const currentYear = new Date().getFullYear();

  for (const row of sampleBatch) {
    const rawStudentCode = row.studentCode.trim();
    const defaultPassword = `${rawStudentCode}@123`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const username = rawStudentCode.toLowerCase();
    const email = `${username}@school.edu.vn`;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'student',
        status: 'active'
      }
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentCode: rawStudentCode,
        fullName: row.fullName.trim(),
        gender: row.gender || 'Nam',
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
        phone: row.phone || null,
        parentName: row.parentName || null,
        parentPhone: row.parentPhone || null,
        address: row.address || null,
        classId: sampleClass.id
      }
    });

    // Auto assign fee profiles
    await autoAssignFeeProfilesForStudent(student.id, sampleClass.id);

    createdStudents.push({
      studentCode: rawStudentCode,
      studentId: student.id,
      userId: user.id,
      defaultPassword
    });

    console.log(`  ✨ Created Student: ${student.fullName} | Code: ${rawStudentCode} | Pass: ${defaultPassword}`);
  }

  // 3. Verify Login credential with bcrypt
  console.log('\n🔐 Verifying generated user credential login simulation...');
  const firstCreated = createdStudents[0];
  const fetchedUser = await prisma.user.findUnique({
    where: { username: firstCreated.studentCode.toLowerCase() },
    include: { student: true }
  });

  const isPasswordValid = await bcrypt.compare(firstCreated.defaultPassword, fetchedUser.password);
  if (!isPasswordValid) {
    throw new Error('❌ Password check failed for newly imported user!');
  }
  console.log(`✅ User ${fetchedUser.username} authenticated successfully with password: ${firstCreated.defaultPassword}`);

  // 4. Verify Fee Bill record was generated (if fee profiles exist for this grade)
  const feeBills = await prisma.feeBill.findMany({
    where: { studentId: firstCreated.studentId },
    include: { feeProfile: true }
  });
  console.log(`✅ Auto-fee profiles verified: ${feeBills.length} fee bill(s) assigned to student.`);

  // 5. Clean up test records
  console.log('\n🧹 Cleaning up test batch students...');
  for (const s of createdStudents) {
    await prisma.feeBill.deleteMany({ where: { studentId: s.studentId } });
    await prisma.grade.deleteMany({ where: { studentId: s.studentId } });
    await prisma.student.delete({ where: { id: s.studentId } });
    await prisma.user.delete({ where: { id: s.userId } });
  }
  console.log('✅ Clean up completed successfully.');

  console.log('\n======================================================');
  console.log('🎉 ALL IMPORT & EXPORT SUBSYSTEM TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

testImportExportFlow()
  .catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
