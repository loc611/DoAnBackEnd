import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { GOOGLE_APPS_SCRIPT_CODE } from '../config/googleAppsScriptTemplate.js';

/**
 * Lấy mã template Google Apps Script
 */
export const getScriptTemplate = async (req, res) => {
    res.json({
        success: true,
        script: GOOGLE_APPS_SCRIPT_CODE
    });
};

/**
 * Đồng bộ danh sách học sinh từ Google Sheet về Hệ Thống (Import / Smart Upsert)
 */
export const syncFromGoogleSheets = async (req, res) => {
    try {
        const webhookUrl = req.body.webhookUrl || process.env.GOOGLE_SHEET_WEBHOOK_URL;
        
        if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
            return res.status(400).json({ 
                message: 'Vui lòng cung cấp URL Google Apps Script Webhook hợp lệ (bắt đầu bằng https://script.google.com/)' 
            });
        }

        // Gọi Google Apps Script Webhook để lấy dữ liệu
        let response;
        try {
            response = await fetch(webhookUrl, {
                method: 'GET',
                redirect: 'follow',
                headers: { 'Accept': 'application/json' }
            });
        } catch (fetchErr) {
            console.error('Fetch error:', fetchErr);
            return res.status(502).json({ 
                message: 'Không thể kết nối đến Google Apps Script Webhook. Vui lòng kiểm tra lại URL hoặc quyền truy cập của Web App.',
                error: fetchErr.message 
            });
        }

        if (!response.ok) {
            return res.status(502).json({ 
                message: `Google Apps Script phản hồi lỗi HTTP ${response.status}: ${response.statusText}` 
            });
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.data)) {
            return res.status(400).json({ 
                message: 'Dữ liệu trả về từ Google Sheet không đúng định dạng mong đợi.',
                details: data 
            });
        }

        const sheetStudents = data.data;
        if (sheetStudents.length === 0) {
            return res.json({
                success: true,
                message: 'Không có dữ liệu học sinh nào trên Google Sheet (trang tính trống hoặc chỉ có tiêu đề).',
                added: 0,
                updated: 0,
                total: 0
            });
        }

        let addedCount = 0;
        let updatedCount = 0;
        const errors = [];

        // Cache classes để tránh truy vấn nhiều lần
        const classCache = new Map();
        const allClasses = await prisma.class.findMany();
        allClasses.forEach(c => classCache.set(c.className.toLowerCase(), c.id));

        for (const item of sheetStudents) {
            const rawCode = item.studentCode ? String(item.studentCode).trim() : '';
            const rawName = item.fullName ? String(item.fullName).trim() : '';

            if (!rawCode || !rawName) {
                errors.push(`Dòng thiếu mã học sinh hoặc họ tên: ${JSON.stringify(item)}`);
                continue;
            }

            try {
                // Xử lý Lớp học (Tìm lớp hoặc tự động tạo nếu chưa có)
                let classId = null;
                const className = item.className ? String(item.className).trim() : null;
                if (className) {
                    const classKey = className.toLowerCase();
                    if (classCache.has(classKey)) {
                        classId = classCache.get(classKey);
                    } else {
                        // Tự động suy ra khối (grade) từ tên lớp, vd "10A1" -> 10
                        const gradeMatch = className.match(/^(\d+)/);
                        const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : 10;
                        
                        const newClass = await prisma.class.create({
                            data: {
                                className: className,
                                grade: grade,
                                academicYear: '2026-2027',
                                status: 'active'
                            }
                        });
                        classId = newClass.id;
                        classCache.set(classKey, classId);
                    }
                }

                // Xử lý Ngày sinh
                let dateOfBirth = null;
                if (item.dateOfBirth) {
                    const parsedDate = new Date(item.dateOfBirth);
                    if (!isNaN(parsedDate.getTime())) {
                        dateOfBirth = parsedDate;
                    }
                }

                // Kiểm tra xem học sinh đã có trong DB chưa
                const existingStudent = await prisma.student.findUnique({
                    where: { studentCode: rawCode },
                    include: { user: true }
                });

                if (existingStudent) {
                    // Update thông tin học sinh
                    await prisma.$transaction(async (tx) => {
                        if (item.status && existingStudent.userId) {
                            await tx.user.update({
                                where: { id: existingStudent.userId },
                                data: { status: item.status.toLowerCase() === 'inactive' ? 'inactive' : 'active' }
                            });
                        }

                        await tx.student.update({
                            where: { id: existingStudent.id },
                            data: {
                                fullName: rawName,
                                gender: item.gender || existingStudent.gender || 'Nam',
                                phone: item.phone !== undefined ? String(item.phone) : existingStudent.phone,
                                parentPhone: item.parentPhone !== undefined ? String(item.parentPhone) : existingStudent.parentPhone,
                                address: item.address !== undefined ? String(item.address) : existingStudent.address,
                                dateOfBirth: dateOfBirth || existingStudent.dateOfBirth,
                                classId: classId !== null ? classId : existingStudent.classId
                            }
                        });
                    });
                    updatedCount++;
                } else {
                    // Tạo mới User + Student
                    const username = rawCode.toLowerCase();
                    const email = `${username}@school.edu.vn`;

                    // Kiểm tra username / email
                    const userExists = await prisma.user.findFirst({
                        where: { OR: [{ username }, { email }] }
                    });

                    const defaultPassword = `${rawCode}@123`;
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

                    await prisma.$transaction(async (tx) => {
                        let userId;
                        if (userExists) {
                            userId = userExists.id;
                        } else {
                            const newUser = await tx.user.create({
                                data: {
                                    username,
                                    email,
                                    password: hashedPassword,
                                    role: 'student',
                                    status: (item.status && item.status.toLowerCase() === 'inactive') ? 'inactive' : 'active'
                                }
                            });
                            userId = newUser.id;

                            const studentRole = await tx.role.findUnique({ where: { name: 'student' } });
                            if (studentRole) {
                                await tx.userRole.create({
                                    data: { userId: newUser.id, roleId: studentRole.id }
                                });
                            }
                        }

                        await tx.student.create({
                            data: {
                                userId: userId,
                                studentCode: rawCode,
                                fullName: rawName,
                                gender: item.gender || 'Nam',
                                phone: item.phone ? String(item.phone) : null,
                                parentPhone: item.parentPhone ? String(item.parentPhone) : null,
                                address: item.address ? String(item.address) : null,
                                dateOfBirth: dateOfBirth,
                                classId: classId
                            }
                        });
                    });
                    addedCount++;
                }
            } catch (itemErr) {
                console.error(`Lỗi xử lý học sinh ${rawCode}:`, itemErr);
                errors.push(`Mã HS ${rawCode}: ${itemErr.message}`);
            }
        }

        res.json({
            success: true,
            message: `Đồng bộ thành công! Thêm mới: ${addedCount}, Cập nhật: ${updatedCount}, Tổng xử lý: ${sheetStudents.length}`,
            added: addedCount,
            updated: updatedCount,
            total: sheetStudents.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Sync from Google Sheet error:', error);
        res.status(500).json({ message: 'Lỗi server khi đồng bộ dữ liệu từ Google Sheets', error: error.message });
    }
};

/**
 * Xuất danh sách học sinh từ Hệ Thống lên Google Sheet (Export)
 */
export const exportToGoogleSheets = async (req, res) => {
    try {
        const webhookUrl = req.body.webhookUrl || process.env.GOOGLE_SHEET_WEBHOOK_URL;

        if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
            return res.status(400).json({ 
                message: 'Vui lòng cung cấp URL Google Apps Script Webhook hợp lệ (bắt đầu bằng https://script.google.com/)' 
            });
        }

        // Lấy toàn bộ danh sách học sinh
        const students = await prisma.student.findMany({
            include: {
                user: { select: { email: true, status: true } },
                class: { select: { className: true, grade: true } }
            },
            orderBy: [
                { class: { className: 'asc' } },
                { studentCode: 'asc' }
            ]
        });

        // Gửi sang Webhook
        let response;
        try {
            response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                redirect: 'follow',
                body: JSON.stringify({
                    action: 'exportStudents',
                    students: students
                })
            });
        } catch (fetchErr) {
            console.error('Fetch error:', fetchErr);
            return res.status(502).json({ 
                message: 'Không thể gửi dữ liệu đến Google Apps Script Webhook. Vui lòng kiểm tra lại URL.',
                error: fetchErr.message 
            });
        }

        const result = await response.json().catch(() => ({ success: response.ok }));

        res.json({
            success: true,
            message: `Đã xuất ${students.length} học sinh lên Google Sheet thành công!`,
            count: students.length,
            googleResponse: result
        });

    } catch (error) {
        console.error('Export to Google Sheet error:', error);
        res.status(500).json({ message: 'Lỗi server khi xuất dữ liệu sang Google Sheets', error: error.message });
    }
};
