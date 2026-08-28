import prisma from '../prismaClient.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const { academicYear, semester } = req.query;
        
        let paramsTotal = [];
        let paramsClass = [];
        let whereClauseTotal = '';
        let whereClauseClass = '';

        if (academicYear && semester) {
            whereClauseTotal = 'WHERE fp."academicYear" = $1 AND fp."semester" = $2';
            whereClauseClass = 'AND fp."academicYear" = $1 AND fp."semester" = $2';
            paramsTotal = [academicYear, semester];
            paramsClass = [academicYear, semester];
        } else if (academicYear) {
            whereClauseTotal = 'WHERE fp."academicYear" = $1';
            whereClauseClass = 'AND fp."academicYear" = $1';
            paramsTotal = [academicYear];
            paramsClass = [academicYear];
        }

        // 1. Lấy số liệu tổng quan (Metrics 1, 2, 3, 4)
        const totalQuery = `
            SELECT 
                COALESCE(SUM(fp.amount), 0) as "Tong_Thu_Du_Kien",
                COALESCE(SUM(CASE WHEN fb.status = 'paid' THEN fp.amount ELSE 0 END), 0) as "Tong_Da_Thu",
                COALESCE(SUM(CASE WHEN fb.status = 'unpaid' THEN fp.amount ELSE 0 END), 0) as "Tong_Con_No",
                CASE 
                    WHEN COUNT(fb.id) = 0 THEN 0 
                    ELSE (COUNT(CASE WHEN fb.status = 'paid' THEN 1 END)::float / COUNT(fb.id)) * 100 
                END as "Ty_Le_Hoan_Thanh"
            FROM admin."FeeBill" fb
            JOIN admin."FeeProfile" fp ON fb."feeProfileId" = fp.id
            ${whereClauseTotal}
        `;

        const totalResult = await prisma.$queryRawUnsafe(totalQuery, ...paramsTotal);

        // 2. Lấy danh sách Top 5 lớp nợ học phí cao nhất
        const topClassQuery = `
            SELECT 
                c."className",
                COALESCE(SUM(fp.amount), 0) as "tongNo",
                COUNT(DISTINCT fb."studentId") as "soHocSinhNo"
            FROM admin."FeeBill" fb
            JOIN admin."FeeProfile" fp ON fb."feeProfileId" = fp.id
            JOIN student."Student" s ON fb."studentId" = s.id
            JOIN teacher."Class" c ON s."classId" = c.id
            WHERE fb.status = 'unpaid' 
            ${whereClauseClass}
            GROUP BY c.id, c."className"
            ORDER BY "tongNo" DESC
            LIMIT 5
        `;

        const topClassResult = await prisma.$queryRawUnsafe(topClassQuery, ...paramsClass);

        // Định dạng kết quả
        const summary = totalResult[0] || {};
        
        res.status(200).json({
            success: true,
            data: {
                Tong_Thu_Du_Kien: Number(summary.Tong_Thu_Du_Kien || 0),
                Tong_Da_Thu: Number(summary.Tong_Da_Thu || 0),
                Tong_Con_No: Number(summary.Tong_Con_No || 0),
                Ty_Le_Hoan_Thanh: Number(Number(summary.Ty_Le_Hoan_Thanh || 0).toFixed(2)),
                Danh_Sach_Lop_Chua_Nop_Khieu: topClassResult.map(item => ({
                    className: item.className,
                    tongNo: Number(item.tongNo),
                    soHocSinhNo: Number(item.soHocSinhNo)
                }))
            }
        });

    } catch (error) {
        console.error('Error in getDashboardSummary:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy dữ liệu thống kê' });
    }
};

export const getDebtorsByClass = async (req, res) => {
    try {
        const { className } = req.params;
        const { academicYear, semester } = req.query;

        let whereClause = {
            status: 'unpaid',
            student: {
                class: {
                    className: className
                }
            }
        };

        if (academicYear) {
            whereClause.feeProfile = { ...whereClause.feeProfile, academicYear };
        }
        if (semester) {
            whereClause.feeProfile = { ...whereClause.feeProfile, semester };
        }

        const debtors = await prisma.feeBill.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        studentCode: true,
                        fullName: true,
                        parentPhone: true
                    }
                },
                feeProfile: {
                    select: {
                        name: true,
                        amount: true
                    }
                }
            },
            orderBy: {
                student: {
                    fullName: 'asc'
                }
            }
        });

        res.status(200).json({
            success: true,
            data: debtors
        });
    } catch (error) {
        console.error('Error in getDebtorsByClass:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách nợ' });
    }
};

export const getMyBills = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { userId: req.user.id }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học sinh' });
        }

        const bills = await prisma.feeBill.findMany({
            where: { studentId: student.id },
            include: {
                feeProfile: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            data: bills
        });
    } catch (error) {
        console.error('Error in getMyBills:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy hóa đơn học phí' });
    }
};

export const getStudentBills = async (req, res) => {
    try {
        const { studentId } = req.params;

        const bills = await prisma.feeBill.findMany({
            where: { studentId },
            include: {
                feeProfile: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            data: bills
        });
    } catch (error) {
        console.error('Error in getStudentBills:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy hóa đơn học sinh' });
    }
};

export const markBillAsPaid = async (req, res) => {
    try {
        const { billId } = req.params;

        const updatedBill = await prisma.feeBill.update({
            where: { id: billId },
            data: {
                status: 'paid',
                paidAt: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái thanh toán thành công',
            data: updatedBill
        });
    } catch (error) {
        console.error('Error in markBillAsPaid:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật thanh toán' });
    }
};
