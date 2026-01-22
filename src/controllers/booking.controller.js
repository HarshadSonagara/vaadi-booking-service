import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Booking } from "../models/booking.model.js";
import { Hall } from "../models/hall.model.js";
import { isSuperAdmin } from "../middlewares/role.middleware.js";

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
const checkOverlap = async (hallId, fromDate, toDate, excludeBookingId = null) => {
  const query = {
    hallId,
    isCancelled: { $ne: true },
    $or: [
      // New booking starts during existing booking
      { fromDate: { $lte: new Date(fromDate) }, toDate: { $gte: new Date(fromDate) } },
      // New booking ends during existing booking
      { fromDate: { $lte: new Date(toDate) }, toDate: { $gte: new Date(toDate) } },
      // New booking encompasses existing booking
      { fromDate: { $gte: new Date(fromDate) }, toDate: { $lte: new Date(toDate) } },
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
    throw new ApiError(403, "Access denied - You can only view bookings from your village");
  }

  return res.status(200).json(new ApiResponse(200, booking, "Booking fetched successfully"));
});

/**
 * Create a new booking
 */
const createBooking = asyncHandler(async (req, res) => {
  const {
    villagerName,
    mobileNumber,
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
    const overlapFrom = new Date(overlappingBooking.fromDate).toLocaleDateString();
    const overlapTo = new Date(overlappingBooking.toDate).toLocaleDateString();
    throw new ApiError(
      409,
      `This hall is already booked from ${overlapFrom} to ${overlapTo}. Please select different dates.`
    );
  }

  // Calculate total days
  const totalDays = calculateTotalDays(fromDate, toDate);

  // Create booking
  const booking = await Booking.create({
    villagerName: villagerName.trim(),
    mobileNumber: mobileNumber.trim(),
    hallId,
    hallName: hall.name,
    bookingReason: bookingReason.trim(),
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
    totalDays,
    price: Number(price),
    villageName: req.user.villageName,
    createdBy: req.user._id,
  });

  const createdBooking = await Booking.findById(booking._id).populate("createdBy", "fullName");

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
    throw new ApiError(403, "Access denied - You can only update bookings from your village");
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
      if (!isSuperAdmin(req.user) && hall.villageName !== req.user.villageName) {
        throw new ApiError(403, "You can only book halls from your village");
      }
      updateData.hallId = hallId;
      updateData.hallName = hall.name;
    }

    // Check for overlapping bookings
    const overlappingBooking = await checkOverlap(newHallId, newFromDate, newToDate, id);
    if (overlappingBooking) {
      const overlapFrom = new Date(overlappingBooking.fromDate).toLocaleDateString();
      const overlapTo = new Date(overlappingBooking.toDate).toLocaleDateString();
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

  return res
    .status(200)
    .json(new ApiResponse(200, updatedBooking, "Booking updated successfully"));
});

/**
 * Cancel booking (soft delete)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.isCancelled) {
    throw new ApiError(400, "Booking is already cancelled");
  }

  // Admin can only cancel bookings from their village
  if (!isSuperAdmin(req.user) && booking.villageName !== req.user.villageName) {
    throw new ApiError(403, "Access denied - You can only cancel bookings from your village");
  }

  const cancelledBooking = await Booking.findByIdAndUpdate(
    id,
    { isCancelled: true },
    { new: true }
  ).populate("createdBy", "fullName");

  return res
    .status(200)
    .json(new ApiResponse(200, cancelledBooking, "Booking cancelled successfully"));
});

/**
 * Get available halls for booking (Active halls from user's village)
 */
const getAvailableHalls = asyncHandler(async (req, res) => {
  const query = {
    status: "Active",
    villageName: req.user.villageName,
  };

  const halls = await Hall.find(query).select("_id name").sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, halls, "Available halls fetched successfully"));
});

export {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableHalls,
};
