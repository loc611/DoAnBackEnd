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
                teacherAssignments: {
                    include: {
                        class: {
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
                        subject: {
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
                        class: {
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
                if (hrAssign?.class) {
                    homeroomClass = {
                        classId: hrAssign.class.id,
                        className: hrAssign.class.className,
                        gradeLevel: hrAssign.class.grade,
                        academicYear: hrAssign.class.academicYear,
                        totalStudents: hrAssign.class._count?.students || 0
                    };
                }
            } catch (err) {
                // Ignore if model does not exist or fails
            }
        }

        // 3. Chuẩn hóa danh sách lớp phân công bộ môn
        const assignedClasses = [];
        if (teacher.teacherAssignments && teacher.teacherAssignments.length > 0) {
            teacher.teacherAssignments.forEach(assign => {
                if (assign.class && assign.subject) {
                    assignedClasses.push({
                        assignmentId: assign.id,
                        classId: assign.class.id,
                        className: assign.class.className,
                        gradeLevel: assign.class.grade,
                        academicYear: assign.class.academicYear,
                        totalStudents: assign.class._count?.students || 0,
                        subjectId: assign.subject.id,
                        subjectCode: assign.subject.subjectCode,
                        subjectName: assign.subject.name
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

/**
 * GET /api/teachers/:id
 * Lấy toàn bộ hồ sơ chi tiết giáo viên (cho BGH, Admin, Giáo viên)
 * Hỗ trợ tra cứu linh hoạt bằng: teacherCode (vd: GV007), Teacher UUID, hoặc User UUID
 */
export const getTeacherDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = (req.user?.role || '').toLowerCase();
        const isManagement = userRole === 'admin' || userRole === 'principal' || userRole === 'teacher';

        if (!isManagement) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập thông tin chi tiết giáo viên'
            });
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let teacher = await prisma.teacher.findFirst({
            where: isUUID
                ? { OR: [{ id }, { userId: id }, { teacherCode: id }] }
                : { teacherCode: id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                        status: true,
                        createdAt: true,
                        userRoles: {
                            include: {
                                role: true
                            }
                        }
                    }
                },
                department: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true
                    }
                },
                contracts: {
                    orderBy: { startDate: 'desc' }
                },
                evaluations: {
                    orderBy: { academicYear: 'desc' }
                },
                documents: {
                    orderBy: { uploadedAt: 'desc' }
                },
                substituteClasses: {
                    take: 10,
                    orderBy: { date: 'desc' },
                    include: {
                        originalTeacher: { select: { id: true, fullName: true, teacherCode: true } },
                        class: { select: { id: true, className: true } }
                    }
                },
                originalClasses: {
                    take: 10,
                    orderBy: { date: 'desc' },
                    include: {
                        substituteTeacher: { select: { id: true, fullName: true, teacherCode: true } },
                        class: { select: { id: true, className: true } }
                    }
                },
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
                teacherAssignments: {
                    include: {
                        class: {
                            select: {
                                id: true,
                                className: true,
                                grade: true,
                                academicYear: true,
                                _count: { select: { students: true } }
                            }
                        },
                        subject: {
                            select: {
                                id: true,
                                subjectCode: true,
                                name: true,
                                periodsPerWeek: true,
                                type: true
                            }
                        },
                        schoolYear: true
                    }
                },
                subjects: {
                    select: {
                        id: true,
                        subjectCode: true,
                        name: true,
                        periodsPerWeek: true
                    }
                },
                lessonLogs: {
                    take: 15,
                    orderBy: { date: 'desc' },
                    include: {
                        class: {
                            select: { id: true, className: true, grade: true }
                        },
                        subject: {
                            select: { id: true, name: true, subjectCode: true }
                        }
                    }
                }
            }
        });

        // Nếu chưa tìm thấy và tham số là UUID, thử tìm theo User role=teacher
        if (!teacher && isUUID) {
            const user = await prisma.user.findFirst({
                where: { id, role: 'teacher' },
                include: { teacher: true }
            });
            if (user?.teacher) {
                return getTeacherDetails({ ...req, params: { id: user.teacher.id } }, res);
            }
        }

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giáo viên trong hệ thống'
            });
        }

        // Lấy lịch giảng dạy (Schedules) của các lớp được phân công hoặc chủ nhiệm
        const assignedClassIds = Array.from(new Set([
            ...(teacher.teacherAssignments?.map(a => a.classId) || []),
            ...(teacher.homeroomClasses?.map(c => c.id) || [])
        ]));

        let schedules = [];
        if (assignedClassIds.length > 0) {
            schedules = await prisma.schedule.findMany({
                where: {
                    classId: { in: assignedClassIds }
                },
                include: {
                    class: {
                        select: { id: true, className: true, grade: true }
                    }
                }
            });
        }

        // Đếm tổng số tiết dạy dự kiến / tuần
        let totalPeriodsPerWeek = 0;
        teacher.teacherAssignments?.forEach(a => {
            totalPeriodsPerWeek += (a.periodsPerWeek || a.subject?.periodsPerWeek || 2);
        });

        const actualQuota = Math.max(0, (teacher.baseQuotas || 17) - (teacher.quotaReduction || 0));
        const deltaPeriods = totalPeriodsPerWeek - actualQuota;

        return res.json({
            success: true,
            data: {
                ...teacher,
                schedules,
                totalPeriodsPerWeek,
                actualQuota,
                deltaPeriods
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết giáo viên:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi tải thông tin chi tiết giáo viên'
        });
    }
};

/**
 * POST /api/teachers/:id/evaluations
 * Thêm hoặc cập nhật kết quả đánh giá chuẩn nghề nghiệp (Thông tư 20/2018/TT-BGDĐT)
 */
export const addTeacherEvaluation = async (req, res) => {
    try {
        const { id } = req.params;
        const { academicYear = '2025-2026', ratingLevel = 'TOT', criteriaScores, initiatives, initiativeTier, commendations } = req.body;

        const teacher = await prisma.teacher.findUnique({ where: { id } });
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên' });
        }

        const evaluation = await prisma.teacherEvaluation.upsert({
            where: {
                teacherId_academicYear: {
                    teacherId: id,
                    academicYear
                }
            },
            update: {
                ratingLevel,
                criteriaScores: criteriaScores || {},
                initiatives: initiatives || null,
                initiativeTier: initiativeTier || null,
                commendations: commendations || null,
                evaluatedById: req.user?.id
            },
            create: {
                teacherId: id,
                academicYear,
                ratingLevel,
                criteriaScores: criteriaScores || {},
                initiatives: initiatives || null,
                initiativeTier: initiativeTier || null,
                commendations: commendations || null,
                evaluatedById: req.user?.id
            }
        });

        res.json({ success: true, data: evaluation, message: 'Đã lưu đánh giá chuẩn nghề nghiệp' });
    } catch (error) {
        console.error('Lỗi khi lưu đánh giá chuẩn nghề nghiệp:', error);
        res.status(500).json({ success: false, message: 'Không thể lưu đánh giá giáo viên' });
    }
};

/**
 * POST /api/teachers/:id/documents
 * Thêm tài liệu số hóa cho hồ sơ giáo viên
 */
export const addTeacherDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType = 'OTHER', title, fileUrl, fileSizeBytes } = req.body;

        if (!title || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Tiêu đề và đường dẫn file là bắt buộc' });
        }

        const teacher = await prisma.teacher.findUnique({ where: { id } });
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giáo viên' });
        }

        const doc = await prisma.teacherDocument.create({
            data: {
                teacherId: id,
                documentType,
                title,
                fileUrl,
                fileSizeBytes: fileSizeBytes || 1024,
                isVerified: true,
                verifiedById: req.user?.id
            }
        });

        res.json({ success: true, data: doc, message: 'Lưu tài liệu thành công' });
    } catch (error) {
        console.error('Lỗi khi lưu tài liệu:', error);
        res.status(500).json({ success: false, message: 'Không thể lưu tài liệu' });
    }
};

/**
 * PUT /api/teachers/:id/profile
 * Cập nhật thông tin hồ sơ nhân sự (CCCD, Ngân hàng, Địa chỉ, Định mức)
 */
export const updateTeacherProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            fullName, phone, specialization, position, departmentId,
            nationalIdCard, address, bankAccountNumber, bankName, bankBranch,
            academicDegree, baseQuotas, quotaReduction, reductionReason,
            teacherType, workStatus
        } = req.body;

        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (phone !== undefined) updateData.phone = phone;
        if (specialization !== undefined) updateData.specialization = specialization;
        if (position !== undefined) updateData.position = position;
        if (departmentId !== undefined) updateData.departmentId = departmentId || null;
        if (nationalIdCard !== undefined) updateData.nationalIdCard = nationalIdCard;
        if (address !== undefined) updateData.address = address;
        if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber;
        if (bankName !== undefined) updateData.bankName = bankName;
        if (bankBranch !== undefined) updateData.bankBranch = bankBranch;
        if (academicDegree !== undefined) updateData.academicDegree = academicDegree;
        if (teacherType !== undefined) updateData.teacherType = teacherType;
        if (workStatus !== undefined) updateData.workStatus = workStatus;
        if (baseQuotas !== undefined) updateData.baseQuotas = parseInt(baseQuotas, 10) || 17;
        if (quotaReduction !== undefined) updateData.quotaReduction = parseInt(quotaReduction, 10) || 0;
        if (reductionReason !== undefined) updateData.reductionReason = reductionReason;

        const updated = await prisma.teacher.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, data: updated, message: 'Cập nhật hồ sơ thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật hồ sơ giáo viên:', error);
        res.status(500).json({ success: false, message: 'Không thể cập nhật hồ sơ' });
    }
};


