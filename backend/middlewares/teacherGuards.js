import prisma from '../prismaClient.js';

/**
 * Helper: Kiểm tra vai trò Quản trị viên / Ban giám hiệu để bypass
 */
const isBypassUser = (user) => {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    const position = (user.teacher?.position || user.position || '').toLowerCase();
    return (
        role === 'admin' ||
        role === 'principal' ||
        position.includes('hiệu trưởng') ||
        position.includes('quản trị')
    );
};

/**
 * Helper: Lấy teacher ID từ req.user
 */
const getTeacherId = async (user) => {
    if (user.teacher?.id) return user.teacher.id;
    if (user.teacherId) return user.teacherId;

    const teacher = await prisma.teacher.findFirst({
        where: { userId: user.id },
        select: { id: true }
    });
    return teacher ? teacher.id : null;
};

/**
 * 1. Middleware: canManageSubjectGrades
 * Chỉ cho phép chỉnh sửa điểm số nếu giáo viên đó có phân công giảng dạy (TeacherAssignment)
 * tương ứng với classId và subjectId.
 * Hỗ trợ Bypass cho Admin / Hiệu trưởng.
 */
export const canManageSubjectGrades = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập' });
        }

        // Kiểm tra quyền bypass của Admin / Ban Giám Hiệu
        if (isBypassUser(user)) {
            return next();
        }

        const classId = req.params.classId || req.body.classId || req.query.classId;
        const subjectId = req.params.subjectId || req.body.subjectId || req.query.subjectId;

        if (!classId || !subjectId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin classId hoặc subjectId để xác minh phân công giảng dạy'
            });
        }

        const teacherId = await getTeacherId(user);
        if (!teacherId) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn không được liên kết với hồ sơ Giáo viên'
            });
        }

        // Tìm bản ghi phân công trong TeacherAssignment
        const assignment = await prisma.teacherAssignment.findFirst({
            where: {
                teacherId,
                classId,
                subjectId
            }
        });

        // Nếu chưa có bảng TeacherAssignment chi tiết nhưng giáo viên phụ trách môn này
        if (!assignment) {
            const subjectTeacher = await prisma.subject.findFirst({
                where: {
                    id: subjectId,
                    teacherId
                }
            });

            if (!subjectTeacher) {
                return res.status(403).json({
                    success: false,
                    message: 'Từ chối quyền: Bạn không được phân công giảng dạy môn học này tại lớp được yêu cầu'
                });
            }
        }

        req.isAuthorizedSubjectTeacher = true;
        next();
    } catch (error) {
        console.error('Lỗi kiểm tra quyền canManageSubjectGrades:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xác minh quyền hạn bộ môn' });
    }
};

/**
 * 2. Middleware: isHomeroomTeacher
 * Chỉ cho phép điểm danh, đánh giá hạnh kiểm nếu giáo viên đó là GVCN của lớp (Class.homeroomTeacherId).
 * Hỗ trợ Bypass cho Admin / Hiệu trưởng.
 */
export const isHomeroomTeacher = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập' });
        }

        // Kiểm tra quyền bypass của Admin / Ban Giám Hiệu
        if (isBypassUser(user)) {
            return next();
        }

        const classId = req.params.classId || req.body.classId || req.query.classId;
        if (!classId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã lớp học (classId) để xác minh quyền Giáo viên chủ nhiệm'
            });
        }

        const teacherId = await getTeacherId(user);
        if (!teacherId) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn không được liên kết với hồ sơ Giáo viên'
            });
        }

        // Kiểm tra trực tiếp trên model Class
        const targetClass = await prisma.class.findFirst({
            where: {
                id: classId,
                homeroomTeacherId: teacherId
            }
        });

        if (!targetClass) {
            // Kiểm tra thêm bảng HomeroomAssignment phòng trường hợp phân công theo năm
            let hasHomeroomAssignment = false;
            try {
                const hrAssign = await prisma.homeroomAssignment.findFirst({
                    where: {
                        classId,
                        teacherId
                    }
                });
                if (hrAssign) hasHomeroomAssignment = true;
            } catch (err) {
                // Ignore
            }

            if (!hasHomeroomAssignment) {
                return res.status(403).json({
                    success: false,
                    message: 'Từ chối quyền: Bạn không phải là Giáo viên chủ nhiệm của lớp này'
                });
            }
        }

        req.isAuthorizedHomeroomTeacher = true;
        next();
    } catch (error) {
        console.error('Lỗi kiểm tra quyền isHomeroomTeacher:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xác minh quyền Giáo viên chủ nhiệm' });
    }
};
