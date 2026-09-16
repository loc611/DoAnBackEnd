import prisma from '../prismaClient.js';

/**
 * GET /api/teacher/profile-context
 * Trả về thông tin đầy đủ về vai trò của giáo viên đang đăng nhập:
 * 1. Danh sách các lớp & môn học được phân công giảng dạy (assignedClasses).
 * 2. Lớp đang chủ nhiệm (homeroomClass) nếu có.
 * 3. Cờ xác định vai trò (isHomeroomTeacher, isSubjectTeacher).
 */
export const getTeacherProfileContext = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Chưa đăng nhập hoặc không xác định được danh tính người dùng'
            });
        }

        // 1. Tìm bản ghi Giáo viên tương ứng với userId
        const teacher = await prisma.teacher.findFirst({
            where: { userId },
            include: {
                homeroomClasses: {
                    select: {
                        id: true,
                        className: true,
                        grade: true,
                        academicYear: true,
                        status: true,
                        _count: {
                            select: { students: true }
                        }
                    }
                },
                TeacherAssignment: {
                    include: {
                        Class: {
                            select: {
                                id: true,
                                className: true,
                                grade: true,
                                academicYear: true,
                                _count: {
                                    select: { students: true }
                                }
                            }
                        },
                        Subject: {
                            select: {
                                id: true,
                                subjectCode: true,
                                name: true
                            }
                        }
                    }
                },
                subjects: {
                    select: {
                        id: true,
                        subjectCode: true,
                        name: true
                    }
                }
            }
        });

        // Nếu user là Admin/Ban Giám Hiệu nhưng muốn gọi context (fallback an toàn)
        if (!teacher) {
            if (req.user?.role === 'admin' || req.user?.role === 'principal') {
                return res.json({
                    success: true,
                    data: {
                        teacherInfo: {
                            id: 'admin',
                            teacherCode: 'ADMIN',
                            fullName: req.user.name || 'Quản trị viên',
                            specialization: 'Quản trị hệ thống'
                        },
                        academicYear: '2025-2026',
                        isHomeroomTeacher: true,
                        isSubjectTeacher: true,
                        homeroomClass: null,
                        assignedClasses: [],
                        isSuperUser: true
                    }
                });
            }

            return res.status(404).json({
                success: false,
                message: 'Tài khoản chưa được liên kết với hồ sơ Giáo viên'
            });
        }

        // 2. Xác định lớp chủ nhiệm
        let homeroomClass = null;
        if (teacher.homeroomClasses && teacher.homeroomClasses.length > 0) {
            const cls = teacher.homeroomClasses[0];
            homeroomClass = {
                classId: cls.id,
                className: cls.className,
                gradeLevel: cls.grade,
                academicYear: cls.academicYear,
                totalStudents: cls._count?.students || 0
            };
        } else {
            // Kiểm tra thêm bảng HomeroomAssignment phòng trường hợp phân công theo năm học
            try {
                const hrAssign = await prisma.homeroomAssignment.findFirst({
                    where: { teacherId: teacher.id },
                    include: {
                        Class: {
                            select: {
                                id: true,
                                className: true,
                                grade: true,
                                academicYear: true,
                                _count: {
                                    select: { students: true }
                                }
                            }
                        }
                    }
                });
                if (hrAssign?.Class) {
                    homeroomClass = {
                        classId: hrAssign.Class.id,
                        className: hrAssign.Class.className,
                        gradeLevel: hrAssign.Class.grade,
                        academicYear: hrAssign.Class.academicYear,
                        totalStudents: hrAssign.Class._count?.students || 0
                    };
                }
            } catch (err) {
                // Ignore if model does not exist or fails
            }
        }

        // 3. Chuẩn hóa danh sách lớp phân công bộ môn
        const assignedClasses = [];
        if (teacher.TeacherAssignment && teacher.TeacherAssignment.length > 0) {
            teacher.TeacherAssignment.forEach(assign => {
                if (assign.Class && assign.Subject) {
                    assignedClasses.push({
                        assignmentId: assign.id,
                        classId: assign.Class.id,
                        className: assign.Class.className,
                        gradeLevel: assign.Class.grade,
                        academicYear: assign.Class.academicYear,
                        totalStudents: assign.Class._count?.students || 0,
                        subjectId: assign.Subject.id,
                        subjectCode: assign.Subject.subjectCode,
                        subjectName: assign.Subject.name
                    });
                }
            });
        }

        // Nếu TeacherAssignment rỗng nhưng teacher có liên kết môn học, query các lớp cùng khối môn
        if (assignedClasses.length === 0 && teacher.subjects && teacher.subjects.length > 0) {
            try {
                const allClasses = await prisma.class.findMany({
                    where: { status: 'active' },
                    take: 5,
                    include: {
                        _count: { select: { students: true } }
                    }
                });
                teacher.subjects.forEach(sub => {
                    allClasses.forEach(cls => {
                        assignedClasses.push({
                            assignmentId: `auto-${cls.id}-${sub.id}`,
                            classId: cls.id,
                            className: cls.className,
                            gradeLevel: cls.grade,
                            academicYear: cls.academicYear,
                            totalStudents: cls._count?.students || 0,
                            subjectId: sub.id,
                            subjectCode: sub.subjectCode,
                            subjectName: sub.name
                        });
                    });
                });
            } catch (fallbackErr) {
                // Ignore fallback error
            }
        }

        const isHomeroom = Boolean(homeroomClass);

        return res.json({
            success: true,
            data: {
                teacherInfo: {
                    id: teacher.id,
                    teacherCode: teacher.teacherCode,
                    fullName: teacher.fullName,
                    specialization: teacher.specialization,
                    position: teacher.position
                },
                academicYear: homeroomClass?.academicYear || '2025-2026',
                isHomeroomTeacher: isHomeroom,
                isSubjectTeacher: assignedClasses.length > 0,
                homeroomClass,
                assignedClasses,
                permissions: {
                    canManageHomeroom: isHomeroom,
                    canManageSubjects: assignedClasses.length > 0
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy context phân hệ giáo viên:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi lấy dữ liệu ngữ cảnh giáo viên'
        });
    }
};
