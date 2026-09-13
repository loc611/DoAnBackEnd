import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IKecRfm4o6gZ@ep-aged-silence-azt04b35-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrateEnterprise() {
  console.log('🚀 Running Enterprise Phase Safe Migration...');
  try {
    await client.connect();

    // 1. Columns for Student & FeeBill
    await client.query(`
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "moetStudentCode" TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS "Student_moetStudentCode_key" ON "Student"("moetStudentCode") WHERE "moetStudentCode" IS NOT NULL;

      ALTER TABLE "FeeBill" ADD COLUMN IF NOT EXISTS "originalAmount" DOUBLE PRECISION;
      ALTER TABLE "FeeBill" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE "FeeBill" ADD COLUMN IF NOT EXISTS "finalAmount" DOUBLE PRECISION;
      ALTER TABLE "FeeBill" ADD COLUMN IF NOT EXISTS "appliedPolicySnapshot" JSONB;
    `);
    console.log('✅ Student & FeeBill columns updated.');

    // 2. Create StudentPolicy
    await client.query(`
      CREATE TABLE IF NOT EXISTS "StudentPolicy" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "policyType" TEXT NOT NULL,
        "policyName" TEXT NOT NULL,
        "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "fixedDiscount" DOUBLE PRECISION,
        "documentNumber" TEXT,
        "documentIssuedDate" TIMESTAMP,
        "documentExpiryDate" TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "approvedById" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "StudentPolicy_studentId_idx" ON "StudentPolicy"("studentId");
      CREATE INDEX IF NOT EXISTS "StudentPolicy_policyType_status_idx" ON "StudentPolicy"("policyType", "status");
    `);
    console.log('✅ StudentPolicy table verified/created.');

    // 3. Create AcademicAlert
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AcademicAlert" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "classId" TEXT,
        "alertType" TEXT NOT NULL,
        "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'NEW',
        "resolvedById" TEXT,
        "resolvedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "AcademicAlert_studentId_idx" ON "AcademicAlert"("studentId");
      CREATE INDEX IF NOT EXISTS "AcademicAlert_alertType_status_idx" ON "AcademicAlert"("alertType", "status");
      CREATE INDEX IF NOT EXISTS "AcademicAlert_severity_idx" ON "AcademicAlert"("severity");
    `);
    console.log('✅ AcademicAlert table verified/created.');

    // 4. Create LessonLog (Sổ đầu bài)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LessonLog" (
        "id" TEXT PRIMARY KEY,
        "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
        "date" TIMESTAMP NOT NULL,
        "periodNumber" INTEGER NOT NULL,
        "session" TEXT NOT NULL DEFAULT 'morning',
        "subjectId" TEXT NOT NULL REFERENCES "Subject"("id") ON DELETE CASCADE,
        "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "lessonTitle" TEXT NOT NULL,
        "periodInPlan" INTEGER,
        "totalStudents" INTEGER NOT NULL DEFAULT 0,
        "presentCount" INTEGER NOT NULL DEFAULT 0,
        "absentStudentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "disciplineRating" TEXT NOT NULL DEFAULT 'Tốt',
        "teacherRemark" TEXT,
        "isSigned" BOOLEAN NOT NULL DEFAULT FALSE,
        "signedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "LessonLog_class_date_period_session_unique" UNIQUE ("classId", "date", "periodNumber", "session")
      );
      CREATE INDEX IF NOT EXISTS "LessonLog_classId_date_idx" ON "LessonLog"("classId", "date");
      CREATE INDEX IF NOT EXISTS "LessonLog_teacherId_idx" ON "LessonLog"("teacherId");
    `);
    console.log('✅ LessonLog table verified/created.');

    // 5. Create StudentPetition (Cổng đơn từ & phúc khảo)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "StudentPetition" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "attachedProofUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "startDate" TIMESTAMP,
        "endDate" TIMESTAMP,
        "reason" TEXT,
        "targetSubjectId" TEXT,
        "targetSemester" TEXT,
        "targetGradeColumn" TEXT,
        "claimedScore" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
        "approverId" TEXT,
        "approvalRemark" TEXT,
        "temporaryUnlockToken" TEXT,
        "unlockTokenExpiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "StudentPetition_studentId_idx" ON "StudentPetition"("studentId");
      CREATE INDEX IF NOT EXISTS "StudentPetition_type_status_idx" ON "StudentPetition"("type", "status");
    `);
    console.log('✅ StudentPetition table verified/created.');

    // 6. Create PaymentTransaction (Giao dịch VietQR)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
        "id" TEXT PRIMARY KEY,
        "billId" TEXT NOT NULL REFERENCES "FeeBill"("id") ON DELETE CASCADE,
        "transactionCode" TEXT UNIQUE NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "bankCode" TEXT,
        "paymentMethod" TEXT NOT NULL DEFAULT 'VIETQR',
        "transferContent" TEXT,
        "paidAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "rawPayload" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "PaymentTransaction_billId_idx" ON "PaymentTransaction"("billId");
      CREATE INDEX IF NOT EXISTS "PaymentTransaction_transactionCode_idx" ON "PaymentTransaction"("transactionCode");
    `);
    console.log('✅ PaymentTransaction table verified/created.');

    console.log('🎉 Enterprise Phase Safe Migration completed successfully with 0 data loss!');
  } catch (err) {
    console.error('❌ Enterprise migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateEnterprise();
