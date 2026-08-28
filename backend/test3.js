import prisma from './prismaClient.js';
async function main() {
    try {
        let whereClause = {
            status: 'unpaid',
            student: {
                class: {
                    className: '10a1'
                }
            }
        };
        whereClause.feeProfile = { academicYear: '2026-2027', semester: 'HK1' };
        
        const debtors = await prisma.feeBill.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        studentCode: true,
                        fullName: true,
                        phone: true
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
        console.log('OK', debtors.length);
    } catch (e) {
        console.error('ERR', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
