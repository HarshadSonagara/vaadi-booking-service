import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Booking } from "../models/booking.model.js";
import { Hall } from "../models/hall.model.js";
import { Village } from "../models/village.model.js";
import { isSuperAdmin } from "../middlewares/role.middleware.js";
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendRefundNotificationEmail,
} from "../utils/nodemailer.js";

/**
 * Calculate total days between two dates (inclusive)
 */
const calculateTotalDays = (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
  return diffDays;
};

/**
 * Check if booking dates overlap with existing bookings
 */
const checkOverlap = async (
  hallId,
  fromDate,
  toDate,
  excludeBookingId = null
) => {
  const query = {
    hallId,
    isCancelled: { $ne: true },
    $or: [
      // New booking starts during existing booking
      {
        fromDate: { $lte: new Date(fromDate) },
        toDate: { $gte: new Date(fromDate) },
      },
      // New booking ends during existing booking
      {
        fromDate: { $lte: new Date(toDate) },
        toDate: { $gte: new Date(toDate) },
      },
      // New booking encompasses existing booking
      {
        fromDate: { $gte: new Date(fromDate) },
        toDate: { $lte: new Date(toDate) },
      },
    ],
  };

  // Exclude current booking when updating
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBooking = await Booking.findOne(query);
  return overlappingBooking;
};

/**
 * Get all bookings (with role-based filtering)
 */
const getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build query based on role
  let query = { isCancelled: { $ne: true } };

  // Admin can only see bookings from their village
  if (!isSuperAdmin(req.user)) {
    query.villageName = req.user.villageName;
  }

  // Search filter
  if (search) {
    const searchQuery = {
      $or: [
        { villagerName: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { hallName: { $regex: search, $options: "i" } },
        { bookingReason: { $regex: search, $options: "i" } },
      ],
    };

    query = { ...query, ...searchQuery };
  }

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate("createdBy", "fullName");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Bookings fetched successfully"
    )
  );
});

/**
 * Get booking by ID
 */
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id).populate("createdBy", "fullName");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Admin can only view bookings from their village
  if (!isSuperAdmin(req.user) && booking.villageName !== req.user.villageName) {
    throw new ApiError(
      403,
      "Access denied - You can only view bookings from your village"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking fetched successfully"));
});

/**
 * Create a new booking
 */
const createBooking = asyncHandler(async (req, res) => {
  const {
    villagerName,
    mobileNumber,
    email,
    hallId,
    bookingReason,
    fromDate,
    toDate,
    price,
  } = req.body;

  // Validation
  if (!villagerName || villagerName.trim() === "") {
    throw new ApiError(400, "Villager name is required");
  }

  if (!mobileNumber || mobileNumber.trim() === "") {
    throw new ApiError(400, "Mobile number is required");
  }

  if (!hallId) {
    throw new ApiError(400, "Hall is required");
  }

  if (!bookingReason || bookingReason.trim() === "") {
    throw new ApiError(400, "Booking reason is required");
  }

  if (!fromDate || !toDate) {
    throw new ApiError(400, "From date and To date are required");
  }

  if (new Date(fromDate) > new Date(toDate)) {
    throw new ApiError(400, "From date cannot be after To date");
  }

  if (price === undefined || price === null || isNaN(price) || price < 0) {
    throw new ApiError(400, "Valid booking price is required");
  }

  // Get hall and validate
  const hall = await Hall.findById(hallId);
  if (!hall) {
    throw new ApiError(404, "Hall not found");
  }

  if (hall.status !== "Active") {
    throw new ApiError(400, "Cannot book an inactive hall");
  }

  // Admin can only book halls from their village
  if (!isSuperAdmin(req.user) && hall.villageName !== req.user.villageName) {
    throw new ApiError(403, "You can only book halls from your village");
  }

  // Check for overlapping bookings
  const overlappingBooking = await checkOverlap(hallId, fromDate, toDate);
  if (overlappingBooking) {
    const overlapFrom = new Date(
      overlappingBooking.fromDate
    ).toLocaleDateString();
    const overlapTo = new Date(overlappingBooking.toDate).toLocaleDateString();
    throw new ApiError(
      409,
      `This hall is already booked from ${overlapFrom} to ${overlapTo}. Please select different dates.`
    );
  }

  // Calculate total days
  const totalDays = calculateTotalDays(fromDate, toDate);

  // Create booking
  const bookingData = {
    villagerName: villagerName.trim(),
    mobileNumber: mobileNumber.trim(),
    hallId,
    hallName: hall.name,
    bookingReason: bookingReason.trim(),
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
    totalDays,
    price: Number(price),
    villageName: hall.villageName, // Use hall's village for correct association
    createdBy: req.user._id,
  };

  // Add email if provided
  if (email && email.trim()) {
    bookingData.email = email.trim().toLowerCase();
  }

  const booking = await Booking.create(bookingData);

  const createdBooking = await Booking.findById(booking._id).populate(
    "createdBy",
    "fullName"
  );

  // Send confirmation email if email is provided
  if (createdBooking.email) {
    sendBookingConfirmationEmail(
      createdBooking.email,
      {
        villagerName: createdBooking.villagerName,
        hallName: createdBooking.hallName,
        bookingReason: createdBooking.bookingReason,
        fromDate: createdBooking.fromDate,
        toDate: createdBooking.toDate,
        totalDays: createdBooking.totalDays,
        price: createdBooking.price,
        villageName: createdBooking.villageName,
      },
      false
    )
      .then((result) => console.log("Email send result:", result))
      .catch((err) => console.error("Failed to send booking email:", err));
  } else {
    console.log("No email provided for booking, skipping email notification");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdBooking, "Booking created successfully"));
});

/**
 * Update booking
 */
const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    villagerName,
    mobileNumber,
    email,
    hallId,
    bookingReason,
    fromDate,
    toDate,
    price,
  } = req.body;

  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.isCancelled) {
    throw new ApiError(400, "Cannot update a cancelled booking");
  }

  // Admin can only update bookings from their village
  if (!isSuperAdmin(req.user) && booking.villageName !== req.user.villageName) {
    throw new ApiError(
      403,
      "Access denied - You can only update bookings from your village"
    );
  }

  // Build update object
  const updateData = {};

  if (villagerName !== undefined) {
    if (villagerName.trim() === "") {
      throw new ApiError(400, "Villager name cannot be empty");
    }
    updateData.villagerName = villagerName.trim();
  }

  if (mobileNumber !== undefined) {
    if (mobileNumber.trim() === "") {
      throw new ApiError(400, "Mobile number cannot be empty");
    }
    updateData.mobileNumber = mobileNumber.trim();
  }

  if (email !== undefined) {
    updateData.email = email ? email.trim().toLowerCase() : "";
  }

  if (bookingReason !== undefined) {
    if (bookingReason.trim() === "") {
      throw new ApiError(400, "Booking reason cannot be empty");
    }
    updateData.bookingReason = bookingReason.trim();
  }

  if (price !== undefined) {
    if (isNaN(price) || price < 0) {
      throw new ApiError(400, "Price must be a valid non-negative number");
    }
    updateData.price = Number(price);
  }

  // Handle hall change or date change
  const newHallId = hallId || booking.hallId;
  const newFromDate = fromDate || booking.fromDate;
  const newToDate = toDate || booking.toDate;

  // Validate dates
  if (new Date(newFromDate) > new Date(newToDate)) {
    throw new ApiError(400, "From date cannot be after To date");
  }

  // If hall or dates changed, check for overlaps
  if (hallId || fromDate || toDate) {
    // If changing hall, validate the new hall
    if (hallId && hallId !== booking.hallId.toString()) {
      const hall = await Hall.findById(hallId);
      if (!hall) {
        throw new ApiError(404, "Hall not found");
      }
      if (hall.status !== "Active") {
        throw new ApiError(400, "Cannot book an inactive hall");
      }
      if (
        !isSuperAdmin(req.user) &&
        hall.villageName !== req.user.villageName
      ) {
        throw new ApiError(403, "You can only book halls from your village");
      }
      updateData.hallId = hallId;
      updateData.hallName = hall.name;
    }

    // Check for overlapping bookings
    const overlappingBooking = await checkOverlap(
      newHallId,
      newFromDate,
      newToDate,
      id
    );
    if (overlappingBooking) {
      const overlapFrom = new Date(
        overlappingBooking.fromDate
      ).toLocaleDateString();
      const overlapTo = new Date(
        overlappingBooking.toDate
      ).toLocaleDateString();
      throw new ApiError(
        409,
        `This hall is already booked from ${overlapFrom} to ${overlapTo}. Please select different dates.`
      );
    }

    if (fromDate) updateData.fromDate = new Date(fromDate);
    if (toDate) updateData.toDate = new Date(toDate);

    // Recalculate total days if dates changed
    if (fromDate || toDate) {
      updateData.totalDays = calculateTotalDays(newFromDate, newToDate);
    }
  }

  const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "fullName");

  // Send update confirmation email if email is provided
  if (updatedBooking.email) {
    sendBookingConfirmationEmail(
      updatedBooking.email,
      {
        villagerName: updatedBooking.villagerName,
        hallName: updatedBooking.hallName,
        bookingReason: updatedBooking.bookingReason,
        fromDate: updatedBooking.fromDate,
        toDate: updatedBooking.toDate,
        totalDays: updatedBooking.totalDays,
        price: updatedBooking.price,
        villageName: updatedBooking.villageName,
      },
      true
    )
      .then((result) => console.log("Email update result:", result))
      .catch((err) =>
        console.error("Failed to send booking update email:", err)
      );
  } else {
    console.log(
      "No email provided for booking update, skipping email notification"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedBooking, "Booking updated successfully"));
});

/**
 * Cancel booking (hard delete from database)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id).populate("createdBy", "fullName");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.isCancelled) {
    throw new ApiError(400, "Booking is already cancelled");
  }

  // Admin can only cancel bookings from their village
  if (!isSuperAdmin(req.user) && booking.villageName !== req.user.villageName) {
    throw new ApiError(
      403,
      "Access denied - You can only cancel bookings from your village"
    );
  }

  // Prepare booking details for emails
  const bookingDetails = {
    villagerName: booking.villagerName,
    email: booking.email,
    mobileNumber: booking.mobileNumber,
    hallName: booking.hallName,
    bookingReason: booking.bookingReason,
    fromDate: booking.fromDate,
    toDate: booking.toDate,
    totalDays: booking.totalDays,
    price: booking.price,
    villageName: booking.villageName,
  };

  // Delete booking from database (hard delete)
  const deletedBooking = await Booking.findByIdAndDelete(id);

  if (!deletedBooking) {
    throw new ApiError(404, "Booking not found");
  }

  // Send cancellation email to user if email is provided
  if (booking.email) {
    sendBookingCancellationEmail(booking.email, bookingDetails)
      .then((result) => console.log("Cancellation email send result:", result))
      .catch((err) =>
        console.error("Failed to send cancellation email:", err)
      );
  } else {
    console.log(
      "No email provided for booking cancellation, skipping email notification"
    );
  }

  const teamEmail = process.env.TEAM_EMAIL || process.env.EMAIL_USER;
  if (teamEmail) {
    sendRefundNotificationEmail(teamEmail, bookingDetails)
      .then((result) =>
        console.log("Refund notification email send result:", result)
      )
      .catch((err) =>
        console.error("Failed to send refund notification email:", err)
      );
  } else {
    console.log("No team email configured, skipping refund notification email");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedBooking, "Booking cancelled and deleted successfully")
    );
});

const getAvailableHalls = asyncHandler(async (req, res) => {
  const { villageId } = req.query;

  let villageName = req.user.villageName;

  // For super admin, allow fetching halls by villageId
  if (isSuperAdmin(req.user) && villageId) {
    const village = await Village.findById(villageId);
    if (!village) {
      throw new ApiError(404, "Village not found");
    }
    villageName = village.name;
  }

  const query = {
    status: "Active",
    villageName: villageName,
  };

  const halls = await Hall.find(query).select("_id name").sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, halls, "Available halls fetched successfully"));
});

// Color palette for calendar
const CALENDAR_HALL_COLORS = [
  "#9747ff", // Purple (primary)
  "#27ae60", // Green
  "#3498db", // Blue
  "#e74c3c", // Red
  "#f39c12", // Orange
  "#1abc9c", // Teal
  "#9b59b6", // Violet
  "#34495e", // Dark gray-blue
  "#e91e63", // Pink
  "#00bcd4", // Cyan
];

const getCalendarData = asyncHandler(async (req, res) => {
  const { year, month, villageId } = req.query;

  if (!year || !month) {
    throw new ApiError(400, "Year and month are required");
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new ApiError(400, "Invalid year or month");
  }

  // Get start and end of the month in UTC to match MongoDB date storage
  const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

  // Get halls first and assign colors to those without
  const hallQuery = {
    status: "Active",
  };

  let selectedVillageName = null;

  if (villageId) {
    if (!villageId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid village ID");
    }
    const village = await Village.findById(villageId);
    if (!village) {
      throw new ApiError(404, "Village not found");
    }
    selectedVillageName = village.name;
    hallQuery.villageName = selectedVillageName;
  } else if (!isSuperAdmin(req.user)) {
    hallQuery.villageName = req.user.villageName;
    selectedVillageName = req.user.villageName;
  }

  const halls = await Hall.find(hallQuery)
    .select("_id name color villageName")
    .sort({ name: 1 });

  const hallsByVillage = {};
  for (const hall of halls) {
    if (!hallsByVillage[hall.villageName]) {
      hallsByVillage[hall.villageName] = [];
    }
    hallsByVillage[hall.villageName].push(hall);
  }

  const hallsToUpdate = [];
  const hallColorMap = {}; // Map of hallId to color

  for (const villageName in hallsByVillage) {
    const villageHalls = hallsByVillage[villageName];
    const usedColors = villageHalls.map((h) => h.color).filter(Boolean);

    for (const hall of villageHalls) {
      if (!hall.color) {
        // Find first unused color
        let assignedColor = null;
        for (const color of CALENDAR_HALL_COLORS) {
          if (!usedColors.includes(color)) {
            assignedColor = color;
            usedColors.push(color);
            break;
          }
        }
        // If all colors used, generate random
        if (!assignedColor) {
          assignedColor =
            "#" +
            Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, "0");
        }
        hall.color = assignedColor;
        hallsToUpdate.push({ id: hall._id, color: assignedColor });
      }
      hallColorMap[hall._id.toString()] = hall.color;
    }
  }

  // Save updated colors to database
  if (hallsToUpdate.length > 0) {
    await Promise.all(
      hallsToUpdate.map((h) => Hall.findByIdAndUpdate(h.id, { color: h.color }))
    );
  }

  let bookingQuery = {
    isCancelled: { $ne: true },
    fromDate: { $lte: endDate },
    toDate: { $gte: startDate },
  };

  if (selectedVillageName) {
    bookingQuery.villageName = selectedVillageName;
  } else if (!isSuperAdmin(req.user)) {
    bookingQuery.villageName = req.user.villageName;
  }

  const bookings = await Booking.find(bookingQuery)
    .populate("hallId", "name color")
    .sort({ fromDate: 1 });

  const calendarBookings = bookings.map((booking) => {
    const hallId =
      booking.hallId?._id?.toString() || booking.hallId?.toString();
    return {
      _id: booking._id,
      hallId: booking.hallId?._id || booking.hallId,
      hallName: booking.hallId?.name || booking.hallName,
      hallColor: hallColorMap[hallId] || booking.hallId?.color || "#9747ff",
      villagerName: booking.villagerName,
      bookingReason: booking.bookingReason,
      fromDate: booking.fromDate,
      toDate: booking.toDate,
      totalDays: booking.totalDays,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings: calendarBookings,
        halls: halls.map((h) => ({
          _id: h._id,
          name: h.name,
          color: h.color,
        })),
      },
      "Calendar data fetched successfully"
    )
  );
});

export {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableHalls,
  getCalendarData,
};
