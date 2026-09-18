import prisma from '../prismaClient.js';

/**
 * GET /api/departments
 * Lấy danh sách tất cả các Tổ chuyên môn kèm thông tin tổ trưởng, danh sách môn và số lượng giáo viên
 */
export const getDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            include: {
                headTeacher: {
                    select: {
                        id: true,
                        teacherCode: true,
                        fullName: true,
                        phone: true,
                        position: true
                    }
                },
                deputyTeacher: {
                    select: {
                        id: true,
                        teacherCode: true,
                        fullName: true,
                        phone: true,
                        position: true
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
                teachers: {
                    select: {
                        id: true,
                        teacherCode: true,
                        fullName: true,
                        position: true,
                        specialization: true,
                        academicDegree: true,
                        workStatus: true,
                        user: {
                            select: { status: true, email: true }
                        }
                    }
                },
                _count: {
                    select: {
                        teachers: true,
                        subjects: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách Tổ chuyên môn:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách tổ chuyên môn' });
    }
};

/**
 * GET /api/departments/:id
 * Chi tiết một Tổ chuyên môn
 */
export const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                headTeacher: true,
                deputyTeacher: true,
                subjects: true,
                teachers: {
                    include: {
                        user: {
                            select: { email: true, status: true }
                        }
                    }
                }
            }
        });

        if (!department) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tổ chuyên môn' });
        }

        res.json({ success: true, data: department });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết Tổ chuyên môn:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy chi tiết tổ chuyên môn' });
    }
};

/**
 * POST /api/departments
 * Tạo mới Tổ chuyên môn
 */
export const createDepartment = async (req, res) => {
    try {
        const { code, name, description, headTeacherId, deputyTeacherId } = req.body;

        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã tổ và tên tổ chuyên môn là bắt buộc' });
        }

        const existing = await prisma.department.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Mã tổ chuyên môn đã tồn tại' });
        }

        const dept = await prisma.department.create({
            data: {
                code,
                name,
                description,
                headTeacherId: headTeacherId || null,
                deputyTeacherId: deputyTeacherId || null
            }
        });

        res.status(201).json({ success: true, data: dept, message: 'Tạo tổ chuyên môn thành công' });
    } catch (error) {
        console.error('Lỗi khi tạo tổ chuyên môn:', error);
        res.status(500).json({ success: false, message: 'Không thể tạo tổ chuyên môn' });
    }
};

/**
 * PUT /api/departments/:id
 * Cập nhật Tổ chuyên môn
 */
export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, headTeacherId, deputyTeacherId } = req.body;

        const updated = await prisma.department.update({
            where: { id },
            data: {
                name,
                description,
                headTeacherId: headTeacherId || null,
                deputyTeacherId: deputyTeacherId || null
            }
        });

        res.json({ success: true, data: updated, message: 'Cập nhật tổ chuyên môn thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật tổ chuyên môn:', error);
        res.status(500).json({ success: false, message: 'Không thể cập nhật tổ chuyên môn' });
    }
};
