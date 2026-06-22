import express from 'express';
import { MessageController } from '../controllers/message.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { getMessagesSchema } from '../validators/message.validator.js';

const router = express.Router();

router.get('/:chatId', authMiddleware, validate(getMessagesSchema), MessageController.getMessages);

export default router;
