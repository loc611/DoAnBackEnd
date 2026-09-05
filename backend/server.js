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
import feeProfileRoutes from './routes/feeProfileRoutes.js';
import tuitionRoutes from './routes/tuitionRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import examRoutes from './routes/examRoutes.js';
import systemSettingRoutes from './routes/systemSettingRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDefaultUsers } from './utils/initDefaultUsers.js';
import { seedRbacScopeData } from './utils/seedRbacScope.js';

dotenv.config();

const app = express();

// Security Middleware with cross-origin resource sharing friendly policy
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

// CORS Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Cho phép request không có origin (như mobile app, postman, curl) hoặc nằm trong danh sách được phép
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Dev mode fallback
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fee-profiles', feeProfileRoutes);
app.use('/api/tuition', tuitionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/settings', systemSettingRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running with PostgreSQL (Prisma) and RBAC+Scope Engine' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Lỗi hệ thống nội bộ' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await initDefaultUsers();
        await seedRbacScopeData();
    } catch (e) {
        console.error('Initial seeding notice:', e.message);
    }
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

// Keep process alive just in case
setInterval(() => {}, 1000 * 60 * 60);

