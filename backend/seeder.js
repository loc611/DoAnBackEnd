import { initDefaultUsers } from './utils/initDefaultUsers.js';
import prisma from './prismaClient.js';

const run = async () => {
    console.log('🌱 Running seeder...');
    await initDefaultUsers();
    console.log('🎉 Seeder completed.');
    await prisma.$disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
});
