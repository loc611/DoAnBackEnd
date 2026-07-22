import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seed = async () => {
  try {
    console.log('Seeding data to Neon PostgreSQL...');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Upsert to ensure we don't duplicate on multiple runs
    const admin = await prisma.user.upsert({
      where: { email: 'admin@school.edu.vn' },
      update: {},
      create: {
        email: 'admin@school.edu.vn',
        password: hashedPassword,
        name: 'Admin Văn Lang',
        role: 'admin',
      },
    });

    console.log('✅ Admin account seeded successfully!');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: admin123`);
    console.log(`Role: ${admin.role}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seed();
