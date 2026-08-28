import prisma from './prismaClient.js';
async function main() {
    try {
        const profile = await prisma.feeProfile.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (!profile) {
            console.log('No fee profile found');
            return;
        }
        
        const students = await prisma.student.findMany();
        
        const dataToInsert = students.map(s => ({
            feeProfileId: profile.id,
            studentId: s.id,
            status: 'unpaid',
            dueDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
        }));
        
        const res = await prisma.feeBill.createMany({
            data: dataToInsert,
            skipDuplicates: true
        });
        console.log('Created bills:', res.count);
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
