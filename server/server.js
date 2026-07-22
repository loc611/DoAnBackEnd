import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running with Prisma & PostgreSQL Neon' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await prisma.$connect();
        console.log('Connected to PostgreSQL (Neon) via Prisma');
    } catch (error) {
        console.error('Error connecting to database:', error);
    }
});
