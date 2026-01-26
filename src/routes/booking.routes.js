import { Router } from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableHalls,
  getCalendarData,
  getPublicCalendarData,
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route - no auth required (for villagers to check availability)
router.route("/public/calendar").get(getPublicCalendarData);

// All routes below require authentication
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
