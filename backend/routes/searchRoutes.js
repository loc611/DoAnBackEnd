import express from 'express';
import { searchStudents } from '../controllers/searchController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/search/students (protected route)
router.get('/students', protect, searchStudents);

export default router;
