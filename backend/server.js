import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import gradeRoutes from './routes/gradeRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running with PostgreSQL (Prisma)' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Lỗi hệ thống nội bộ' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

// Keep process alive just in case
setInterval(() => {}, 1000 * 60 * 60);
