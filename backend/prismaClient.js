import { PrismaPg } from '@prisma/adapter-pg';
import pkgPrisma from '@prisma/client';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;
const { PrismaClient } = pkgPrisma;

let prisma;
try {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} catch (e) {
  prisma = new PrismaClient();
}

export default prisma;