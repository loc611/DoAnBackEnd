import prisma from '../prismaClient.js';

/**
 * Tự động gán các đợt thu học phí hiện hành cho học sinh khi vừa xếp vào lớp hoặc chuyển lớp
 * @param {string} studentId - ID của học sinh
 * @param {string} classId - ID của lớp học
 * @param {object} [client] - Prisma client hoặc transaction client
 */
export const autoAssignFeeProfilesForStudent = async (studentId, classId, client = prisma) => {
    if (!studentId || !classId) return;

    try {
        // Lấy thông tin lớp
        const classInfo = await client.class.findUnique({
            where: { id: classId }
        });
        if (!classInfo) return;

        const { grade, academicYear } = classInfo;

        // Tìm tất cả các FeeProfile áp dụng cho lớp hoặc khối này trong năm học của lớp
        const feeProfiles = await client.feeProfile.findMany({
            where: {
                academicYear,
                OR: [
                    { targetClassIds: { has: classId } },
                    { targetGrades: { has: grade } }
                ]
            }
        });

        if (feeProfiles.length === 0) return;

        // Lấy các hóa đơn đã có của học sinh này
        const existingBills = await client.feeBill.findMany({
            where: {
                studentId,
                feeProfileId: { in: feeProfiles.map(fp => fp.id) }
            },
            select: { feeProfileId: true }
        });

        const existingFeeProfileIds = new Set(existingBills.map(b => b.feeProfileId));
        const profilesToAssign = feeProfiles.filter(fp => !existingFeeProfileIds.has(fp.id));

        if (profilesToAssign.length === 0) return;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const billsToInsert = profilesToAssign.map(fp => ({
            studentId,
            feeProfileId: fp.id,
            status: 'unpaid',
            dueDate
        }));

        await client.feeBill.createMany({
            data: billsToInsert,
            skipDuplicates: true
        });
    } catch (err) {
        console.error('Error in autoAssignFeeProfilesForStudent:', err);
    }
};
