import express from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createChatSchema,
  updateGroupSchema,
  addMemberSchema,
  removeMemberSchema,
  transferOwnerSchema
} from '../validators/chat.validator.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', ChatController.getChats);
router.post('/', validate(createChatSchema), ChatController.createChat);
router.put('/:chatId', validate(updateGroupSchema), ChatController.updateGroupInfo);
router.post('/:chatId/members', validate(addMemberSchema), ChatController.addMember);
router.delete('/:chatId/members/:memberId', validate(removeMemberSchema), ChatController.removeMember);
router.put('/:chatId/transfer-owner', validate(transferOwnerSchema), ChatController.transferOwnership);

export default router;
