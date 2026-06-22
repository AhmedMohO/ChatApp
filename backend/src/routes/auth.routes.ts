import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.get('/users', authMiddleware, AuthController.users);

export default router;
