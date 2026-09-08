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
    `);

    console.log('✅ Đã đồng bộ thành công toàn bộ các bảng và cột CSDL!');
  } catch (err) {
    console.error('❌ Lỗi khi đồng bộ CSDL:', err);
  } finally {
    await pool.end();
  }
}

syncSchema();
