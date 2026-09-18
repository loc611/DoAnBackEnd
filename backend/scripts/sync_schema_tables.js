import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function syncSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔄 Đang đồng bộ cấu trúc CSDL PostgreSQL...');

    await pool.query(`
      -- Role Table
      CREATE TABLE IF NOT EXISTS "Role" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL,
        "displayName" TEXT NOT NULL,
        "description" TEXT,
        "isSystem" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- UserRole Table
      CREATE TABLE IF NOT EXISTS "UserRole" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "roleId" TEXT NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserRole_userId_roleId_key" UNIQUE ("userId", "roleId")
      );

      -- Permission Table
      CREATE TABLE IF NOT EXISTS "Permission" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL,
        "action" TEXT NOT NULL,
        "resourceType" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- RolePermission Table
      CREATE TABLE IF NOT EXISTS "RolePermission" (
        "id" TEXT PRIMARY KEY,
        "roleId" TEXT NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
        "permissionId" TEXT NOT NULL REFERENCES "Permission"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RolePermission_roleId_permissionId_key" UNIQUE ("roleId", "permissionId")
      );

      -- SchoolYear Table
      CREATE TABLE IF NOT EXISTS "SchoolYear" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "isCurrent" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- GradingWindow Table
      CREATE TABLE IF NOT EXISTS "GradingWindow" (
        "id" TEXT PRIMARY KEY,
        "schoolYearId" TEXT NOT NULL REFERENCES "SchoolYear"("id") ON DELETE CASCADE,
        "semester" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'open',
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "lockDate" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GradingWindow_schoolYearId_semester_key" UNIQUE ("schoolYearId", "semester")
      );

      -- Parent Table
      CREATE TABLE IF NOT EXISTS "Parent" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "fullName" TEXT NOT NULL,
        "phone" TEXT,
        "email" TEXT,
        "address" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- GuardianLink Table
      CREATE TABLE IF NOT EXISTS "GuardianLink" (
        "id" TEXT PRIMARY KEY,
        "parentId" TEXT NOT NULL REFERENCES "Parent"("id") ON DELETE CASCADE,
        "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
        "relationshipType" TEXT NOT NULL DEFAULT 'father',
        "custodyType" TEXT NOT NULL DEFAULT 'full',
        "accessGrades" BOOLEAN NOT NULL DEFAULT true,
        "accessFinances" BOOLEAN NOT NULL DEFAULT true,
        "isEmergencyContact" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GuardianLink_parentId_studentId_key" UNIQUE ("parentId", "studentId")
      );

      -- TeacherAssignment Table
      CREATE TABLE IF NOT EXISTS "TeacherAssignment" (
        "id" TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
        "subjectId" TEXT NOT NULL REFERENCES "Subject"("id") ON DELETE CASCADE,
        "schoolYearId" TEXT NOT NULL REFERENCES "SchoolYear"("id") ON DELETE CASCADE,
        "semester" TEXT NOT NULL DEFAULT 'All',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TeacherAssignment_all_key" UNIQUE ("teacherId", "classId", "subjectId", "schoolYearId", "semester")
      );

      -- HomeroomAssignment Table
      CREATE TABLE IF NOT EXISTS "HomeroomAssignment" (
        "id" TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL REFERENCES "Teacher"("id") ON DELETE CASCADE,
        "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
        "schoolYearId" TEXT NOT NULL REFERENCES "SchoolYear"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HomeroomAssignment_class_school_key" UNIQUE ("classId", "schoolYearId")
      );

      -- AuditLog Table
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "action" TEXT NOT NULL,
        "resourceType" TEXT NOT NULL,
        "resourceId" TEXT,
        "oldValue" JSONB,
        "newValue" JSONB,
        "reason" TEXT,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "severity" TEXT NOT NULL DEFAULT 'info',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to Teacher if needed
      ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT 'Giáo viên bộ môn';

      -- Add missing columns to User if needed
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';

      -- Add missing columns to Grade if needed
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'draft';
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "schoolYearId" TEXT;
      ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "conductScore" TEXT DEFAULT 'Tốt';

      -- Add missing columns to Class if needed
      ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "schoolYearId" TEXT;
      ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "academicYear" TEXT DEFAULT '2025-2026';
      ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';

      -- Add missing unique constraint on Attendance if not present
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_studentId_classId_date_session_key'
        ) THEN
          ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_classId_date_session_key" UNIQUE ("studentId", "classId", "date", "session");
        END IF;
      END $$;

      -- Add missing columns to FeeProfile if needed
      ALTER TABLE "FeeProfile" ADD COLUMN IF NOT EXISTS "targetClassIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

      -- Add missing demographic and version columns to Student
      ALTER TABLE "Student" ALTER COLUMN "status" TYPE TEXT;
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

      -- AbsenceStatus new values
      DO $$ BEGIN
        ALTER TYPE "AbsenceStatus" ADD VALUE IF NOT EXISTS 'PENDING_HOMEROOM';
      EXCEPTION WHEN others THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TYPE "AbsenceStatus" ADD VALUE IF NOT EXISTS 'PENDING_ADMIN';
      EXCEPTION WHEN others THEN null;
      END $$;

      -- GradeChangeStatus Enum
      DO $$ BEGIN
        CREATE TYPE "GradeChangeStatus" AS ENUM ('PENDING_HOMEROOM', 'PENDING_ADMIN', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      -- StudentHealthRecord Table
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

      -- StudentDocument Table
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

      -- GradeChangeRequest Table
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

      -- Transactional Outbox & ProcessedEvent Tables
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

    console.log('✅ Đã đồng bộ thành công toàn bộ các bảng và cột CSDL!');
  } catch (err) {
    console.error('❌ Lỗi khi đồng bộ CSDL:', err);
  } finally {
    await pool.end();
  }
}

syncSchema();
