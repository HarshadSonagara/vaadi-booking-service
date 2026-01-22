import { Router } from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableHalls,
  getCalendarData,
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get available halls for booking dropdown
router.route("/available-halls").get(getAvailableHalls);

// Get calendar data for a specific month
router.route("/calendar").get(getCalendarData);

// CRUD routes
router.route("/").get(getAllBookings).post(createBooking);
router.route("/:id").get(getBookingById).put(updateBooking);
router.route("/:id/cancel").put(cancelBooking);

export default router;
