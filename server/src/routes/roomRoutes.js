import { Router } from 'express';
import {
  getHealth,
  getRoomMessages,
  checkRoomStatus,
} from '../controllers/roomController.js';

const router = Router();

// ── Health Check ────────────
router.get('/health', getHealth);

// ── Room API ────────────────
router.get('/:roomId/status', checkRoomStatus);
router.get('/:roomId/messages', getRoomMessages);

export default router;
