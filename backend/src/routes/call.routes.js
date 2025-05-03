import express from 'express';
import { startCall, updateCallStatus, getCallHistory } from '../controllers/call.controller.js';
import {protectRoute} from "../middleware/auth.protectRoute.js";

const router = express.Router();

router.post('/start', protectRoute, startCall);
router.put('/status', protectRoute, updateCallStatus);
router.get('/history', protectRoute, getCallHistory);

export default router;