import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hall } from "../models/hall.model.js";
import { isSuperAdmin } from "../middlewares/role.middleware.js";

/**
 * Get all halls (with role-based filtering)
 * Admin: Only halls from their village
 * Super Admin: All halls
 */
const getAllHalls = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build query based on role
  let query = {};

  // Admin can only see halls from their village
  if (!isSuperAdmin(req.user)) {
    query.villageName = req.user.villageName;
  }

  // Search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { villageName: { $regex: search, $options: "i" } },
    ];

    // If not Super Admin, maintain village filter with search
    if (!isSuperAdmin(req.user)) {
      query = {
        villageName: req.user.villageName,
        $or: [
          { name: { $regex: search, $options: "i" } },
        ],
      };
    }
  }

  const total = await Hall.countDocuments(query);
  const halls = await Hall.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        halls,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Halls fetched successfully"
    )
  );
});

/**
 * Get hall by ID
 */
const getHallById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hall = await Hall.findById(id);

  if (!hall) {
    throw new ApiError(404, "Hall not found");
  }

  // Admin can only view halls from their village
  if (!isSuperAdmin(req.user) && hall.villageName !== req.user.villageName) {
    throw new ApiError(403, "Access denied - You can only view halls from your village");
  }

  return res.status(200).json(new ApiResponse(200, hall, "Hall fetched successfully"));
});

/**
 * Create a new hall
 * Village is automatically assigned from logged-in user
 */
const createHall = asyncHandler(async (req, res) => {
  const { name, status = "Active" } = req.body;

  // Validation
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Hall name is required");
  }

  // Validate status
  if (!["Active", "Inactive"].includes(status)) {
    throw new ApiError(400, "Status must be 'Active' or 'Inactive'");
  }

  // Check if hall with same name exists in the same village
  const existingHall = await Hall.findOne({
    name: name.trim(),
    villageName: req.user.villageName,
  });

  if (existingHall) {
    throw new ApiError(409, "A hall with this name already exists in your village");
  }

  // Create hall with village from logged-in user
  const hall = await Hall.create({
    name: name.trim(),
    status,
    villageName: req.user.villageName, // Auto-assign from user context
  });

  return res
    .status(201)
    .json(new ApiResponse(201, hall, "Hall created successfully"));
});

/**
 * Update hall
 */
const updateHall = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  const hall = await Hall.findById(id);

  if (!hall) {
    throw new ApiError(404, "Hall not found");
  }

  // Admin can only update halls from their village
  if (!isSuperAdmin(req.user) && hall.villageName !== req.user.villageName) {
    throw new ApiError(403, "Access denied - You can only update halls from your village");
  }

  // Build update object
  const updateData = {};

  if (name !== undefined) {
    if (name.trim() === "") {
      throw new ApiError(400, "Hall name cannot be empty");
    }

    // Check for duplicate name in the same village (excluding current hall)
    const duplicateHall = await Hall.findOne({
      _id: { $ne: id },
      name: name.trim(),
      villageName: hall.villageName,
    });

    if (duplicateHall) {
      throw new ApiError(409, "A hall with this name already exists in this village");
    }

    updateData.name = name.trim();
  }

  if (status !== undefined) {
    if (!["Active", "Inactive"].includes(status)) {
      throw new ApiError(400, "Status must be 'Active' or 'Inactive'");
    }
    updateData.status = status;
  }

  const updatedHall = await Hall.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedHall, "Hall updated successfully"));
});

/**
 * Delete hall
 */
const deleteHall = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hall = await Hall.findById(id);

  if (!hall) {
    throw new ApiError(404, "Hall not found");
  }

  // Admin can only delete halls from their village
  if (!isSuperAdmin(req.user) && hall.villageName !== req.user.villageName) {
    throw new ApiError(403, "Access denied - You can only delete halls from your village");
  }

  await Hall.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Hall deleted successfully"));
});

export { getAllHalls, getHallById, createHall, updateHall, deleteHall };
