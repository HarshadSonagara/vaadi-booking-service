import { Router } from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableHalls,
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get available halls for booking dropdown
router.route("/available-halls").get(getAvailableHalls);

// CRUD routes
router.route("/").get(getAllBookings).post(createBooking);
router.route("/:id").get(getBookingById).put(updateBooking);
router.route("/:id/cancel").put(cancelBooking);

export default router;
