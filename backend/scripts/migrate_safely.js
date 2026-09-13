import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IKecRfm4o6gZ@ep-aged-silence-azt04b35-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  console.log('🚀 Running safe non-destructive migration...');
  try {
    await client.connect();

    // 1. Create SubjectGrade table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SubjectGrade" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "subjectId" TEXT NOT NULL REFERENCES "Subject"("id") ON DELETE CASCADE,
        "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
        "schoolYearId" TEXT REFERENCES "SchoolYear"("id") ON DELETE SET NULL,
        "semester" TEXT NOT NULL DEFAULT 'HK1_2026',
        "assessmentType" TEXT NOT NULL DEFAULT 'score',
        "tx1" DOUBLE PRECISION,
        "tx2" DOUBLE PRECISION,
        "tx3" DOUBLE PRECISION,
        "tx4" DOUBLE PRECISION,
        "gk" DOUBLE PRECISION,
        "ck" DOUBLE PRECISION,
        "avgScore" DOUBLE PRECISION,
        "feedbackResult" TEXT,
        "teacherRemark" TEXT,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "lockedAt" TIMESTAMP,
        "lockedById" TEXT,
        "teacherId" TEXT REFERENCES "Teacher"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "SubjectGrade_student_subject_class_sem_unique" UNIQUE ("studentId", "subjectId", "classId", "semester")
      );
    `);
    console.log('✅ SubjectGrade table verified/created.');

    // 2. Create RefreshToken table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "RefreshToken" (
        "id" TEXT PRIMARY KEY,
        "token" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "expiresAt" TIMESTAMP NOT NULL,
        "revoked" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ RefreshToken table verified/created.');

    // 3. Add non-destructive columns to Grade
    await client.query(`
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "overallAvgScore" DOUBLE PRECISION;
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "academicRank" TEXT DEFAULT 'Khá';
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "titleAwarded" TEXT;
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "teacherRemark" TEXT;
    `);
    console.log('✅ Grade summary columns verified.');

    // 4. Add non-destructive columns to Teacher
    await client.query(`
      ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "teacherType" TEXT DEFAULT 'permanent';
      ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "contractExpiresAt" TIMESTAMP;
      ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "leaveStatus" TEXT DEFAULT 'active';
      ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "leaveStartDate" TIMESTAMP;
      ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "leaveEndDate" TIMESTAMP;
    `);
    console.log('✅ Teacher columns verified.');

    // 5. Add columns to Student, Attendance, Schedule
    await client.query(`
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "email" TEXT;
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "periodName" TEXT;
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "periodNumber" INTEGER;
      ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
      ALTER TABLE "Schedule" ADD COLUMN IF NOT EXISTS "saturday" TEXT DEFAULT '-';
    `);
    console.log('✅ Student, Attendance, Schedule columns verified.');

    console.log('🎉 Safe migration completed with 0 data loss!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
