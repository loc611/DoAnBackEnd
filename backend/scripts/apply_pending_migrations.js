import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

export async function applyPendingMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('🔄 Đang kiểm tra và áp dụng migrations CSDL...');

    // 1. Chuyển Student.status sang TYPE text nếu đang là enum
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE "Student" ALTER COLUMN "status" TYPE TEXT;
      EXCEPTION WHEN others THEN null;
      END $$;
    `);

    // 2. Thêm các cột nhân khẩu học và version vào bảng Student nếu chưa có
    await pool.query(`
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "cccdNumber" TEXT;
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "ethnicity" TEXT DEFAULT 'Kinh';
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "religion" TEXT DEFAULT 'Không';
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "birthPlace" TEXT;
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "permanentAddress" TEXT;
      ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Student_cccdNumber_key'
        ) THEN
          ALTER TABLE "Student" ADD CONSTRAINT "Student_cccdNumber_key" UNIQUE ("cccdNumber");
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS "Student_studentCode_idx" ON "Student"("studentCode");
      CREATE INDEX IF NOT EXISTS "Student_classId_idx" ON "Student"("classId");
      CREATE INDEX IF NOT EXISTS "Student_status_idx" ON "Student"("status");
      CREATE INDEX IF NOT EXISTS "Student_cccdNumber_idx" ON "Student"("cccdNumber");
    `);

    // 3. Enum AbsenceStatus: bổ sung các giá trị mới nếu bảng/enum tồn tại
    await pool.query(`
      DO $$ BEGIN
        ALTER TYPE "AbsenceStatus" ADD VALUE IF NOT EXISTS 'PENDING_HOMEROOM';
      EXCEPTION WHEN others THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TYPE "AbsenceStatus" ADD VALUE IF NOT EXISTS 'PENDING_ADMIN';
      EXCEPTION WHEN others THEN null;
      END $$;
    `);

    // 4. Enum GradeChangeStatus
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "GradeChangeStatus" AS ENUM ('PENDING_HOMEROOM', 'PENDING_ADMIN', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 5. Bảng StudentHealthRecord
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "StudentHealthRecord" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT UNIQUE NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "bloodGroup" TEXT,
        "heightCm" DOUBLE PRECISION,
        "weightKg" DOUBLE PRECISION,
        "bmi" DOUBLE PRECISION,
        "bmiClassification" TEXT,
        "visionLeft" TEXT DEFAULT '10/10',
        "visionRight" TEXT DEFAULT '10/10',
        "refractiveError" TEXT,
        "chronicDiseases" TEXT,
        "allergies" TEXT,
        "healthInsuranceNumber" TEXT,
        "healthInsuranceExpires" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "StudentHealthRecord_studentId_idx" ON "StudentHealthRecord"("studentId");
    `);

    // 6. Bảng StudentDocument
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "StudentDocument" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "documentType" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileType" TEXT,
        "fileSizeBytes" INTEGER,
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "verifiedById" TEXT,
        "verifiedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "StudentDocument_studentId_idx" ON "StudentDocument"("studentId");
      CREATE INDEX IF NOT EXISTS "StudentDocument_documentType_idx" ON "StudentDocument"("documentType");
    `);

    // 7. Bảng GradeChangeRequest
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "GradeChangeRequest" (
        "id" TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "subjectId" TEXT NOT NULL REFERENCES "Subject"("id") ON DELETE CASCADE,
        "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
        "semester" TEXT NOT NULL DEFAULT 'HK1_2026',
        "columnKey" TEXT NOT NULL,
        "oldScore" DOUBLE PRECISION,
        "newScore" DOUBLE PRECISION NOT NULL,
        "reason" TEXT NOT NULL,
        "proofUrl" TEXT,
        "status" "GradeChangeStatus" NOT NULL DEFAULT 'PENDING_HOMEROOM',
        "requestedById" TEXT NOT NULL REFERENCES "User"("id"),
        "homeroomConfirmedById" TEXT REFERENCES "User"("id"),
        "homeroomNote" TEXT,
        "homeroomConfirmedAt" TIMESTAMP(3),
        "approvedById" TEXT REFERENCES "User"("id"),
        "adminNote" TEXT,
        "approvedAt" TIMESTAMP(3),
        "rejectedById" TEXT REFERENCES "User"("id"),
        "rejectionReason" TEXT,
        "rejectedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "GradeChangeRequest_studentId_idx" ON "GradeChangeRequest"("studentId");
      CREATE INDEX IF NOT EXISTS "GradeChangeRequest_classId_subjectId_idx" ON "GradeChangeRequest"("classId", "subjectId");
      CREATE INDEX IF NOT EXISTS "GradeChangeRequest_status_idx" ON "GradeChangeRequest"("status");
      CREATE INDEX IF NOT EXISTS "GradeChangeRequest_requestedById_idx" ON "GradeChangeRequest"("requestedById");
    `);

    // 8. Bảng OutboxEvent & ProcessedEvent
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "OutboxEvent" (
        "id" TEXT PRIMARY KEY,
        "aggregateType" TEXT NOT NULL,
        "aggregateId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "version" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP(3)
      );
      CREATE INDEX IF NOT EXISTS "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");
      CREATE INDEX IF NOT EXISTS "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

      CREATE TABLE IF NOT EXISTS "ProcessedEvent" (
        "eventId" TEXT PRIMARY KEY,
        "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Đã áp dụng toàn bộ migrations CSDL thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi áp dụng migration:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('apply_pending_migrations.js')) {
  applyPendingMigrations().catch(console.error);
}
