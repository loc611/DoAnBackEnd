# TÀI LIỆU THIẾT KẾ PHÂN HỆ GIÁO VIÊN (TEACHER PORTAL ARCHITECTURE)

Hệ thống phân quyền (RBAC & ABAC) và giao diện Teacher Portal chuyên sâu cho trường THPT/THCS trên nền tảng **Node.js/TypeScript**, **Neon PostgreSQL (Prisma ORM)** và **React / Tailwind CSS**.

---

## 1. Yêu Cầu & Nguyên Tắc Cốt Lõi
- **1 Tài khoản duy nhất:** Mỗi giáo viên đăng nhập bằng một email/username duy nhất (`role: teacher`).
- **Tự động nhận diện vai trò kép:** Hệ thống tự động xác định giáo viên đang đảm nhận:
  - **Giáo viên Bộ môn (Subject Teacher):** Dạy nhiều môn ở nhiều lớp khác nhau theo bảng phân công `TeacherAssignment`.
  - **Giáo viên Chủ nhiệm (Homeroom Teacher):** Quản lý toàn diện 1 lớp cụ thể (`homeroomTeacherId` trên `Class`). Một giáo viên chỉ được làm chủ nhiệm tối đa 1 lớp trong cùng 1 năm học.
- **Phân tách góc nhìn (View Toggle):** Giáo viên có thể chuyển đổi mượt mà giữa "Góc nhìn Bộ môn" và "Góc nhìn Chủ nhiệm" để không bị phân tán thông tin.

---

## 2. Cấu Trúc File Blueprint Trong Thư Mục Này
```
docs/teacher-portal/
├── schema.prisma         # Schema CSDL chuẩn hóa quan hệ và ràng buộc cho Neon Postgres
├── teacherGuards.ts      # 2 Guards Middleware: canManageSubjectGrades & isHomeroomTeacher
├── TeacherContext.tsx    # React Context lưu trữ ngữ cảnh vai trò & viewMode (localStorage)
├── RoleSwitcher.tsx      # Nút chuyển đổi góc nhìn (Bộ môn vs Chủ nhiệm)
├── TeacherSidebar.tsx    # Sidebar thông minh tự ẩn/hiện mục theo phân quyền
└── README.md             # Hướng dẫn chi tiết này
```

---

## 3. Ràng Buộc Cơ Sở Dữ Liệu (Neon Postgres)
- **1 GV chỉ chủ nhiệm 1 lớp / năm học:**
  ```prisma
  model Class {
    ...
    homeroomTeacherId String?
    academicYear      String
    @@unique([homeroomTeacherId, academicYear])
  }
  ```
- **1 GV chỉ dạy 1 môn ở 1 lớp trong 1 năm học duy nhất 1 phân công:**
  ```prisma
  model TeacherAssignment {
    teacherId    String
    classId      String
    subjectId    String
    academicYear String
    @@unique([teacherId, classId, subjectId, academicYear])
  }
  ```
- **Điểm số Granular (`GradeEntry`):**
  Lưu trữ độc lập từng cột điểm (Miệng, 15p, 1 tiết, Giữa kỳ, Cuối kỳ) kèm hệ số (`weight`), thời gian nhập và giáo viên nhập (`enteredById`) để phục vụ kiểm toán (Audit Trail).

---

## 4. Middleware Guards
1. **`canManageSubjectGrades`**:
   - Truy vấn `TeacherAssignment` với `teacherId`, `classId`, `subjectId`, `academicYear`.
   - Chặn nếu giáo viên không có phân công.
   - Tự động bypass cho tài khoản `ADMIN` và `PRINCIPAL`.
2. **`isHomeroomTeacher`**:
   - Truy vấn `Class` với `id: classId` và `homeroomTeacherId: teacherId`.
   - Chặn các hành vi điểm danh, xét hạnh kiểm nếu không phải GVCN lớp đó.
   - Tự động bypass cho tài khoản `ADMIN` và `PRINCIPAL`.
