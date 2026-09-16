import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

async function verify() {
  const usernames = ['admin', 'gv001', 'gv007', 'hs001', 'hs280', 'test_hs_5593a'];
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } }
  });
  console.log('--- KẾT QUẢ KIỂM TRA MẬT KHẨU ---');
  for (const u of users) {
    const is1111 = await bcrypt.compare('1111', u.password);
    const isAdmin123 = await bcrypt.compare('admin123', u.password);
    console.log(`User: ${u.username.padEnd(16)} | Role: ${u.role.padEnd(10)} | Khớp 1111: ${is1111} | Khớp admin123: ${isAdmin123}`);
  }
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
