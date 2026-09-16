import express from 'express';
import { login, getMe, refreshTokenHandler, logout, changePassword } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logout);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

export default router;
