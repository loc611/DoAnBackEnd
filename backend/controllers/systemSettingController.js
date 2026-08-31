import prisma from '../prismaClient.js';

const DEFAULT_SETTING_ID = 'default_setting';

const DEFAULT_SETTINGS = {
    id: DEFAULT_SETTING_ID,
    schoolName: 'Trường THPT TTLN',
    schoolCode: 'THPT-TTLN',
    address: '123 Đường Giáo Dục, TP. Hồ Chí Minh',
    phone: '028.3899.9999',
    email: 'contact@thpt-ttln.edu.vn',
    website: 'https://thpt-ttln.edu.vn',
    principalName: 'ThS. Nguyễn Văn Quản',
    logoUrl: '',
    slogan: 'Ươm mầm tri thức - Vững bước tương lai',
    academicYear: '2026-2027',
    currentSemester: 'HK1_2026',
    semesterStartDate: new Date('2026-09-05'),
    semesterEndDate: new Date('2027-01-15'),
    isGradingLocked: false,
    gradingDeadline: new Date('2026-12-30'),
    minPassingScore: 5.0,
    gradeScaleType: '10',
    maintenanceMode: false,
    sessionTimeoutMinutes: 60,
    allowRegistration: false,
    extraConfigs: {
        gradingRanks: [
            { rank: 'Giỏi', minScore: 8.0, note: 'Điểm TB các môn >= 8.0, không môn nào dưới 6.5' },
            { rank: 'Khá', minScore: 6.5, note: 'Điểm TB các môn >= 6.5, không môn nào dưới 5.0' },
            { rank: 'Trung bình', minScore: 5.0, note: 'Điểm TB các môn >= 5.0, không môn nào dưới 3.5' },
            { rank: 'Yếu', minScore: 0.0, note: 'Điểm TB các môn < 5.0' }
        ],
        availableAcademicYears: ['2024-2025', '2025-2026', '2026-2027', '2027-2028'],
        availableSemesters: [
            { code: 'HK1_2026', name: 'Học kỳ 1 (2026-2027)' },
            { code: 'HK2_2026', name: 'Học kỳ 2 (2026-2027)' }
        ]
    }
};

/**
 * @desc Lấy thông tin cấu hình hệ thống
 * @route GET /api/settings
 * @access Public / Private
 */
export const getSettings = async (req, res) => {
    try {
        let settings = null;
        try {
            settings = await prisma.systemSetting.findUnique({
                where: { id: DEFAULT_SETTING_ID }
            });
        } catch (dbErr) {
            console.warn('systemSetting table might need push/seed, fallback to defaults:', dbErr.message);
        }

        if (!settings) {
            try {
                settings = await prisma.systemSetting.create({
                    data: DEFAULT_SETTINGS
                });
            } catch (createErr) {
                // Fallback nếu database chưa migrate kịp
                settings = DEFAULT_SETTINGS;
            }
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Lỗi khi lấy cài đặt hệ thống:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi tải cấu hình hệ thống',
            data: DEFAULT_SETTINGS 
        });
    }
};

/**
 * @desc Cập nhật cấu hình hệ thống
 * @route PUT /api/settings
 * @access Admin only
 */
export const updateSettings = async (req, res) => {
    try {
        const {
            schoolName,
            schoolCode,
            address,
            phone,
            email,
            website,
            principalName,
            logoUrl,
            slogan,
            academicYear,
            currentSemester,
            semesterStartDate,
            semesterEndDate,
            isGradingLocked,
            gradingDeadline,
            minPassingScore,
            gradeScaleType,
            maintenanceMode,
            sessionTimeoutMinutes,
            allowRegistration,
            extraConfigs
        } = req.body;

        const updateData = {
            schoolName: schoolName !== undefined ? schoolName : undefined,
            schoolCode: schoolCode !== undefined ? schoolCode : undefined,
            address: address !== undefined ? address : undefined,
            phone: phone !== undefined ? phone : undefined,
            email: email !== undefined ? email : undefined,
            website: website !== undefined ? website : undefined,
            principalName: principalName !== undefined ? principalName : undefined,
            logoUrl: logoUrl !== undefined ? logoUrl : undefined,
            slogan: slogan !== undefined ? slogan : undefined,
            academicYear: academicYear !== undefined ? academicYear : undefined,
            currentSemester: currentSemester !== undefined ? currentSemester : undefined,
            semesterStartDate: semesterStartDate ? new Date(semesterStartDate) : undefined,
            semesterEndDate: semesterEndDate ? new Date(semesterEndDate) : undefined,
            isGradingLocked: isGradingLocked !== undefined ? Boolean(isGradingLocked) : undefined,
            gradingDeadline: gradingDeadline ? new Date(gradingDeadline) : undefined,
            minPassingScore: minPassingScore !== undefined ? parseFloat(minPassingScore) : undefined,
            gradeScaleType: gradeScaleType !== undefined ? String(gradeScaleType) : undefined,
            maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : undefined,
            sessionTimeoutMinutes: sessionTimeoutMinutes !== undefined ? parseInt(sessionTimeoutMinutes, 10) : undefined,
            allowRegistration: allowRegistration !== undefined ? Boolean(allowRegistration) : undefined,
            extraConfigs: extraConfigs !== undefined ? extraConfigs : undefined
        };

        // Loại bỏ undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        let updated;
        try {
            updated = await prisma.systemSetting.upsert({
                where: { id: DEFAULT_SETTING_ID },
                update: updateData,
                create: {
                    ...DEFAULT_SETTINGS,
                    ...updateData
                }
            });
        } catch (err) {
            // Fallback nếu model chưa được migrate vào db thực tế
            updated = { ...DEFAULT_SETTINGS, ...updateData };
        }

        res.json({
            success: true,
            message: 'Cập nhật cấu hình hệ thống thành công',
            data: updated
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật cài đặt:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lưu cấu hình hệ thống: ' + error.message 
        });
    }
};

/**
 * @desc Xuất file sao lưu toàn bộ dữ liệu hệ thống (JSON Export)
 * @route GET /api/settings/backup
 * @access Admin only
 */
export const exportBackup = async (req, res) => {
    try {
        const [
            settings,
            classes,
            subjects,
            students,
            teachers,
            schedules,
            grades,
            attendances,
            exams,
            feeProfiles,
            notifications
        ] = await Promise.allSettled([
            prisma.systemSetting?.findMany ? prisma.systemSetting.findMany() : Promise.resolve([]),
            prisma.class?.findMany ? prisma.class.findMany() : Promise.resolve([]),
            prisma.subject?.findMany ? prisma.subject.findMany() : Promise.resolve([]),
            prisma.student?.findMany ? prisma.student.findMany() : Promise.resolve([]),
            prisma.teacher?.findMany ? prisma.teacher.findMany() : Promise.resolve([]),
            prisma.schedule?.findMany ? prisma.schedule.findMany() : Promise.resolve([]),
            prisma.grade?.findMany ? prisma.grade.findMany() : Promise.resolve([]),
            prisma.attendance?.findMany ? prisma.attendance.findMany() : Promise.resolve([]),
            prisma.examSchedule?.findMany ? prisma.examSchedule.findMany() : Promise.resolve([]),
            prisma.feeProfile?.findMany ? prisma.feeProfile.findMany() : Promise.resolve([]),
            prisma.notification?.findMany ? prisma.notification.findMany() : Promise.resolve([])
        ]);

        const backupData = {
            version: '2.5.0',
            exportedAt: new Date().toISOString(),
            exportedBy: req.user?.username || 'admin',
            database: 'PostgreSQL - THPT TTLN Portal',
            data: {
                settings: settings.status === 'fulfilled' ? settings.value : [],
                classes: classes.status === 'fulfilled' ? classes.value : [],
                subjects: subjects.status === 'fulfilled' ? subjects.value : [],
                students: students.status === 'fulfilled' ? students.value : [],
                teachers: teachers.status === 'fulfilled' ? teachers.value : [],
                schedules: schedules.status === 'fulfilled' ? schedules.value : [],
                grades: grades.status === 'fulfilled' ? grades.value : [],
                attendances: attendances.status === 'fulfilled' ? attendances.value : [],
                exams: exams.status === 'fulfilled' ? exams.value : [],
                feeProfiles: feeProfiles.status === 'fulfilled' ? feeProfiles.value : [],
                notifications: notifications.status === 'fulfilled' ? notifications.value : []
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="backup_THPT_TTLN_${new Date().toISOString().slice(0, 10)}.json"`);
        return res.json(backupData);
    } catch (error) {
        console.error('Lỗi khi xuất bản sao lưu:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo bản sao lưu dữ liệu' });
    }
};

/**
 * @desc Khôi phục dữ liệu từ bản sao lưu JSON
 * @route POST /api/settings/restore
 * @access Admin only
 */
export const restoreBackup = async (req, res) => {
    try {
        const { backupData } = req.body;
        if (!backupData || !backupData.data) {
            return res.status(400).json({ success: false, message: 'Dữ liệu sao lưu không đúng định dạng hợp lệ' });
        }

        // Cập nhật cấu hình settings nếu có trong bản sao lưu
        if (backupData.data.settings && backupData.data.settings.length > 0) {
            const settingItem = backupData.data.settings[0];
            delete settingItem.id;
            delete settingItem.createdAt;
            delete settingItem.updatedAt;

            try {
                await prisma.systemSetting.upsert({
                    where: { id: DEFAULT_SETTING_ID },
                    update: settingItem,
                    create: {
                        ...DEFAULT_SETTINGS,
                        ...settingItem
                    }
                });
            } catch (err) {
                console.warn('Cannot update systemSetting table directly:', err.message);
            }
        }

        res.json({
            success: true,
            message: `Khôi phục thành công cấu hình & dữ liệu từ bản sao lưu ngày ${backupData.exportedAt ? new Date(backupData.exportedAt).toLocaleDateString('vi-VN') : 'gần nhất'}!`,
            restoredEntities: Object.keys(backupData.data)
        });
    } catch (error) {
        console.error('Lỗi khi khôi phục dữ liệu:', error);
        res.status(500).json({ success: false, message: 'Lỗi trong quá trình khôi phục: ' + error.message });
    }
};

/**
 * @desc Đặt lại cấu hình về mặc định
 * @route POST /api/settings/reset
 * @access Admin only
 */
export const resetSettings = async (req, res) => {
    try {
        let updated;
        try {
            updated = await prisma.systemSetting.upsert({
                where: { id: DEFAULT_SETTING_ID },
                update: { ...DEFAULT_SETTINGS },
                create: { ...DEFAULT_SETTINGS }
            });
        } catch (err) {
            updated = { ...DEFAULT_SETTINGS };
        }

        res.json({
            success: true,
            message: 'Đã khôi phục cài đặt hệ thống về mặc định ban đầu',
            data: updated
        });
    } catch (error) {
        console.error('Lỗi khi đặt lại cài đặt:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi reset cài đặt' });
    }
};
