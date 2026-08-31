/**
 * Kiểm tra định dạng số điện thoại Việt Nam 10 chữ số (bắt đầu bằng 0)
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    return /^0\d{9}$/.test(String(phone).trim());
};

/**
 * Kiểm tra định dạng Mã học sinh (bắt đầu bằng HS và theo sau là 3-10 chữ số, ví dụ HS123456, HS0001)
 * @param {string} code
 * @returns {boolean}
 */
export const isValidStudentCode = (code) => {
    if (!code) return false;
    return /^HS\d{3,10}$/i.test(String(code).trim());
};

/**
 * Kiểm tra định dạng Mã giáo viên (bắt đầu bằng GV và theo sau là 3-10 chữ số, ví dụ GV123456, GV0001)
 * @param {string} code
 * @returns {boolean}
 */
export const isValidTeacherCode = (code) => {
    if (!code) return false;
    return /^GV\d{3,10}$/i.test(String(code).trim());
};

/**
 * Kiểm tra định dạng Mã môn học (chữ cái, chữ số, gạch nối hoặc gạch dưới, không dấu và không khoảng trắng, 2-20 ký tự)
 * @param {string} code
 * @returns {boolean}
 */
export const isValidSubjectCode = (code) => {
    if (!code) return false;
    return /^[A-Za-z0-9_-]{2,20}$/.test(String(code).trim());
};

/**
 * Kiểm tra số điện thoại cá nhân đã tồn tại trong toàn bộ hệ thống hay chưa (Admin, Teacher, Student)
 * @param {object} prismaClient Prisma client instance
 * @param {string} phone Số điện thoại cần kiểm tra
 * @param {object} options Các ID cần loại trừ khi cập nhật: { excludeAdminId, excludeTeacherId, excludeStudentId, excludeUserId }
 * @returns {Promise<boolean>} true nếu số điện thoại đã tồn tại
 */
export const isPhoneTakenInSystem = async (prismaClient, phone, options = {}) => {
    if (!phone) return false;
    const cleanPhone = String(phone).trim();
    const { excludeAdminId, excludeTeacherId, excludeStudentId, excludeUserId } = options;

    const [adminMatch, teacherMatch, studentMatch] = await Promise.all([
        prismaClient.admin.findFirst({
            where: {
                phone: cleanPhone,
                ...(excludeAdminId ? { id: { not: excludeAdminId } } : {}),
                ...(excludeUserId ? { userId: { not: excludeUserId } } : {})
            }
        }),
        prismaClient.teacher.findFirst({
            where: {
                phone: cleanPhone,
                ...(excludeTeacherId ? { id: { not: excludeTeacherId } } : {}),
                ...(excludeUserId ? { userId: { not: excludeUserId } } : {})
            }
        }),
        prismaClient.student.findFirst({
            where: {
                phone: cleanPhone,
                ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
                ...(excludeUserId ? { userId: { not: excludeUserId } } : {})
            }
        })
    ]);

    return !!(adminMatch || teacherMatch || studentMatch);
};

/**
 * Kiểm tra mã học sinh đã tồn tại trong hệ thống chưa
 * @param {object} prismaClient
 * @param {string} studentCode
 * @param {string|null} excludeStudentId
 * @returns {Promise<boolean>}
 */
export const isStudentCodeTaken = async (prismaClient, studentCode, excludeStudentId = null) => {
    if (!studentCode) return false;
    const cleanCode = String(studentCode).trim().toUpperCase();
    const existing = await prismaClient.student.findFirst({
        where: {
            studentCode: { equals: cleanCode, mode: 'insensitive' },
            ...(excludeStudentId ? { id: { not: excludeStudentId } } : {})
        }
    });
    return !!existing;
};

/**
 * Kiểm tra mã giáo viên đã tồn tại trong hệ thống chưa
 * @param {object} prismaClient
 * @param {string} teacherCode
 * @param {string|null} excludeTeacherId
 * @returns {Promise<boolean>}
 */
export const isTeacherCodeTaken = async (prismaClient, teacherCode, excludeTeacherId = null) => {
    if (!teacherCode) return false;
    const cleanCode = String(teacherCode).trim().toUpperCase();
    const existing = await prismaClient.teacher.findFirst({
        where: {
            teacherCode: { equals: cleanCode, mode: 'insensitive' },
            ...(excludeTeacherId ? { id: { not: excludeTeacherId } } : {})
        }
    });
    return !!existing;
};
