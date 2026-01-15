import express from "express"
import { registerUser, loginUser,verifyEmail,forgotPassword, resetPassword, getUserProfile, getMe  } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Auth Routes
router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/verify/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/profile", auth, getUserProfile);

router.get("/me", auth, getMe);

export default router