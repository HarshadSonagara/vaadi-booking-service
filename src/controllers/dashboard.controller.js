import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Booking } from "../models/booking.model.js";
import { Hall } from "../models/hall.model.js";
import { Village } from "../models/village.model.js";
import { isSuperAdmin } from "../middlewares/role.middleware.js";

/**
 * Get hall availability status
 * Super Admin: can filter by village
 * Admin: automatically uses their village
 */
const getHallAvailability = asyncHandler(async (req, res) => {
  const { villageId, startDate, endDate } = req.query;

  let selectedVillageName = null;

  // Determine village filter
  if (villageId) {
    if (!villageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid village ID");
    }
    const village = await Village.findById(villageId);
    if (!village) {
      throw new ApiError(404, "Village not found");
    }
    selectedVillageName = village.name;
  } else if (!isSuperAdmin(req.user)) {
    selectedVillageName = req.user.villageName;
  }

  // Build hall query
  const hallQuery = {
    status: "Active",
  };

  if (selectedVillageName) {
    hallQuery.villageName = selectedVillageName;
  }

  // Get all active halls
  const halls = await Hall.find(hallQuery)
    .select("_id name villageName status")
    .sort({ name: 1 });

  // Determine date range for availability check
  let checkStartDate = new Date();
  let checkEndDate = new Date();
  
  if (startDate && endDate) {
    checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    checkEndDate = new Date(endDate);
    checkEndDate.setHours(23, 59, 59, 999);
  } else {
    // Default to current date if no range provided
    checkStartDate.setHours(0, 0, 0, 0);
    checkEndDate.setHours(23, 59, 59, 999);
  }

  // Get all active bookings for these halls that overlap with the date range
  const hallIds = halls.map((h) => h._id);
  const activeBookings = await Booking.find({
    hallId: { $in: hallIds },
    isCancelled: { $ne: true },
    $or: [
      { fromDate: { $gte: checkStartDate, $lte: checkEndDate } },
      { toDate: { $gte: checkStartDate, $lte: checkEndDate } },
      { fromDate: { $lte: checkStartDate }, toDate: { $gte: checkEndDate } },
    ],
  })
    .select("hallId fromDate toDate villagerName bookingReason")
    .sort({ fromDate: 1 });

  // Group bookings by hall
  const bookingsByHall = {};
  activeBookings.forEach((booking) => {
    const hallId = booking.hallId.toString();
    if (!bookingsByHall[hallId]) {
      bookingsByHall[hallId] = [];
    }
    bookingsByHall[hallId].push({
      fromDate: booking.fromDate,
      toDate: booking.toDate,
      bookerName: booking.villagerName,
      reason: booking.bookingReason,
    });
  });

  // Calculate availability for each hall based on date range
  const hallAvailability = halls.map((hall) => {
    const hallId = hall._id.toString();
    const bookings = bookingsByHall[hallId] || [];
    
    // Find booking that overlaps with the selected date range
    const activeBooking = bookings.find((booking) => {
      const fromDate = new Date(booking.fromDate);
      const toDate = new Date(booking.toDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      // Check if booking overlaps with the date range
      return fromDate <= checkEndDate && toDate >= checkStartDate;
    });
    
    const isBooked = !!activeBooking;

    return {
      _id: hall._id,
      name: hall.name,
      villageName: hall.villageName,
      status: hall.status,
      isAvailable: !isBooked,
      isCurrentlyBooked: isBooked,
      // Include booking details if booked
      bookingDetails: activeBooking ? {
        bookerName: activeBooking.bookerName,
        reason: activeBooking.reason,
        fromDate: activeBooking.fromDate,
        toDate: activeBooking.toDate,
      } : null,
    };
  });

  // Calculate summary
  const totalHalls = hallAvailability.length;
  const availableHalls = hallAvailability.filter((h) => h.isAvailable).length;
  const bookedHalls = totalHalls - availableHalls;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        summary: {
          totalHalls,
          availableHalls,
          bookedHalls,
        },
        halls: hallAvailability,
      },
      "Hall availability fetched successfully"
    )
  );
});

/**
 * Get earnings/expense overview
 * Supports date range filtering
 * Admin: earnings for their village
 * Super Admin: earnings village-wise with village filter
 */
const getEarningsOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate, villageId } = req.query;

  let selectedVillageName = null;

  // Determine village filter
  if (villageId) {
    if (!villageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid village ID");
    }
    const village = await Village.findById(villageId);
    if (!village) {
      throw new ApiError(404, "Village not found");
    }
    selectedVillageName = village.name;
  } else if (!isSuperAdmin(req.user)) {
    selectedVillageName = req.user.villageName;
  }

  // Build booking query - find bookings that overlap with date range
  const bookingQuery = {
    isCancelled: { $ne: true },
  };

  // Add date range filter - bookings that overlap with the range
  if (startDate || endDate) {
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Bookings that overlap with the date range
      bookingQuery.$or = [
        { fromDate: { $gte: start, $lte: end } },
        { toDate: { $gte: start, $lte: end } },
        { fromDate: { $lte: start }, toDate: { $gte: end } },
      ];
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      bookingQuery.toDate = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      bookingQuery.fromDate = { $lte: end };
    }
  }

  if (selectedVillageName) {
    bookingQuery.villageName = selectedVillageName;
  }

  // Get bookings
  const bookings = await Booking.find(bookingQuery).select(
    "price villageName fromDate toDate"
  );

  // Calculate total earnings
  const totalEarnings = bookings.reduce((sum, booking) => sum + booking.price, 0);

  // Calculate earnings by village (for Super Admin)
  const earningsByVillage = {};
  bookings.forEach((booking) => {
    const village = booking.villageName;
    if (!earningsByVillage[village]) {
      earningsByVillage[village] = 0;
    }
    earningsByVillage[village] += booking.price;
  });

  // Calculate monthly earnings (last 12 months)
  const monthlyEarnings = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthBookings = bookings.filter((booking) => {
      const bookingFrom = new Date(booking.fromDate);
      const bookingTo = new Date(booking.toDate);
      return (
        (bookingFrom >= monthStart && bookingFrom <= monthEnd) ||
        (bookingTo >= monthStart && bookingTo <= monthEnd) ||
        (bookingFrom <= monthStart && bookingTo >= monthEnd)
      );
    });

    const monthEarnings = monthBookings.reduce((sum, booking) => sum + booking.price, 0);
    monthlyEarnings.push({
      month: monthDate.toLocaleString("default", { month: "short", year: "numeric" }),
      earnings: monthEarnings,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalEarnings,
        earningsByVillage: isSuperAdmin(req.user) ? earningsByVillage : null,
        monthlyEarnings,
        totalBookings: bookings.length,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
      "Earnings overview fetched successfully"
    )
  );
});

/**
 * Get analytics data for charts
 * Village-wise earnings and booking counts
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, villageId } = req.query;

  let selectedVillageName = null;

  // Determine village filter
  if (villageId) {
    if (!villageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid village ID");
    }
    const village = await Village.findById(villageId);
    if (!village) {
      throw new ApiError(404, "Village not found");
    }
    selectedVillageName = village.name;
  } else if (!isSuperAdmin(req.user)) {
    selectedVillageName = req.user.villageName;
  }

  // Build booking query - find bookings that overlap with date range
  const bookingQuery = {
    isCancelled: { $ne: true },
  };

  // Add date range filter - bookings that overlap with the range
  if (startDate || endDate) {
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Bookings that overlap with the date range
      bookingQuery.$or = [
        { fromDate: { $gte: start, $lte: end } },
        { toDate: { $gte: start, $lte: end } },
        { fromDate: { $lte: start }, toDate: { $gte: end } },
      ];
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      bookingQuery.toDate = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      bookingQuery.fromDate = { $lte: end };
    }
  }

  if (selectedVillageName) {
    bookingQuery.villageName = selectedVillageName;
  }

  // Get bookings
  const bookings = await Booking.find(bookingQuery).select(
    "price villageName fromDate toDate"
  );

  // Get all villages (for Super Admin) or user's village (for Admin)
  let villages = [];
  if (isSuperAdmin(req.user)) {
    villages = await Village.find({}).select("_id name").sort({ name: 1 });
  } else {
    const userVillage = await Village.findOne({ name: req.user.villageName });
    if (userVillage) {
      villages = [{ _id: userVillage._id, name: userVillage.name }];
    }
  }

  // Calculate village-wise earnings
  const villageEarnings = villages.map((village) => {
    const villageBookings = bookings.filter(
      (booking) => booking.villageName === village.name
    );
    const earnings = villageBookings.reduce((sum, booking) => sum + booking.price, 0);
    return {
      villageId: village._id,
      villageName: village.name,
      earnings,
      bookingCount: villageBookings.length,
    };
  });

  // Calculate village-wise booking counts
  const villageBookingCounts = villages.map((village) => {
    const villageBookings = bookings.filter(
      (booking) => booking.villageName === village.name
    );
    return {
      villageId: village._id,
      villageName: village.name,
      bookingCount: villageBookings.length,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        villageEarnings,
        villageBookingCounts,
      },
      "Analytics data fetched successfully"
    )
  );
});

export { getHallAvailability, getEarningsOverview, getAnalytics };
