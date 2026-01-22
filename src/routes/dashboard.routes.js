import { Router } from "express";
import {
  getHallAvailability,
  getEarningsOverview,
  getAnalytics,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Dashboard routes
router.route("/hall-availability").get(getHallAvailability);
router.route("/earnings").get(getEarningsOverview);
router.route("/analytics").get(getAnalytics);

export default router;
