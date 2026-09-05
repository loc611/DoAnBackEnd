import { PrismaPg } from '@prisma/adapter-pg';
import pkgPrisma from '@prisma/client';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;
const { PrismaClient } = pkgPrisma;

const connectionString = 'postgresql://neondb_owner:npg_IKecRfm4o6gZ@ep-aged-silence-azt04b35-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, password: true, status: true }
  });
  console.log('Found ' + users.length + ' users:');
  for (const u of users) {
    let isMatch = false;
    let expectedPass = u.username === 'admin' ? 'admin123' : (u.username.startsWith('gv') ? 'teacher123' : 'student123');
    try {
      isMatch = await bcrypt.compare(expectedPass, u.password);
    } catch (e) {}
    console.log(`- [${u.username}] email: ${u.email}, role: ${u.role}, status: ${u.status}, matches "${expectedPass}": ${isMatch}`);
  }

  // Force sync admin to admin123
  const adminPassHash = await bcrypt.hash('admin123', 10);
  const adminUser = users.find(u => u.username === 'admin');
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: adminPassHash, role: 'admin', status: 'active' }
    });
    console.log('✅ Admin password forcefully set to "admin123" and status "active"');
  } else {
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@school.edu.vn',
        password: adminPassHash,
        role: 'admin',
        status: 'active'
      }
    });
    console.log('✅ Admin created from scratch!');
  }
}

main().catch(err => {
  console.error('Error during test:', err);
}).finally(() => {
  pool.end();
});
