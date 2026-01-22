import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Village } from "../models/village.model.js";

const createVillage = asyncHandler(async (req, res) => {
  const { name, state, country, pincode } = req.body;

  if ([name, state, country, pincode].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedVillage = await Village.findOne({ name });

  if (existedVillage) {
    throw new ApiError(409, "Village with this name already exists");
  }

  const village = await Village.create({
    name,
    state,
    country,
    pincode,
  });

  if (!village) {
    throw new ApiError(500, "Something went wrong while registering the village");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, village, "Village created successfully"));
});

const getAllVillages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build search query
  const searchQuery = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { state: { $regex: search, $options: "i" } },
          { country: { $regex: search, $options: "i" } },
          { pincode: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  // Get total count for pagination
  const total = await Village.countDocuments(searchQuery);

  // Get villages with pagination
  const villages = await Village.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalPages = Math.ceil(total / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        villages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      "Villages fetched successfully"
    )
  );
});

const updateVillage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, state, country, pincode } = req.body;

  if (!id) {
    throw new ApiError(400, "Village ID is required");
  }

  // Check if village exists
  const existingVillage = await Village.findById(id);
  if (!existingVillage) {
    throw new ApiError(404, "Village not found");
  }

  // Check for duplicate name (excluding current village)
  const duplicateVillage = await Village.findOne({
    _id: { $ne: id },
    name,
  });

  if (duplicateVillage) {
    throw new ApiError(409, "Village with this name already exists");
  }

  const village = await Village.findByIdAndUpdate(
    id,
    {
      $set: {
        name,
        state,
        country,
        pincode,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, village, "Village updated successfully"));
});

const deleteVillage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Village ID is required");
  }

  const village = await Village.findByIdAndDelete(id);

  if (!village) {
    throw new ApiError(404, "Village not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Village deleted successfully"));
});

export { createVillage, getAllVillages, updateVillage, deleteVillage };
