import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running with MongoDB' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://quanlyhethonghocsinh:loc12345@cluster0.p1hkyuj.mongodb.net/student_management?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas (Cluster0)');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
    });
