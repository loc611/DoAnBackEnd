import prisma from '../prismaClient.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const { academicYear, semester } = req.query;
        
        const feeProfileFilter = {};
        if (academicYear) feeProfileFilter.academicYear = academicYear;
        if (semester) feeProfileFilter.semester = semester;

        const bills = await prisma.feeBill.findMany({
            where: Object.keys(feeProfileFilter).length > 0 ? { feeProfile: feeProfileFilter } : {},
            include: {
                feeProfile: true,
                student: {
                    include: { class: true }
                }
            }
        });

        let tongThuDuKien = 0;
        let tongDaThu = 0;
        let tongConNo = 0;
        let paidCount = 0;
        const classDebtsMap = {};

        for (const bill of bills) {
            const amount = bill.feeProfile?.amount || 0;
            tongThuDuKien += amount;
            if (bill.status === 'paid') {
                tongDaThu += amount;
                paidCount++;
            } else {
                tongConNo += amount;
                const className = bill.student?.class?.className || 'Chưa xếp lớp';
                if (!classDebtsMap[className]) {
                    classDebtsMap[className] = { className, tongNo: 0, studentIds: new Set() };
                }
                classDebtsMap[className].tongNo += amount;
                if (bill.studentId) {
                    classDebtsMap[className].studentIds.add(bill.studentId);
                }
            }
        }

        const tyLeHoanThanh = bills.length > 0 ? Number(((paidCount / bills.length) * 100).toFixed(2)) : 0;
        const topClasses = Object.values(classDebtsMap)
            .map(item => ({
                className: item.className,
                tongNo: item.tongNo,
                soHocSinhNo: item.studentIds.size
            }))
            .sort((a, b) => b.tongNo - a.tongNo)
            .slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                Tong_Thu_Du_Kien: tongThuDuKien,
                Tong_Da_Thu: tongDaThu,
                Tong_Con_No: tongConNo,
                Ty_Le_Hoan_Thanh: tyLeHoanThanh,
                Danh_Sach_Lop_Chua_Nop_Khieu: topClasses
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

// Tra cứu nhanh học phí theo Mã học sinh hoặc Tên học sinh
export const lookupStudentFee = async (req, res) => {
    try {
        const { search, academicYear, semester } = req.query;

        if (!search || !search.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập Mã học sinh hoặc Họ tên để tra cứu' });
        }

        const keyword = search.trim();

        // Tìm học sinh theo studentCode hoặc fullName
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    { studentCode: { contains: keyword, mode: 'insensitive' } },
                    { fullName: { contains: keyword, mode: 'insensitive' } }
                ]
            },
            take: 10,
            include: {
                class: true,
                feeBills: {
                    where: {
                        ...(academicYear || semester ? {
                            feeProfile: {
                                ...(academicYear ? { academicYear } : {}),
                                ...(semester ? { semester } : {})
                            }
                        } : {})
                    },
                    include: {
                        feeProfile: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error in lookupStudentFee:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tra cứu học phí học sinh' });
    }
};

// Lấy danh sách toàn bộ học sinh trong một Lớp kèm tình trạng học phí
export const getClassStudentsTuition = async (req, res) => {
    try {
        const { classId } = req.params;
        const { academicYear, semester } = req.query;

        const classInfo = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                homeroomTeacher: {
                    select: {
                        fullName: true,
                        teacherCode: true,
                        phone: true
                    }
                }
            }
        });

        if (!classInfo) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
        }

        const students = await prisma.student.findMany({
            where: { classId },
            orderBy: { fullName: 'asc' },
            include: {
                feeBills: {
                    where: {
                        ...(academicYear || semester ? {
                            feeProfile: {
                                ...(academicYear ? { academicYear } : {}),
                                ...(semester ? { semester } : {})
                            }
                        } : {})
                    },
                    include: {
                        feeProfile: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        let totalClassAmount = 0;
        let totalPaidAmount = 0;
        let totalUnpaidAmount = 0;
        let fullyPaidStudentsCount = 0;

        const enrichedStudents = students.map(st => {
            const studentTotal = (st.feeBills || []).reduce((sum, b) => sum + (b.feeProfile?.amount || 0), 0);
            const studentPaid = (st.feeBills || []).filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.feeProfile?.amount || 0), 0);
            const studentUnpaid = studentTotal - studentPaid;

            totalClassAmount += studentTotal;
            totalPaidAmount += studentPaid;
            totalUnpaidAmount += studentUnpaid;

            let paymentStatus = 'no_bills';
            if (st.feeBills?.length > 0) {
                if (studentUnpaid === 0) {
                    paymentStatus = 'fully_paid';
                    fullyPaidStudentsCount++;
                } else if (studentPaid > 0) {
                    paymentStatus = 'partial_paid';
                } else {
                    paymentStatus = 'unpaid';
                }
            }

            return {
                ...st,
                studentTotal,
                studentPaid,
                studentUnpaid,
                paymentStatus
            };
        });

        const totalStudents = students.length;
        const completionRate = totalClassAmount > 0 
            ? Number(((totalPaidAmount / totalClassAmount) * 100).toFixed(1)) 
            : 0;

        res.status(200).json({
            success: true,
            data: {
                classInfo,
                stats: {
                    totalStudents,
                    fullyPaidStudentsCount,
                    unpaidStudentsCount: totalStudents - fullyPaidStudentsCount,
                    totalClassAmount,
                    totalPaidAmount,
                    totalUnpaidAmount,
                    completionRate
                },
                students: enrichedStudents
            }
        });
    } catch (error) {
        console.error('Error in getClassStudentsTuition:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách học sinh theo lớp' });
    }
};

// Gạch nợ tất cả các khoản chưa nộp của một học sinh
export const payAllStudentBills = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { academicYear, semester } = req.body;

        const whereCondition = {
            studentId,
            status: 'unpaid',
            ...(academicYear || semester ? {
                feeProfile: {
                    ...(academicYear ? { academicYear } : {}),
                    ...(semester ? { semester } : {})
                }
            } : {})
        };

        const unpaidBills = await prisma.feeBill.findMany({
            where: whereCondition
        });

        if (unpaidBills.length === 0) {
            return res.status(200).json({ success: true, message: 'Học sinh không còn khoản nợ nào cần thanh toán' });
        }

        await prisma.feeBill.updateMany({
            where: {
                id: { in: unpaidBills.map(b => b.id) }
            },
            data: {
                status: 'paid',
                paidAt: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: `Đã gạch nợ thành công ${unpaidBills.length} khoản học phí`,
            paidCount: unpaidBills.length
        });
    } catch (error) {
        console.error('Error in payAllStudentBills:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi gạch nợ toàn bộ' });
    }
};
