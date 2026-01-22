import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  // User management
  getAllUsers,
  getUserById,
  createUserAdmin,
  updateUser,
  deleteUser,
  resetUserPasswordAdmin,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireSuperAdmin } from "../middlewares/role.middleware.js";

const router = Router();

router.route("/register").post(registerUser);

router.route("/verify-email").get(verifyEmail);
router.route("/resend-verification").post(resendVerificationEmail);

router.route("/login").post(loginUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/forgot-password").post(forgotPassword);

router.route("/reset-password").post(resetPassword);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/current-user").get(verifyJWT, getCurrentUser);

// ==================== USER MANAGEMENT ROUTES (Super Admin Only) ====================

router.route("/manage").get(verifyJWT, requireSuperAdmin, getAllUsers);
router.route("/manage").post(verifyJWT, requireSuperAdmin, createUserAdmin);
router.route("/manage/:id").get(verifyJWT, requireSuperAdmin, getUserById);
router.route("/manage/:id").put(verifyJWT, requireSuperAdmin, updateUser);
router.route("/manage/:id").delete(verifyJWT, requireSuperAdmin, deleteUser);
router
  .route("/manage/:id/reset-password")
  .post(verifyJWT, requireSuperAdmin, resetUserPasswordAdmin);

export default router;
