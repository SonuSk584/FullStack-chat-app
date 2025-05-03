import express from 'express';
import { update_profile } from '../controllers/auth.controller.js';
import { protectRoute } from "../middleware/auth.protectRoute.js";
import { login, logout, signup } from '../controllers/auth.controller.js';
import { checkAuth } from '../controllers/auth.controller.js';
const router= express.Router()
router.post("/signup",signup);
router.post("/login",login);
router.post("/logout",logout);
router.put("/update-profile",protectRoute,update_profile);
router.get("/check",protectRoute,checkAuth);
export default router